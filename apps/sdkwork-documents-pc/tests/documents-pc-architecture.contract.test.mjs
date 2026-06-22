#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredFiles = [
  'src/App.tsx',
  'src/AuthGate.tsx',
  'src/authGateLogic.ts',
  'src/bootstrap/authConfig.ts',
  'src/bootstrap/sessionStore.ts',
  'src/bootstrap/sessionTokenManager.ts',
  'src/bootstrap/environment.ts',
  'src/bootstrap/iamRuntime.ts',
  'src/bootstrap/runtime.ts',
  'src/bootstrap/sdkClients.ts',
  'src/bootstrap/routes.ts',
  'config/browser/runtime-env.development.example.json',
  'config/browser/runtime-env.test.example.json',
  'config/browser/runtime-env.staging.example.json',
  'config/browser/runtime-env.production.example.json',
  'specs/component.spec.json',
  'packages/sdkwork-documents-pc-shell/package.json',
  'packages/sdkwork-documents-pc-core/package.json',
  'index.html',
  'vite.config.ts',
];

test('sdkwork-documents-pc matches APP_PC_ARCHITECTURE required layout', () => {
  for (const relativePath of requiredFiles) {
    assert.ok(
      fs.existsSync(path.join(pcRoot, relativePath)),
      `missing required PC architecture file: ${relativePath}`,
    );
  }

  assert.ok(
    !fs.existsSync(path.join(pcRoot, 'scripts/scaffold.mjs')),
    'scaffold dev/build stubs must be removed',
  );

  const packageJson = JSON.parse(fs.readFileSync(path.join(pcRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(packageJson.scripts.build, 'vite build');

  const appSource = fs.readFileSync(path.join(pcRoot, 'src/App.tsx'), 'utf8');
  assert.match(appSource, /AuthGate/u);
  assert.match(appSource, /DocumentsPcShell/u);
  assert.doesNotMatch(appSource, /ApiReference/u, 'root App.tsx must stay thin');

  const authGateSource = fs.readFileSync(path.join(pcRoot, 'src/AuthGate.tsx'), 'utf8');
  assert.match(authGateSource, /SdkworkIamAuthRoutes/u);

  const iamRuntimeSource = fs.readFileSync(path.join(pcRoot, 'src/bootstrap/iamRuntime.ts'), 'utf8');
  assert.match(iamRuntimeSource, /createSdkworkAppbasePcAuthRuntime/u);

  const sdkClientsSource = fs.readFileSync(path.join(pcRoot, 'src/bootstrap/sdkClients.ts'), 'utf8');
  assert.match(sdkClientsSource, /authMode: 'dual-token'/u);

  const sessionTokenSource = fs.readFileSync(
    path.join(pcRoot, 'packages/sdkwork-documents-pc-commons/src/app-session-token.ts'),
    'utf8',
  );
  assert.match(sessionTokenSource, /sdkwork\.documents\.appSession\.v1/u);

  const componentSpec = JSON.parse(
    fs.readFileSync(path.join(pcRoot, 'specs/component.spec.json'), 'utf8'),
  );
  for (const entrypoint of componentSpec.contracts.runtimeEntrypoints) {
    assert.ok(
      fs.existsSync(path.join(pcRoot, entrypoint)),
      `component.spec runtimeEntrypoint must exist: ${entrypoint}`,
    );
  }
});
