#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const sdkgen = path.resolve(workspaceRoot, "../sdkwork-sdk-generator/bin/sdkgen.js");

const families = [
  {
    input: "sdks/sdkwork-documents-sdk/openapi/documents-open-api.openapi.json",
    output: "sdks/sdkwork-documents-sdk/sdkwork-documents-sdk-typescript/generated/server-openapi",
    name: "sdkwork-documents-sdk",
    type: "custom",
    packageName: "@sdkwork/documents-sdk",
    apiPrefix: "/doc/v3/api",
    clientName: "SdkworkDocumentsOpenClient",
  },
  {
    input: "sdks/sdkwork-documents-app-sdk/openapi/documents-app-api.openapi.json",
    output: "sdks/sdkwork-documents-app-sdk/sdkwork-documents-app-sdk-typescript/generated/server-openapi",
    name: "sdkwork-documents-app-sdk",
    type: "app",
    packageName: "@sdkwork/documents-app-sdk",
    apiPrefix: "/app/v3/api",
    clientName: "SdkworkDocumentsAppClient",
  },
  {
    input: "sdks/sdkwork-documents-backend-sdk/openapi/documents-backend-api.openapi.json",
    output: "sdks/sdkwork-documents-backend-sdk/sdkwork-documents-backend-sdk-typescript/generated/server-openapi",
    name: "sdkwork-documents-backend-sdk",
    type: "backend",
    packageName: "@sdkwork/documents-backend-sdk",
    apiPrefix: "/backend/v3/api",
    clientName: "SdkworkDocumentsBackendClient",
  },
];

function runGenerate(family) {
  const args = [
    sdkgen,
    "generate",
    "-i",
    path.join(workspaceRoot, family.input),
    "-o",
    path.join(workspaceRoot, family.output),
    "-n",
    family.name,
    "-t",
    family.type,
    "-l",
    "typescript",
    "--package-name",
    family.packageName,
    "--api-prefix",
    family.apiPrefix,
    "--standard-profile",
    "sdkwork-v3",
    "--fixed-sdk-version",
    "0.1.0",
    "--client-name",
    family.clientName,
    "--emit-control-plane",
  ];
  const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: workspaceRoot });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const family of families) {
  runGenerate(family);
}

console.log("Documents SDK families generated.");
