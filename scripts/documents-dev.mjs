#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  API_GATEWAY_REPO,
  DEFAULT_DEV_PROFILE_ID,
  listHealthSurfaces,
  listOrchestrationProcesses,
  loadProfile,
  mergeRuntimeEnv,
  REPO_ROOT,
  resolveCloudGatewayConfigPath,
  resolveDevProfileId,
  resolveGatewayBind,
  resolveSurfaceBind,
  resolveSurfaceHttpUrl,
  shouldAutostartGateway,
  waitForHttpHealthy,
} from './lib/documents-topology.mjs';

const HEALTH_PATH = '/healthz';
const HEALTH_TIMEOUT_MS = 2000;
const STARTUP_WAIT_MS = 500;
const MAX_STARTUP_ATTEMPTS = 60;
const DEFAULT_API_SERVER_CRATE = 'sdkwork-documents-api-server';

function cargoCommand() {
  return process.platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function sanitizeSpawnEnv(env) {
  const sanitized = { ...process.env };
  for (const [key, value] of Object.entries(env ?? {})) {
    if (value === undefined) {
      continue;
    }
    sanitized[key] = String(value);
  }
  return sanitized;
}

function parseArgs(argv) {
  const settings = {
    database: 'postgres',
    deploymentProfile: 'standalone',
    devEnvFile: undefined,
    dryRun: false,
    help: false,
    serviceLayout: 'unified-process',
    target: 'server',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      settings.help = true;
      continue;
    }
    if (arg === '--deployment-profile') {
      settings.deploymentProfile = argv[index + 1] ?? settings.deploymentProfile;
      index += 1;
      continue;
    }
    if (arg === '--service-layout') {
      settings.serviceLayout = argv[index + 1] ?? settings.serviceLayout;
      index += 1;
      continue;
    }
    if (arg === '--database') {
      settings.database = argv[index + 1] ?? settings.database;
      index += 1;
      continue;
    }
    if (arg === '--target') {
      settings.target = argv[index + 1] ?? settings.target;
      index += 1;
      continue;
    }
    if (arg === '--dev-env-file') {
      settings.devEnvFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      settings.dryRun = true;
      continue;
    }
    throw new Error(`Unsupported option: ${arg}`);
  }

  if (settings.target !== 'server') {
    throw new Error('target must be server');
  }
  if (!['postgres', 'sqlite'].includes(settings.database)) {
    throw new Error('database must be one of: postgres, sqlite');
  }

  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/documents-dev.mjs [options]

Topology-aware Documents dev entry. Loads configs/topology profile env via @sdkwork/app-topology.

Options:
  --deployment-profile <standalone|cloud>           Default: standalone
  --service-layout <unified-process|split-services> Default: unified-process
  --database <postgres|sqlite>                      Default: postgres
  --target <server>                                 Default: server
  --dev-env-file <path>                             Optional profile env override
  --dry-run                                         Print plan without executing
  --help, -h
`);
}

function ensureDocumentsDataDir() {
  const dataDir = path.join(REPO_ROOT, '.sdkwork', 'runtime', 'documents');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function resolveDefaultSqliteDatabaseUrl() {
  ensureDocumentsDataDir();
  const sqliteFile = path.join(REPO_ROOT, '.sdkwork', 'runtime', 'documents', 'documents.sqlite');
  return `sqlite:///${sqliteFile.split(path.sep).join('/')}?mode=rwc`;
}

function resolveDocumentsDatabaseEnv(settings) {
  if (settings.database === 'sqlite') {
    return {
      DOCUMENTS_DATABASE_ENGINE: 'sqlite',
      DOCUMENTS_DATABASE_FILE: './.sdkwork/runtime/documents/documents.sqlite',
      DOCUMENTS_DATABASE_URL: resolveDefaultSqliteDatabaseUrl(),
      DOCUMENTS_DATABASE_MAX_CONNECTIONS: '1',
    };
  }
  return {};
}

function createApiServerBinaryProcess(crate, binary, label, env) {
  ensureDocumentsDataDir();
  return {
    label,
    command: cargoCommand(),
    args: ['run', '-p', crate, '--bin', binary],
    cwd: REPO_ROOT,
    env,
  };
}

function createPlatformGatewayProcess(env) {
  const deploymentProfile = env.SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE ?? 'cloud';
  const bind =
    resolveSurfaceBind(env, 'platform.api-gateway') ?? resolveGatewayBind(env, deploymentProfile);
  const gatewayConfig = resolveCloudGatewayConfigPath(
    env,
    env.SDKWORK_DOCUMENTS_ENVIRONMENT ?? 'development',
  );
  return {
    label: 'sdkwork-api-gateway',
    command: cargoCommand(),
    args: [
      'run',
      '-p',
      'sdkwork-api-gateway-api-server',
      '--bin',
      'sdkwork-api-gateway',
      '--',
      '--config',
      gatewayConfig,
    ],
    cwd: API_GATEWAY_REPO,
    env: {
      ...env,
      SDKWORK_API_GATEWAY_BIND: bind,
      SDKWORK_API_GATEWAY_CONFIG: gatewayConfig,
    },
  };
}

function buildProcessesFromOrchestration(profileId, env) {
  const processes = [];
  let gatewayScheduled = false;

  for (const processDef of listOrchestrationProcesses(profileId)) {
    if (processDef.id === 'platform.api-gateway') {
      gatewayScheduled = true;
      if (!shouldAutostartGateway(env)) {
        continue;
      }
      processes.push(createPlatformGatewayProcess(env));
      continue;
    }

    const crate = processDef.crate ?? DEFAULT_API_SERVER_CRATE;
    const binary = processDef.binary ?? processDef.id;
    processes.push(createApiServerBinaryProcess(crate, binary, binary, env));
  }

  if (!gatewayScheduled && shouldAutostartGateway(env)) {
    processes.unshift(createPlatformGatewayProcess(env));
  }

  return processes;
}

function spawnProcessEntry(entry) {
  return spawn(entry.command, entry.args, {
    cwd: entry.cwd ?? REPO_ROOT,
    env: sanitizeSpawnEnv(entry.env),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });
}

function terminateProcessTree(child) {
  if (!child?.pid) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  child.kill();
}

async function waitForSurfaceHealth(profileId, env) {
  const surfaces = [...listHealthSurfaces(profileId)];
  if (shouldAutostartGateway(env) && !surfaces.includes('platform.api-gateway')) {
    surfaces.unshift('platform.api-gateway');
  }
  for (const surfaceId of surfaces) {
    const url = resolveSurfaceHttpUrl(env, surfaceId);
    if (!url) {
      continue;
    }
    const healthUrl = `${url.replace(/\/+$/u, '')}${HEALTH_PATH}`;
    let ready = false;
    for (let attempt = 0; attempt < MAX_STARTUP_ATTEMPTS; attempt += 1) {
      ready = await waitForHttpHealthy(healthUrl, HEALTH_TIMEOUT_MS);
      if (ready) {
        console.log(`[sdkwork-documents] healthy ${surfaceId} (${healthUrl})`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, STARTUP_WAIT_MS));
    }
    if (!ready) {
      throw new Error(`timed out waiting for ${surfaceId} health at ${healthUrl}`);
    }
  }
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    process.exit(0);
  }

  const profileId =
    resolveDevProfileId(settings.deploymentProfile, settings.serviceLayout) ||
    DEFAULT_DEV_PROFILE_ID;
  const profileEnv = loadProfile(profileId);
  const runtimeEnv = mergeRuntimeEnv(
    process.env,
    profileEnv,
    resolveDocumentsDatabaseEnv(settings),
    {
      SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE: settings.deploymentProfile,
      SDKWORK_DOCUMENTS_SERVICE_LAYOUT: settings.serviceLayout,
      SDKWORK_DOCUMENTS_DATABASE_PROFILE: settings.database,
      SDKWORK_DOCUMENTS_PROFILE_ID: profileId,
      SDKWORK_DOCUMENTS_DEV_MODE: '1',
      SDKWORK_DOCUMENTS_RUNTIME_TARGET: settings.target,
      SDKWORK_DOCUMENTS_DEV_AUTH_BYPASS: 'true',
      VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE: settings.deploymentProfile,
      VITE_SDKWORK_DOCUMENTS_RUNTIME_TARGET: settings.target,
    },
  );

  const processes = buildProcessesFromOrchestration(profileId, runtimeEnv);

  if (settings.dryRun) {
    console.log(
      `[sdkwork-documents] profile=${profileId} deploymentProfile=${settings.deploymentProfile} serviceLayout=${settings.serviceLayout} database=${settings.database}`,
    );
    for (const entry of processes) {
      console.log(`[${entry.label}] ${entry.command} ${entry.args.join(' ')}`);
    }
    process.exit(0);
  }

  const children = [];
  let shuttingDown = false;

  function shutdown(exceptChild) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    for (const child of children) {
      if (child !== exceptChild && child.exitCode == null && child.signalCode == null) {
        terminateProcessTree(child);
      }
    }
  }

  function attachProcessLifecycle(entry, child) {
    child.on('error', (error) => {
      process.stderr.write(
        `[${entry.label}] ${error instanceof Error ? error.message : String(error)}\n`,
      );
      shutdown(child);
      process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      if (shuttingDown) {
        return;
      }
      shutdown(child);
      if (code && code !== 0) {
        process.stderr.write(`[${entry.label}] exited with code ${code}\n`);
        process.exitCode = code;
      } else if (signal) {
        process.stderr.write(`[${entry.label}] exited with signal ${signal}\n`);
        process.exitCode = 1;
      }
    });
  }

  for (const entry of processes) {
    const child = spawnProcessEntry(entry);
    children.push(child);
    attachProcessLifecycle(entry, child);
  }

  try {
    await waitForSurfaceHealth(profileId, runtimeEnv);
  } catch (error) {
    shutdown();
    throw error;
  }

  console.log(`[sdkwork-documents] dev stack ready (profile=${profileId})`);

  const stop = () => shutdown();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch((error) => {
  console.error(`[sdkwork-documents] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
