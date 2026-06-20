import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sdksRoot = path.resolve(testDir, "..");
const workspaceRoot = path.resolve(sdksRoot, "..");

const families = [
  {
    root: "sdkwork-documents-sdk",
    owner: "sdkwork-documents",
    authority: "sdkwork-documents-open-api",
    input: "openapi/documents-open-api.openapi.json",
    manifest: "sdk-manifest.json",
    forbiddenPathPrefixes: ["/app/v3/api/", "/backend/v3/api/"],
  },
  {
    root: "sdkwork-documents-app-sdk",
    owner: "sdkwork-documents",
    authority: "sdkwork-documents.app",
    input: "openapi/documents-app-api.openapi.json",
    manifest: "sdk-manifest.json",
    forbiddenPathPrefixes: ["/backend/v3/api/", "/doc/v3/api/"],
  },
  {
    root: "sdkwork-documents-backend-sdk",
    owner: "sdkwork-documents",
    authority: "sdkwork-documents.backend",
    input: "openapi/documents-backend-api.openapi.json",
    manifest: "sdk-manifest.json",
    forbiddenPathPrefixes: ["/app/v3/api/", "/doc/v3/api/"],
  },
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
}

function operationEntries(openapi) {
  const entries = [];
  for (const [pathKey, pathItem] of Object.entries(openapi.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!["get", "put", "post", "patch", "delete", "head", "options", "trace"].includes(method)) {
        continue;
      }
      entries.push({ pathKey, method, operation });
    }
  }
  return entries;
}

test("documents SDK family assemblies declare owner-only authority metadata", () => {
  for (const family of families) {
    const assemblyPath = path.join("sdks", family.root, ".sdkwork-assembly.json");
    assert.ok(existsSync(path.join(workspaceRoot, assemblyPath)), `${family.root} must have ${assemblyPath}`);

    const assembly = readJson(assemblyPath);
    assert.equal(assembly.sdkOwner, family.owner, `${family.root} must declare sdkOwner`);
    assert.equal(assembly.apiAuthority, family.authority, `${family.root} must declare apiAuthority`);
    assert.equal(assembly.generationInputSpec, family.input, `${family.root} must generate from owner-only OpenAPI input`);
  }
});

test("documents SDK manifests record owner and authority boundaries", () => {
  for (const family of families) {
    const manifest = readJson(path.join("sdks", family.root, family.manifest));
    assert.equal(manifest.sdkOwner, family.owner, `${family.root} manifest must declare sdkOwner`);
    assert.equal(manifest.apiAuthority, family.authority, `${family.root} manifest must declare apiAuthority`);
    assert.equal(
      manifest.generationInputSpec,
      family.input,
      `${family.root} manifest must point at owner-only OpenAPI input`,
    );
  }
});

test("documents generated OpenAPI inputs contain only sdkwork-documents owned operations", () => {
  for (const family of families) {
    const openapi = readJson(path.join("sdks", family.root, family.input));
    assert.equal(openapi["x-sdkwork-owner"], family.owner);
    assert.equal(openapi["x-sdkwork-api-authority"], family.authority);

    for (const { pathKey, method, operation } of operationEntries(openapi)) {
      assert.equal(
        operation["x-sdkwork-owner"],
        family.owner,
        `${family.root} ${method.toUpperCase()} ${pathKey} must be documents-owned`,
      );
      assert.equal(
        operation["x-sdkwork-api-authority"],
        family.authority,
        `${family.root} ${method.toUpperCase()} ${pathKey} must use ${family.authority}`,
      );
      assert.equal(
        operation["x-sdkwork-request-context"],
        "WebRequestContext",
        `${family.root} ${method.toUpperCase()} ${pathKey} must declare WebRequestContext`,
      );
      assert(
        !family.forbiddenPathPrefixes.some((prefix) => pathKey.startsWith(prefix)),
        `${family.root} must not copy dependency-owned route ${method.toUpperCase()} ${pathKey}`,
      );
    }
  }
});
