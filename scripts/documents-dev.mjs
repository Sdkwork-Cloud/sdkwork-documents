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
  loadEnvFile,
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
const PC_APP_FILTER = 'sdkwork-documents-pc';
const DEFAULT_PC_DEV_PORT = 3902;
const ALLOWED_TARGETS = new Set(['server', 'browser', 'browser-only']);

function cargoCommand() {
  return process.platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function pnpmShell() {
  return process.platform === 'win32';
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

  if (!ALLOWED_TARGETS.has(settings.target)) {
    throw new Error('target must be one of: server, browser, browser-only');
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
  --target <server|browser|browser-only>            Default: server
  --dev-env-file <path>                             Optional profile env override
  --dry-run                                         Print plan without executing
  --help, -h

Targets:
  server         Start backend orchestration only (default for pnpm dev:server)
  browser        Start backend orchestration, wait for health, then start PC Vite dev server
  browser-only   Start PC Vite dev server only (backend must already be running)
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

function resolvePcDevPort(env) {
  const parsed = Number.parseInt(
    env.VITE_SDKWORK_DOCUMENTS_PC_DEV_PORT ?? String(DEFAULT_PC_DEV_PORT),
    10,
  );
  return Number.isFinite(parsed) ? parsed : DEFAULT_PC_DEV_PORT;
}

function createApiServerBinaryProcess(crate, binary, label, env) {
  ensureDocumentsDataDir();
  return {
    label,
    command: cargoCommand(),
    args: ['run', '-p', crate, '--bin', binary],
    cwd: REPO_ROOT,
    env,
    shell: false,
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
    shell: false,
  };
}

function createBrowserDevProcess(env, processDef) {
  const packageRoot = path.join(REPO_ROOT, processDef.package ?? 'apps/sdkwork-documents-pc');
  const script = processDef.script ?? 'dev';
  return {
    label: processDef.id ?? PC_APP_FILTER,
    command: pnpmCommand(),
    args: ['--dir', packageRoot, script],
    cwd: REPO_ROOT,
    env,
    shell: pnpmShell(),
  };
}

function isRendererProcess(processDef) {
  return Boolean(processDef.package);
}

function partitionOrchestrationProcesses(profileId, env, target) {
  const backendProcesses = [];
  const rendererProcesses = [];

  for (const processDef of listOrchestrationProcesses(profileId)) {
    if (processDef.id === 'platform.api-gateway') {
      if (!shouldAutostartGateway(env)) {
        continue;
      }
      backendProcesses.push(createPlatformGatewayProcess(env));
      continue;
    }

    if (isRendererProcess(processDef)) {
      rendererProcesses.push(createBrowserDevProcess(env, processDef));
      continue;
    }

    const crate = processDef.crate ?? DEFAULT_API_SERVER_CRATE;
    const binary = processDef.binary ?? processDef.id;
    backendProcesses.push(createApiServerBinaryProcess(crate, binary, binary, env));
  }

  if (
    !backendProcesses.some((entry) => entry.label === 'sdkwork-api-gateway')
    && shouldAutostartGateway(env)
  ) {
    backendProcesses.unshift(createPlatformGatewayProcess(env));
  }

  if (target === 'server') {
    return { backendProcesses, rendererProcesses: [] };
  }
  if (target === 'browser-only') {
    return { backendProcesses: [], rendererProcesses };
  }

  return { backendProcesses, rendererProcesses };
}

function spawnProcessEntry(entry) {
  return spawn(entry.command, entry.args, {
    cwd: entry.cwd ?? REPO_ROOT,
    env: sanitizeSpawnEnv(entry.env),
    stdio: 'inherit',
    shell: entry.shell ?? process.platform === 'win32',
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

function buildRuntimeEnv(settings, profileId, profileEnv) {
  const devEnvOverride = settings.devEnvFile ? loadEnvFile(settings.devEnvFile) : {};
  const runtimeTarget =
    settings.target === 'browser-only' || settings.target === 'browser' ? 'browser' : 'server';

  return mergeRuntimeEnv(
    process.env,
    profileEnv,
    devEnvOverride,
    resolveDocumentsDatabaseEnv(settings),
    {
      SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE: settings.deploymentProfile,
      SDKWORK_DOCUMENTS_SERVICE_LAYOUT: settings.serviceLayout,
      SDKWORK_DOCUMENTS_DATABASE_PROFILE: settings.database,
      SDKWORK_DOCUMENTS_PROFILE_ID: profileId,
      SDKWORK_DOCUMENTS_DEV_MODE: '1',
      SDKWORK_DOCUMENTS_RUNTIME_TARGET: runtimeTarget,
      SDKWORK_DOCUMENTS_DEV_AUTH_BYPASS: 'true',
      VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE: settings.deploymentProfile,
      VITE_SDKWORK_DOCUMENTS_RUNTIME_TARGET: runtimeTarget,
    },
  );
}

async function runBrowserOnly(settings, runtimeEnv, profileId) {
  const { rendererProcesses } = partitionOrchestrationProcesses(
    profileId,
    runtimeEnv,
    settings.target,
  );
  const browserEntry = rendererProcesses[0] ?? createBrowserDevProcess(runtimeEnv, { id: PC_APP_FILTER });
  const pcDevPort = resolvePcDevPort(runtimeEnv);

  if (settings.dryRun) {
    console.log(
      `[sdkwork-documents] target=${settings.target} profile=${runtimeEnv.SDKWORK_DOCUMENTS_PROFILE_ID ?? 'unknown'}`,
    );
    console.log(`[${browserEntry.label}] ${browserEntry.command} ${browserEntry.args.join(' ')}`);
    process.exit(0);
  }

  console.log(
    `[sdkwork-documents] PC browser starting (Vite on http://127.0.0.1:${pcDevPort})`,
  );

  const browserChild = spawnProcessEntry(browserEntry);
  let shuttingDown = false;

  function shutdown() {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    terminateProcessTree(browserChild);
  }

  const stop = () => shutdown();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  await new Promise((resolve, reject) => {
    browserChild.on('error', reject);
    browserChild.on('exit', (code, signal) => {
      shutdown();
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolve();
        return;
      }
      reject(new Error(`PC browser dev exited with code ${code ?? 1}`));
    });
  });
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
  const runtimeEnv = buildRuntimeEnv(settings, profileId, profileEnv);

  if (settings.target === 'browser-only') {
    await runBrowserOnly(settings, runtimeEnv, profileId);
    return;
  }

  const { backendProcesses, rendererProcesses } = partitionOrchestrationProcesses(
    profileId,
    runtimeEnv,
    settings.target,
  );
  const browserEntry =
    settings.target === 'browser'
      ? (rendererProcesses[0] ?? createBrowserDevProcess(runtimeEnv, { id: PC_APP_FILTER }))
      : undefined;
  const pcDevPort = resolvePcDevPort(runtimeEnv);

  if (settings.dryRun) {
    console.log(
      `[sdkwork-documents] profile=${profileId} deploymentProfile=${settings.deploymentProfile} serviceLayout=${settings.serviceLayout} database=${settings.database} target=${settings.target}`,
    );
    for (const entry of backendProcesses) {
      console.log(`[${entry.label}] ${entry.command} ${entry.args.join(' ')}`);
    }
    if (browserEntry) {
      console.log(`[${browserEntry.label}] ${browserEntry.command} ${browserEntry.args.join(' ')}`);
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

  for (const entry of backendProcesses) {
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

  if (settings.target !== 'browser' || !browserEntry) {
    return;
  }

  console.log(
    `[sdkwork-documents] PC browser starting (Vite on http://127.0.0.1:${pcDevPort})`,
  );
  const browserChild = spawnProcessEntry(browserEntry);
  children.push(browserChild);
  attachProcessLifecycle(browserEntry, browserChild);

  await new Promise((resolve, reject) => {
    browserChild.on('error', reject);
    browserChild.on('exit', (code, signal) => {
      shutdown(browserChild);
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolve();
        return;
      }
      reject(new Error(`PC browser dev exited with code ${code ?? 1}`));
    });
  });
}

main().catch((error) => {
  console.error(`[sdkwork-documents] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
