#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const sdksRoot = path.resolve(workspaceRoot, "sdks");
const owner = "sdkwork-documents";
const domain = "content";
const capability = "documents";
const standardVersion = "2026-06-20";
const checkOnly = process.argv.includes("--check");
const pendingChanges = [];

const httpMethods = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);

const families = [
  {
    root: "sdkwork-documents-sdk",
    title: "SDKWork Documents Open API SDK",
    apiVersion: "0.1.0",
    authority: "sdkwork-documents-open-api",
    sdkTarget: "open",
    apiPrefix: "/doc/v3/api",
    schemaUrl: "/doc/v3/openapi.json",
    input: "openapi/documents-open-api.openapi.json",
    packageName: "@sdkwork/documents-sdk",
    generatedPath: "sdkwork-documents-sdk-typescript/generated/server-openapi",
    generatedWorkspace: "sdkwork-documents-sdk-typescript",
    primaryClient: "SdkworkDocumentsOpenClient",
    sdkgenType: "custom",
    dependencies: [],
    forbiddenPathPrefixes: ["/app/v3/api/", "/backend/v3/api/"],
  },
  {
    root: "sdkwork-documents-app-sdk",
    title: "SDKWork Documents App API SDK",
    apiVersion: "0.1.0",
    authority: "sdkwork-documents.app",
    sdkTarget: "app",
    apiPrefix: "/app/v3/api",
    schemaUrl: "/app/v3/openapi.json",
    input: "openapi/documents-app-api.openapi.json",
    packageName: "@sdkwork/documents-app-sdk",
    generatedPath: "sdkwork-documents-app-sdk-typescript/generated/server-openapi",
    generatedWorkspace: "sdkwork-documents-app-sdk-typescript",
    primaryClient: "SdkworkDocumentsAppClient",
    sdkgenType: "app",
    dependencies: [],
    forbiddenPathPrefixes: ["/backend/v3/api/", "/doc/v3/api/"],
  },
  {
    root: "sdkwork-documents-backend-sdk",
    title: "SDKWork Documents Backend API SDK",
    apiVersion: "0.1.0",
    authority: "sdkwork-documents.backend",
    sdkTarget: "backend",
    apiPrefix: "/backend/v3/api",
    schemaUrl: "/backend/v3/openapi.json",
    input: "openapi/documents-backend-api.openapi.json",
    packageName: "@sdkwork/documents-backend-sdk",
    generatedPath: "sdkwork-documents-backend-sdk-typescript/generated/server-openapi",
    generatedWorkspace: "sdkwork-documents-backend-sdk-typescript",
    primaryClient: "SdkworkDocumentsBackendClient",
    sdkgenType: "backend",
    dependencies: [],
    forbiddenPathPrefixes: ["/app/v3/api/", "/doc/v3/api/"],
  },
];

function routeCrateFor(family) {
  return `sdkwork-routes-documents-${family.sdkTarget}-api`;
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  const desiredText = jsonText(value);
  let currentText = "";
  let exists = true;
  try {
    currentText = await readFile(filePath, "utf8");
  } catch {
    exists = false;
  }

  if (exists && currentText === desiredText) {
    return;
  }

  const relativePath = path.relative(workspaceRoot, filePath).replaceAll("\\", "/");
  if (checkOnly) {
    pendingChanges.push(relativePath);
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, desiredText, "utf8");
}

function operationEntries(openapi) {
  const entries = [];
  for (const [pathKey, pathItem] of Object.entries(openapi.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!httpMethods.has(method.toLowerCase()) || !operation || typeof operation !== "object") {
        continue;
      }
      entries.push({ pathKey, method: method.toLowerCase(), operation });
    }
  }
  return entries;
}

function removeDependencyOwnedOperations(openapi, family) {
  const removed = [];
  for (const [pathKey, pathItem] of Object.entries(openapi.paths || {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, operation] of Object.entries({ ...pathItem })) {
      if (!httpMethods.has(method.toLowerCase()) || !operation || typeof operation !== "object") {
        continue;
      }
      const explicitOwner = operation["x-sdkwork-owner"];
      const forbiddenByOwner = explicitOwner && explicitOwner !== owner;
      const forbiddenByPrefix = family.forbiddenPathPrefixes.some((prefix) => pathKey.startsWith(prefix));
      if (!forbiddenByOwner && !forbiddenByPrefix) {
        continue;
      }
      removed.push({
        path: pathKey,
        method: method.toLowerCase(),
        operationId: operation.operationId || "",
        owner: explicitOwner || "",
      });
      delete pathItem[method];
    }

    const remainingMethods = Object.keys(pathItem).filter((method) => httpMethods.has(method.toLowerCase()));
    if (remainingMethods.length === 0) {
      delete openapi.paths[pathKey];
    }
  }
  return removed;
}

async function standardizeOpenApi(family) {
  const filePath = path.join(sdksRoot, family.root, family.input);
  const openapi = await readJson(filePath);
  const removedOperations = removeDependencyOwnedOperations(openapi, family);

  openapi["x-sdkwork-owner"] = owner;
  openapi["x-sdkwork-domain"] = domain;
  openapi["x-sdkwork-capability"] = capability;
  openapi["x-sdkwork-api-authority"] = family.authority;
  openapi["x-sdkwork-sdk-family"] = family.root;
  openapi["x-sdkwork-owner-only-input"] = true;
  openapi["x-sdkwork-standard-version"] = standardVersion;
  openapi.info = {
    ...(openapi.info || {}),
    title: openapi.info?.title || family.title,
    version: openapi.info?.version || family.apiVersion,
  };

  if (removedOperations.length > 0) {
    openapi["x-sdkwork-dependency-exclusions"] = [
      ...(Array.isArray(openapi["x-sdkwork-dependency-exclusions"])
        ? openapi["x-sdkwork-dependency-exclusions"]
        : []),
      {
        standardVersion,
        reason: "dependency-owned operations must not be copied into owner SDK generation input",
        removedOperations,
      },
    ];
  }

  for (const { operation } of operationEntries(openapi)) {
    operation["x-sdkwork-owner"] = owner;
    operation["x-sdkwork-api-authority"] = family.authority;
    operation["x-sdkwork-request-context"] = "WebRequestContext";
    operation["x-sdkwork-api-surface"] = `${family.sdkTarget}-api`;
    operation["x-sdkwork-source-route-crate"] = routeCrateFor(family);
  }

  await writeJson(filePath, openapi);
  return {
    openapi,
    operationCount: operationEntries(openapi).length,
    removedOperations,
  };
}

function assemblyFor(family, openapi, operationCount) {
  return {
    workspace: family.root,
    title: family.title,
    apiVersion: family.apiVersion,
    openapiVersion: openapi.openapi || "3.1.0",
    authoritySpec: family.input,
    generationInputSpec: family.input,
    derivedSpecs: { default: family.input },
    apiAuthority: family.authority,
    discoverySurface: {
      sdkTarget: family.sdkTarget,
      apiPrefix: family.apiPrefix,
      schemaUrl: family.schemaUrl,
      generatedProtocols: ["http-openapi"],
      manualTransports: [],
    },
    languages: [
      {
        language: "typescript",
        workspace: family.generatedWorkspace,
        generationState: "materialized",
        releaseState: "not_published",
        generatedPath: family.generatedPath,
        manifestPath: `${family.generatedPath}/package.json`,
        name: family.packageName,
        version: family.apiVersion,
        description: `Generator-owned TypeScript transport SDK for ${family.authority}.`,
        consumerSurface: {
          primaryClient: family.primaryClient,
          apiPrefix: family.apiPrefix,
        },
      },
    ],
    sdkOwner: owner,
    sdkDependencies: family.dependencies,
    metadata: {
      standardVersion,
      ownerOnlyOperationCount: operationCount,
      managedBy: "sdks/standardize-documents-sdk-family.mjs",
    },
  };
}

function componentSpecFor(family) {
  return {
    schemaVersion: 1,
    kind: "sdkwork.component.spec",
    component: {
      name: family.root,
      displayName: family.title,
      version: family.apiVersion,
      type: "sdk-family",
      root: `sdkwork-documents/sdks/${family.root}`,
      domain,
      capability,
      status: "standardized",
      languages: ["typescript"],
      generated: true,
      private: false,
      manifests: [".sdkwork-assembly.json", "sdk-manifest.json"],
    },
    canonicalSpecs: [
      { file: "API_SPEC.md", path: "../sdkwork-specs/API_SPEC.md" },
      { file: "SDK_SPEC.md", path: "../sdkwork-specs/SDK_SPEC.md" },
      { file: "SDK_WORKSPACE_GENERATION_SPEC.md", path: "../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md" },
    ],
    contracts: {
      apiAuthority: {
        name: family.authority,
        prefix: family.apiPrefix,
        authorityOpenApi: family.input,
        derivedOpenApi: [family.input],
        owner,
      },
      publicExports: [],
      runtimeEntrypoints: [".sdkwork-assembly.json"],
      sdkDependencies: family.dependencies,
      sdkClients: [family.primaryClient],
      events: [],
      configKeys: [".sdkwork-assembly.json", "sdk-manifest.json"],
    },
    verification: {
      commands: [
        "node sdks/standardize-documents-sdk-family.mjs --check",
        "node sdks/test/verify-sdk-ownership-boundaries.test.mjs",
      ],
    },
    metadata: {
      managedBy: "sdks/standardize-documents-sdk-family.mjs",
      standardVersion,
    },
  };
}

function sdkManifestFor(family, operationCount) {
  return {
    schemaVersion: 1,
    sdkName: family.root,
    packageName: family.packageName,
    sdkOwner: owner,
    apiAuthority: family.authority,
    sdkFamily: family.root,
    sdkType: family.sdkTarget,
    sdkSurface: family.sdkTarget,
    language: "typescript",
    apiPrefix: family.apiPrefix,
    generationInputSpec: family.input,
    generatedOutput: family.generatedPath,
    standardProfile: "sdkwork-v3",
    sdkDependencies: family.dependencies,
    ownerOnlyOperationCount: operationCount,
    standardVersion,
    managedBy: "sdks/standardize-documents-sdk-family.mjs",
  };
}

async function writeSdkgenConfig(family) {
  const config = {
    schemaVersion: 1,
    kind: "sdkwork.sdkgen.config",
    input: path.basename(family.input),
    output: `../${family.generatedPath}`,
    sdkOwner: owner,
    apiAuthority: family.authority,
    sdkFamily: family.root,
    standardProfile: "sdkwork-v3",
    languageTargets: ["typescript"],
    ownerOnly: true,
    domain,
    capability,
    prefix: family.apiPrefix,
    surface: `${family.sdkTarget}-api`,
  };
  const configPath = path.join(
    sdksRoot,
    family.root,
    "openapi",
    `${path.basename(family.input, ".json")}.sdkgen.yaml`,
  );
  const desiredText = `${Object.entries(config)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((item) => `  - ${item}`).join("\n")}`;
      }
      return `${key}: ${value}`;
    })
    .join("\n")}\n`;
  const relativePath = path.relative(workspaceRoot, configPath).replaceAll("\\", "/");
  let currentText = "";
  try {
    currentText = await readFile(configPath, "utf8");
  } catch {
    currentText = "";
  }
  if (currentText !== desiredText) {
    if (checkOnly) {
      pendingChanges.push(relativePath);
      return;
    }
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, desiredText, "utf8");
  }
}

async function standardizeFamily(family) {
  const { openapi, operationCount, removedOperations } = await standardizeOpenApi(family);
  await writeJson(path.join(sdksRoot, family.root, ".sdkwork-assembly.json"), assemblyFor(family, openapi, operationCount));
  await writeJson(path.join(sdksRoot, family.root, "sdk-manifest.json"), sdkManifestFor(family, operationCount));
  await writeJson(path.join(sdksRoot, family.root, "specs", "component.spec.json"), componentSpecFor(family));
  await writeSdkgenConfig(family);
  return {
    family: family.root,
    authority: family.authority,
    operationCount,
    removedDependencyOperations: removedOperations.length,
  };
}

const summary = [];
for (const family of families) {
  summary.push(await standardizeFamily(family));
}

if (checkOnly && pendingChanges.length > 0) {
  console.error(
    JSON.stringify({ ok: false, mode: "check", owner, standardVersion, pendingChanges, families: summary }, null, 2),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, mode: checkOnly ? "check" : "apply", owner, standardVersion, families: summary }, null, 2));
