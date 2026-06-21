#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const generatedSdkRoots = [
  "sdks/sdkwork-documents-sdk/sdkwork-documents-sdk-typescript/generated/server-openapi",
  "sdks/sdkwork-documents-app-sdk/sdkwork-documents-app-sdk-typescript/generated/server-openapi",
  "sdks/sdkwork-documents-backend-sdk/sdkwork-documents-backend-sdk-typescript/generated/server-openapi",
];

const artifactNames = ["node_modules", "dist", "package-lock.json"];

function removeIfExists(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return false;
  }
  fs.rmSync(absolutePath, { recursive: true, force: true });
  return true;
}

let removed = 0;
for (const sdkRoot of generatedSdkRoots) {
  for (const artifactName of artifactNames) {
    if (removeIfExists(path.join(repoRoot, sdkRoot, artifactName))) {
      removed += 1;
    }
  }
}

process.stdout.write(`cleaned ${removed} generated SDK build artifact path(s)\n`);
