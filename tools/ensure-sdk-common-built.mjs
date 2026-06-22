#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sdkCommonRoot = path.resolve(repoRoot, "../sdkwork-sdk-commons/sdkwork-sdk-common-typescript");
const distEntry = path.join(sdkCommonRoot, "dist/index.js");

if (fs.existsSync(distEntry)) {
  process.stdout.write("@sdkwork/sdk-common dist already present\n");
  process.exit(0);
}

if (!fs.existsSync(path.join(sdkCommonRoot, "package.json"))) {
  process.stderr.write(`Missing @sdkwork/sdk-common workspace at ${sdkCommonRoot}\n`);
  process.exit(1);
}

process.stdout.write("Building @sdkwork/sdk-common for PC/SDK consumers...\n");
const result = spawnSync("pnpm", ["build"], {
  cwd: sdkCommonRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(distEntry)) {
  process.stderr.write("@sdkwork/sdk-common build did not produce dist/index.js\n");
  process.exit(1);
}

process.stdout.write("@sdkwork/sdk-common build complete\n");
