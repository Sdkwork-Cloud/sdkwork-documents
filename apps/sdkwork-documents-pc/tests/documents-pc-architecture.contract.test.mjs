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
  'src/bootstrap/environment.ts',
  'src/bootstrap/iamRuntime.ts',
  'src/bootstrap/runtime.ts',
  'src/bootstrap/sdkClients.ts',
  'src/bootstrap/routes.ts',
  'config/browser/runtime-env.development.example.json',
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

  const packageJson = JSON.parse(fs.readFileSync(path.join(pcRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(packageJson.scripts.build, 'vite build');

  const appSource = fs.readFileSync(path.join(pcRoot, 'src/App.tsx'), 'utf8');
  assert.match(appSource, /AuthGate/u);
  assert.match(appSource, /DocumentsPcShell/u);
  assert.doesNotMatch(appSource, /ApiReference/u, 'root App.tsx must stay thin');

  const mainSource = fs.readFileSync(path.join(pcRoot, 'src/main.tsx'), 'utf8');
  assert.match(mainSource, /DocumentsReferenceRuntimeProvider/u);
  assert.match(mainSource, /createSdkworkDocumentsPcRuntime/u);

  const sdkClientsSource = fs.readFileSync(path.join(pcRoot, 'src/bootstrap/sdkClients.ts'), 'utf8');
  assert.match(sdkClientsSource, /createClient/u);
  assert.match(sdkClientsSource, /@sdkwork\/documents-app-sdk/u);

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
