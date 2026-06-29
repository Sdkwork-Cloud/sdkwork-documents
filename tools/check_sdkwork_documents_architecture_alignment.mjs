#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath} must exist`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertDirectory(relativePath) {
  assert(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath}/ must exist`);
}

function assertCargoDependsOnWebFramework(relativeCrateToml) {
  const text = readText(relativeCrateToml);
  assert(
    text.includes("sdkwork-web-axum.workspace = true") || text.includes("sdkwork-web-axum = {"),
    `${relativeCrateToml} must depend on sdkwork-web-axum per WEB_FRAMEWORK_SPEC.md`,
  );
}

const requiredDirectories = [
  "apis",
  "apps",
  "crates",
  "sdks",
  "database",
  "deployments",
  "configs",
  "scripts",
  "docs",
  "tests",
  ".sdkwork",
  "specs",
];

for (const directory of requiredDirectories) {
  assertDirectory(directory);
}

assert(fs.existsSync(path.join(repoRoot, "sdkwork.app.config.json")), "sdkwork.app.config.json must exist");
assert(fs.existsSync(path.join(repoRoot, "sdkwork.workflow.json")), "sdkwork.workflow.json must exist");
assert(fs.existsSync(path.join(repoRoot, "package.json")), "package.json must exist per PNPM_SCRIPT_SPEC.md");
assert(
  fs.existsSync(path.join(repoRoot, ".github/workflows/package.yml")),
  ".github/workflows/package.yml must exist per GITHUB_WORKFLOW_SPEC.md",
);

const packageJson = readJson("package.json");
for (const script of ["dev", "build", "test", "check", "verify", "clean"]) {
  assert(packageJson.scripts?.[script], `package.json must expose pnpm ${script}`);
}

for (const script of [
  "dev:server",
  "dev:server:postgres:unified-process:standalone",
  "check:architecture-alignment",
  "check:pnpm-script-standard",
  "check:agent-workflow-standard",
  "api:materialize:check",
  "topology:validate",
  "test:topology",
  "sdk:check",
]) {
  assert(packageJson.scripts?.[script], `package.json must expose pnpm ${script}`);
}

const topologySpec = readJson("specs/topology.spec.json");
assert(
  topologySpec.vocabulary?.deploymentProfile?.allowed?.join(",") === "standalone,cloud",
  "specs/topology.spec.json must use deploymentProfile standalone/cloud vocabulary",
);
assert(
  topologySpec.defaults?.developmentProfileId === "standalone.unified-process.development",
  "specs/topology.spec.json must default development to standalone.unified-process.development",
);
assert(
  topologySpec.defaults?.productionProfileId === "cloud.split-services.production",
  "specs/topology.spec.json must default production to cloud.split-services.production",
);
assert(
  topologySpec.schemaVersion === 2,
  "specs/topology.spec.json must use schemaVersion 2",
);

for (const profileId of [
  "standalone.unified-process.development",
  "standalone.unified-process.production",
  "cloud.split-services.development",
  "cloud.split-services.production",
]) {
  const profilePath = topologySpec.profileFiles?.[profileId];
  assert(profilePath, `specs/topology.spec.json must declare profileFiles.${profileId}`);
  assert(fs.existsSync(path.join(repoRoot, profilePath)), `${profilePath} must exist`);
}

assert(
  fs.existsSync(path.join(repoRoot, "scripts/lib/documents-topology.mjs")),
  "scripts/lib/documents-topology.mjs must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "docs/topology-standard.md")),
  "docs/topology-standard.md must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "tools/materialize-apis-authority.mjs")),
  "tools/materialize-apis-authority.mjs must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "tools/patch-route-manifest-extensions.mjs")),
  "tools/patch-route-manifest-extensions.mjs must exist",
);

const authorityManifest = readJson("apis/authority-manifest.json");
assert(
  Array.isArray(authorityManifest.surfaces) && authorityManifest.surfaces.length === 3,
  "apis/authority-manifest.json must declare three surfaces with authorityPath/sdkPath pairs",
);
for (const surface of authorityManifest.surfaces ?? []) {
  assert(surface.authorityPath, "authority manifest surface must declare authorityPath");
  assert(surface.sdkPath, "authority manifest surface must declare sdkPath");
  assert(
    fs.existsSync(path.join(repoRoot, surface.authorityPath)),
    `${surface.authorityPath} must exist`,
  );
  assert(fs.existsSync(path.join(repoRoot, surface.sdkPath)), `${surface.sdkPath} must exist`);
}

for (const configFile of topologySpec.packaging?.cloudConfigFiles ?? []) {
  assert(
    fs.existsSync(path.join(repoRoot, "configs", configFile)),
    `configs/${configFile} must exist`,
  );
}

for (const [scriptName, command] of Object.entries(packageJson.scripts ?? {})) {
  const firstSegment = scriptName.split(":")[0];
  assert(
    !["documents", "doc"].includes(firstSegment),
    `package.json script ${scriptName} must use SDKWork action-first naming`,
  );
  assert(
    !/(--hosting|\bself-hosted\b|\bcloud-hosted\b)/u.test(String(command)),
    `package.json script ${scriptName} must not use retired deployment command values`,
  );
}

const routerCrates = [
  "crates/sdkwork-routes-documents-open-api/Cargo.toml",
  "crates/sdkwork-routes-documents-app-api/Cargo.toml",
  "crates/sdkwork-routes-documents-backend-api/Cargo.toml",
];

const cargoToml = readText("Cargo.toml");
assert(cargoToml.includes("sdkwork-web-core"), "Cargo.toml must declare sdkwork-web-core");
assert(cargoToml.includes("sdkwork-web-axum"), "Cargo.toml must declare sdkwork-web-axum");
assert(cargoToml.includes("sdkwork-iam-web-adapter"), "Cargo.toml must declare sdkwork-iam-web-adapter");
assert(cargoToml.includes("sdkwork-database-config"), "Cargo.toml must declare sdkwork-database-config");
assert(cargoToml.includes("sdkwork-database-sqlx"), "Cargo.toml must declare sdkwork-database-sqlx");
assert(cargoToml.includes("sdkwork-database-repository"), "Cargo.toml must declare sdkwork-database-repository");
assert(cargoToml.includes("sdkwork-utils-rust"), "Cargo.toml must declare sdkwork-utils-rust");
assert(cargoToml.includes("sdkwork-documents-standalone-gateway"), "Cargo.toml must include sdkwork-documents-standalone-gateway");
assert(
  cargoToml.includes("sdkwork-documents-observability"),
  "Cargo.toml must include sdkwork-documents-observability",
);
assert(
  cargoToml.includes("sdkwork-content-documents-repository-sqlx"),
  "Cargo.toml must include repository-sqlx crate",
);
assert(!cargoToml.includes("sdkwork-discovery"), "sdkwork-discovery is not required until RPC services exist");

const workflow = readJson("sdkwork.workflow.json");
const dependencyIds = new Set((workflow.dependencies || []).map((dependency) => dependency.id));
for (const dependencyId of [
  "sdkwork-appbase",
  "sdkwork-database",
  "sdkwork-web-framework",
  "sdkwork-utils",
  "sdkwork-sdk-generator",
  "sdkwork-app-topology",
]) {
  assert(dependencyIds.has(dependencyId), `sdkwork.workflow.json must declare ${dependencyId}`);
}
assert(!dependencyIds.has("sdkwork-discovery"), "sdkwork.workflow.json must not declare sdkwork-discovery until RPC exists");

const targetIds = new Set((workflow.targets || []).map((target) => target.id));
for (const targetId of ["linux-x64-standalone-server-tar-gz", "linux-x64-cloud-container-oci"]) {
  assert(targetIds.has(targetId), `sdkwork.workflow.json must declare target ${targetId}`);
}
for (const target of workflow.targets || []) {
  assert(
    ["standalone", "cloud"].includes(target.deploymentProfile),
    `sdkwork.workflow.json target ${target.id} must declare canonical deploymentProfile`,
  );
  assert(target.runtimeTarget, `sdkwork.workflow.json target ${target.id} must declare runtimeTarget`);
  assert(target.runner, `sdkwork.workflow.json target ${target.id} must declare runner`);
  assert(
    Array.isArray(target.outputGlobs) && target.outputGlobs.length > 0,
    `sdkwork.workflow.json target ${target.id} must declare outputGlobs`,
  );
  for (const glob of target.outputGlobs ?? []) {
    assert(
      !glob.includes("sdkwork-documents-standalone-gateway"),
      `sdkwork.workflow.json target ${target.id} must package per-surface binaries, not unified sdkwork-documents-standalone-gateway`,
    );
  }
}

for (const routerCrate of routerCrates) {
  assertCargoDependsOnWebFramework(routerCrate);
  const crateName = path.basename(path.dirname(routerCrate));
  assert(
    fs.existsSync(path.join(repoRoot, `crates/${crateName}/src/web_bootstrap.rs`)),
    `${crateName} must provide web_bootstrap.rs`,
  );
  assert(
    fs.existsSync(path.join(repoRoot, `crates/${crateName}/src/manifest.rs`)),
    `${crateName} must provide manifest.rs`,
  );
  for (const moduleName of ["handlers.rs", "ports.rs", "response.rs", "routes.rs"]) {
    assert(
      fs.existsSync(path.join(repoRoot, `crates/${crateName}/src/${moduleName}`)),
      `${crateName} must provide ${moduleName}`,
    );
  }
  assert(
    fs.existsSync(path.join(repoRoot, `crates/${crateName}/README.md`)),
    `${crateName} must provide README.md`,
  );
  assert(
    fs.existsSync(path.join(repoRoot, `crates/${crateName}/specs/component.spec.json`)),
    `${crateName} must provide specs/component.spec.json`,
  );
}

const apiServerToml = readText("crates/sdkwork-documents-standalone-gateway/Cargo.toml");
assert(
  apiServerToml.includes('name = "sdkwork-documents-standalone-gateway"'),
  "sdkwork-documents-standalone-gateway must declare unified standalone gateway binary",
);
assert(
  apiServerToml.includes("sdkwork-documents-gateway-assembly"),
  "sdkwork-documents-standalone-gateway must depend on sdkwork-documents-gateway-assembly",
);
assert(
  fs.existsSync(path.join(repoRoot, "crates/sdkwork-documents-gateway-assembly/Cargo.toml")),
  "sdkwork-documents-gateway-assembly crate must exist",
);

const repositorySqlxToml = readText("crates/sdkwork-content-documents-repository-sqlx/Cargo.toml");
assert(
  repositorySqlxToml.includes("sdkwork-database-sqlx"),
  "repository-sqlx crate must depend on sdkwork-database-sqlx",
);
assert(
  repositorySqlxToml.includes("sdkwork-database-repository"),
  "repository-sqlx crate must depend on sdkwork-database-repository",
);
assert(
  repositorySqlxToml.includes("sdkwork-utils-rust"),
  "repository-sqlx crate must depend on sdkwork-utils-rust",
);
assert(
  fs.existsSync(path.join(repoRoot, "crates/sdkwork-content-documents-repository-sqlx/src/db/bootstrap.rs")),
  "repository-sqlx crate must provide db/bootstrap.rs",
);
assert(
  fs.existsSync(path.join(repoRoot, "crates/sdkwork-documents-observability/src/lib.rs")),
  "sdkwork-documents-observability must exist",
);

const serviceToml = readText("crates/sdkwork-content-documents-service/Cargo.toml");
assert(
  serviceToml.includes("sdkwork-utils-rust"),
  "service crate must depend on sdkwork-utils-rust for shared utility helpers",
);

const sdkReferenceToml = readText("crates/sdkwork-content-documents-sdk-reference/Cargo.toml");
assert(
  sdkReferenceToml.includes("sdkwork-utils-rust"),
  "sdk-reference crate must depend on sdkwork-utils-rust for shared env normalization helpers",
);

const componentSpec = readJson("specs/component.spec.json");
const rootRuntimeEntrypoints = componentSpec.contracts?.runtimeEntrypoints ?? [];
for (const entrypoint of [
  "sdkwork-documents-app-api",
  "sdkwork-documents-backend-api",
  "sdkwork-documents-open-api",
  "crates/sdkwork-routes-documents-app-api/src/runtime.rs",
]) {
  assert(
    rootRuntimeEntrypoints.includes(entrypoint),
    `specs/component.spec.json contracts.runtimeEntrypoints must include ${entrypoint}`,
  );
}
const sdkDependencyIds = new Set((componentSpec.contracts?.sdkDependencies ?? []).map((item) => item.workspace));
for (const workspace of [
  "sdkwork-web-framework",
  "sdkwork-database",
  "sdkwork-utils",
  "sdkwork-appbase",
  "sdkwork-sdk-generator",
]) {
  assert(
    sdkDependencyIds.has(workspace),
    `specs/component.spec.json must declare sdkDependencies workspace ${workspace}`,
  );
}
assert(!sdkDependencyIds.has("sdkwork-discovery"), "component spec must not declare sdkwork-discovery yet");

const routeManifestPaths = [
  "sdks/_route-manifests/open-api/sdkwork-routes-documents-open-api.route-manifest.json",
  "sdks/_route-manifests/app-api/sdkwork-routes-documents-app-api.route-manifest.json",
  "sdks/_route-manifests/backend-api/sdkwork-routes-documents-backend-api.route-manifest.json",
];

for (const relativePath of routeManifestPaths) {
  const manifest = readJson(relativePath);
  for (const route of manifest.routes ?? []) {
    assert(
      route.requestContext === "WebRequestContext",
      `${relativePath} route ${route.method} ${route.path} must declare WebRequestContext`,
    );
    assert(
      ["open-api", "app-api", "backend-api"].includes(route.apiSurface),
      `${relativePath} route ${route.method} ${route.path} must declare canonical apiSurface`,
    );
  }
}

assert(componentSpec.component.type === "web-backend-service", "component type must be web-backend-service");
assert(componentSpec.component.domain === "content", "component domain must be content");
assert(componentSpec.component.capability === "documents", "component capability must be documents");

assert(
  fs.existsSync(path.join(repoRoot, "configs/topology/standalone.unified-process.development.env")),
  "configs/topology/standalone.unified-process.development.env must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "crates/sdkwork-routes-documents-app-api/src/runtime.rs")),
  "sdkwork-routes-documents-app-api must provide runtime.rs",
);
assert(
  fs.existsSync(path.join(repoRoot, "crates/sdkwork-routes-documents-app-api/src/bootstrap.rs")),
  "sdkwork-routes-documents-app-api must provide bootstrap.rs",
);
assert(
  fs.existsSync(path.join(repoRoot, "scripts/documents-dev.mjs")),
  "scripts/documents-dev.mjs must exist",
);
assert(fs.existsSync(path.join(repoRoot, ".env.example")), ".env.example must exist");
const rootEnvExample = readText(".env.example");
assert(
  !/\bPORT=/.test(rootEnvExample),
  ".env.example must not use retired PORT; use SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_INGRESS_BIND",
);
assert(
  rootEnvExample.includes("SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_INGRESS_BIND"),
  ".env.example must declare SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_INGRESS_BIND",
);

const pcEnvExamplePath = "apps/sdkwork-documents-pc/.env.example";
assert(
  fs.existsSync(path.join(repoRoot, pcEnvExamplePath)),
  `${pcEnvExamplePath} must exist per APP_PC_ARCHITECTURE_SPEC.md`,
);
const pcEnvExample = readText(pcEnvExamplePath);
for (const key of [
  "VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE",
  "VITE_SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_URL",
  "VITE_SDKWORK_DOCUMENTS_PLATFORM_API_GATEWAY_HTTP_URL",
]) {
  assert(pcEnvExample.includes(key), `${pcEnvExamplePath} must declare ${key}`);
}

for (const packageDir of [
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-commons",
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-i18n",
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference",
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference",
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-core",
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-shell",
]) {
  assert(
    fs.existsSync(path.join(repoRoot, packageDir, "package.json")),
    `${packageDir}/package.json must exist`,
  );
  assert(
    fs.existsSync(path.join(repoRoot, packageDir, "specs/component.spec.json")),
    `${packageDir}/specs/component.spec.json must exist per COMPONENT_SPEC.md`,
  );
}

assert(
  fs.existsSync(path.join(repoRoot, "apps/sdkwork-documents-pc/AGENTS.md")),
  "apps/sdkwork-documents-pc/AGENTS.md must exist per SDKWORK_WORKSPACE_SPEC.md",
);

const pcRootFiles = [
  "apps/sdkwork-documents-pc/index.html",
  "apps/sdkwork-documents-pc/vite.config.ts",
  "apps/sdkwork-documents-pc/src/main.tsx",
  "apps/sdkwork-documents-pc/src/App.tsx",
  "apps/sdkwork-documents-pc/src/AuthGate.tsx",
  "apps/sdkwork-documents-pc/src/bootstrap/environment.ts",
  "apps/sdkwork-documents-pc/src/authGateLogic.ts",
  "apps/sdkwork-documents-pc/src/bootstrap/authConfig.ts",
  "apps/sdkwork-documents-pc/src/bootstrap/sessionStore.ts",
  "apps/sdkwork-documents-pc/src/bootstrap/sessionTokenManager.ts",
  "apps/sdkwork-documents-pc/src/bootstrap/runtime.ts",
  "apps/sdkwork-documents-pc/src/bootstrap/sdkClients.ts",
  "apps/sdkwork-documents-pc/specs/component.spec.json",
  "apps/sdkwork-documents-pc/tests/documents-pc-architecture.contract.test.mjs",
  "apps/sdkwork-documents-pc/config/browser/runtime-env.development.example.json",
  "apps/sdkwork-documents-pc/config/browser/runtime-env.test.example.json",
  "apps/sdkwork-documents-pc/config/browser/runtime-env.staging.example.json",
  "apps/sdkwork-documents-pc/config/browser/runtime-env.production.example.json",
];
for (const relativePath of pcRootFiles) {
  assert(
    fs.existsSync(path.join(repoRoot, relativePath)),
    `${relativePath} must exist per APP_PC_ARCHITECTURE_SPEC.md`,
  );
}

const pcPackageJson = readJson("apps/sdkwork-documents-pc/package.json");
assert(pcPackageJson.scripts?.dev === "vite", "sdkwork-documents-pc dev script must use vite");
assert(pcPackageJson.scripts?.build === "vite build", "sdkwork-documents-pc build script must use vite build");
assert(
  pcPackageJson.dependencies?.["@sdkwork/documents-app-sdk"],
  "sdkwork-documents-pc must depend on generated @sdkwork/documents-app-sdk",
);
for (const dependency of [
  "@sdkwork/auth-runtime-pc-react",
  "@sdkwork/auth-pc-react",
  "@sdkwork/iam-app-sdk",
  "@sdkwork/iam-contracts",
  "@sdkwork/iam-runtime",
]) {
  assert(
    pcPackageJson.dependencies?.[dependency],
    `sdkwork-documents-pc must depend on ${dependency} for IAM login integration`,
  );
}

const authGateSource = readText("apps/sdkwork-documents-pc/src/AuthGate.tsx");
assert(
  authGateSource.includes("SdkworkIamAuthRoutes"),
  "sdkwork-documents-pc AuthGate must render SdkworkIamAuthRoutes per IAM_LOGIN_INTEGRATION_SPEC.md",
);

const iamRuntimeSource = readText("apps/sdkwork-documents-pc/src/bootstrap/iamRuntime.ts");
assert(
  iamRuntimeSource.includes("createSdkworkAppbasePcAuthRuntime"),
  "sdkwork-documents-pc iamRuntime must compose Appbase PC auth runtime",
);

const pcSdkClientsSource = readText("apps/sdkwork-documents-pc/src/bootstrap/sdkClients.ts");
assert(
  pcSdkClientsSource.includes("createClient") && pcSdkClientsSource.includes("@sdkwork/documents-app-sdk"),
  "sdkwork-documents-pc bootstrap must construct generated documents app SDK client",
);
assert(
  pcSdkClientsSource.includes("authMode: 'dual-token'"),
  "sdkwork-documents-pc bootstrap must use dual-token auth mode for generated SDK clients",
);

assert(
  !fs.existsSync(path.join(repoRoot, "apps/sdkwork-documents-pc/scripts/scaffold.mjs")),
  "sdkwork-documents-pc must not keep scaffold dev/build stubs",
);

assert(
  fs.existsSync(path.join(repoRoot, "tools/ensure-sdk-common-built.mjs")),
  "tools/ensure-sdk-common-built.mjs must exist for PC/SDK build alignment",
);

const appSessionTokenSource = readText(
  "apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-commons/src/app-session-token.ts",
);
assert(
  appSessionTokenSource.includes("sdkwork.documents.appSession.v1"),
  "documents PC commons must use documents-owned app session storage key",
);

assert(
  fs.existsSync(path.join(repoRoot, ".sdkwork/.gitignore")),
  ".sdkwork/.gitignore must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "tests/contract/database-framework.contract.test.mjs")),
  "tests/contract/database-framework.contract.test.mjs must exist",
);
for (const routeTest of [
  "crates/sdkwork-routes-documents-open-api/tests/open_api_routes.rs",
  "crates/sdkwork-routes-documents-open-api/tests/open_web_framework_routes.rs",
  "crates/sdkwork-routes-documents-open-api/tests/open_openapi_routes.rs",
  "crates/sdkwork-routes-documents-app-api/tests/app_api_routes.rs",
  "crates/sdkwork-routes-documents-app-api/tests/app_web_framework_routes.rs",
  "crates/sdkwork-routes-documents-app-api/tests/app_openapi_routes.rs",
  "crates/sdkwork-routes-documents-backend-api/tests/backend_api_routes.rs",
  "crates/sdkwork-routes-documents-backend-api/tests/backend_web_framework_routes.rs",
  "crates/sdkwork-routes-documents-backend-api/tests/backend_openapi_routes.rs",
  "crates/sdkwork-routes-documents-app-api/tests/hosted_runtime_routes.rs",
  "crates/sdkwork-content-documents-repository-sqlx/tests/migration_manifest.rs",
  "crates/sdkwork-content-documents-repository-sqlx/tests/sqlite_document_store.rs",
  "crates/sdkwork-content-documents-repository-sqlx/tests/postgres_document_store.rs",
]) {
  assert(fs.existsSync(path.join(repoRoot, routeTest)), `${routeTest} must exist`);
}

assert(
  fs.existsSync(path.join(repoRoot, "tools/verify_sdkwork_structure.ps1")),
  "tools/verify_sdkwork_structure.ps1 must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "tools/verify_openapi_operation_ids.ps1")),
  "tools/verify_openapi_operation_ids.ps1 must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "sdks/test/verify-sdk-ownership-boundaries.test.mjs")),
  "sdks/test/verify-sdk-ownership-boundaries.test.mjs must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, ".github/workflows/verify.yml")),
  ".github/workflows/verify.yml must exist",
);

const openapiSpecPaths = [
  "sdks/sdkwork-documents-sdk/openapi/documents-open-api.openapi.json",
  "sdks/sdkwork-documents-app-sdk/openapi/documents-app-api.openapi.json",
  "sdks/sdkwork-documents-backend-sdk/openapi/documents-backend-api.openapi.json",
];
for (const relativePath of openapiSpecPaths) {
  const openapi = readJson(relativePath);
  for (const [routePath, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        assert(
          operation["x-sdkwork-api-surface"],
          `${relativePath} ${method.toUpperCase()} ${routePath} must declare x-sdkwork-api-surface`,
        );
        assert(
          operation["x-sdkwork-request-context"] === "WebRequestContext",
          `${relativePath} ${method.toUpperCase()} ${routePath} must declare WebRequestContext`,
        );
      }
    }
  }
}

assert(
  fs.existsSync(path.join(repoRoot, "sdks/standardize-documents-sdk-family.mjs")),
  "sdks/standardize-documents-sdk-family.mjs must exist",
);
assert(
  fs.existsSync(path.join(repoRoot, "scripts/generate-documents-sdk.mjs")),
  "scripts/generate-documents-sdk.mjs must exist",
);

const requiredGeneratedSdkRoots = [
  "sdks/sdkwork-documents-sdk/sdkwork-documents-sdk-typescript/generated/server-openapi",
  "sdks/sdkwork-documents-app-sdk/sdkwork-documents-app-sdk-typescript/generated/server-openapi",
  "sdks/sdkwork-documents-backend-sdk/sdkwork-documents-backend-sdk-typescript/generated/server-openapi",
];
for (const relativePath of requiredGeneratedSdkRoots) {
  assert(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} must exist`);
  for (const requiredFile of ["sdkwork-sdk.json", "package.json", "src/index.ts"]) {
    assert(
      fs.existsSync(path.join(repoRoot, relativePath, requiredFile)),
      `${relativePath}/${requiredFile} must exist`,
    );
  }
}

for (const familyRoot of [
  "sdks/sdkwork-documents-sdk/sdk-manifest.json",
  "sdks/sdkwork-documents-app-sdk/sdk-manifest.json",
  "sdks/sdkwork-documents-backend-sdk/sdk-manifest.json",
]) {
  const manifest = readJson(familyRoot);
  assert(manifest.standardProfile === "sdkwork-v3", `${familyRoot} must declare standardProfile sdkwork-v3`);
  assert(manifest.generatedOutput, `${familyRoot} must declare generatedOutput`);
}

for (const specFile of ["SDK_SPEC.md", "SDK_WORKSPACE_GENERATION_SPEC.md", "TEST_SPEC.md"]) {
  assert(
    (componentSpec.canonicalSpecs ?? []).some((entry) => entry.file === specFile),
    `specs/component.spec.json canonicalSpecs must include ${specFile}`,
  );
}

const crateComponentSpecs = [
  "crates/sdkwork-documents-contract/specs/component.spec.json",
  "crates/sdkwork-content-documents-service/specs/component.spec.json",
  "crates/sdkwork-content-documents-repository-sqlx/specs/component.spec.json",
  "crates/sdkwork-content-documents-sdk-reference/specs/component.spec.json",
  "crates/sdkwork-documents-database-host/specs/component.spec.json",
  "crates/sdkwork-documents-standalone-gateway/specs/component.spec.json",
  "crates/sdkwork-documents-observability/specs/component.spec.json",
];
for (const relativePath of crateComponentSpecs) {
  assert(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} must exist`);
}

assert(
  packageJson.scripts?.verify?.includes("topology:validate"),
  "package.json verify must run topology:validate",
);
assert(
  packageJson.scripts?.verify?.includes("test:topology"),
  "package.json verify must run test:topology",
);
assert(
  packageJson.scripts?.verify?.includes("clean-generated-sdk-artifacts.mjs"),
  "package.json verify must clean generated SDK build artifacts before verification",
);
assert(
  packageJson.scripts?.["build:browser"],
  "package.json must expose pnpm build:browser for documents PC bundle verification",
);
assert(
  packageJson.scripts?.verify?.includes("build:browser"),
  "package.json verify must build documents PC browser bundle",
);
assert(
  packageJson.scripts?.["dev:browser"],
  "package.json must expose pnpm dev:browser for documents PC development",
);
assert(
  packageJson.scripts?.["dev:browser:postgres:unified-process:standalone"]?.includes(
    "documents-dev.mjs --target browser",
  ),
  "dev:browser must route through topology-aware documents-dev.mjs browser orchestration",
);

const topologyStandard = readText("docs/topology-standard.md");
assert(
  topologyStandard.includes("pnpm dev:browser"),
  "docs/topology-standard.md must document pnpm dev:browser",
);
assert(
  topologyStandard.includes("3902"),
  "docs/topology-standard.md must document PC browser dev port 3902",
);

const documentsDevScript = readText("scripts/documents-dev.mjs");
assert(
  documentsDevScript.includes("partitionOrchestrationProcesses"),
  "scripts/documents-dev.mjs must partition backend and pc-renderer orchestration processes",
);
assert(
  documentsDevScript.includes("browser-only"),
  "scripts/documents-dev.mjs must support browser-only target when backend is already running",
);

const apiPrefixesSource = readText("crates/sdkwork-content-documents-sdk-reference/src/api_prefixes.rs");
for (const [constant, prefix] of [
  ["APP_API_PREFIX", "/app/v3/api"],
  ["BACKEND_API_PREFIX", "/backend/v3/api"],
  ["DOCUMENTS_OPEN_API_PREFIX", "/doc/v3/api"],
]) {
  assert(
    apiPrefixesSource.includes(`${constant}: &str = "${prefix}"`),
    `api_prefixes.rs must declare ${constant} = ${prefix}`,
  );
}

assert(
  fs.existsSync(path.join(repoRoot, "tools/clean-generated-sdk-artifacts.mjs")),
  "tools/clean-generated-sdk-artifacts.mjs must exist",
);

assert(
  readText("apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-commons/src/documents-reference-runtime.tsx").includes(
    'export const DOCUMENTS_OPEN_API_PREFIX = \'/doc/v3/api\'',
  ),
  "PC commons must export DOCUMENTS_OPEN_API_PREFIX aligned with sdkwork-documents-open-api",
);

const topologyOrchestrationStandalone =
  topologySpec.orchestration?.profiles?.["standalone.unified-process.development"]?.processes ?? [];
assert(
  topologyOrchestrationStandalone.some((entry) => entry.id === "pc-renderer"),
  "topology standalone development profile must declare pc-renderer orchestration process",
);

const topologyComponents = topologySpec.components ?? {};
for (const componentKey of ["appApiRouter", "backendApiRouter", "openApiRouter"]) {
  assert(
    topologyComponents[componentKey]?.binary,
    `topology components.${componentKey}.binary must be declared`,
  );
  assert(
    topologyComponents[componentKey]?.crate,
    `topology components.${componentKey}.crate must be declared`,
  );
}

const cloudSplitDevProcesses =
  topologySpec.orchestration?.profiles?.["cloud.split-services.development"]?.processes ?? [];
const publicIngressProcess = cloudSplitDevProcesses.find(
  (entry) => entry.id === "application.public-ingress",
);
assert(publicIngressProcess, "topology cloud split development must declare application.public-ingress");
assert(
  /standalone-gateway/u.test(String(publicIngressProcess.binary ?? "")),
  "topology cloud split development application.public-ingress must launch standalone gateway binary",
);
for (const processDef of cloudSplitDevProcesses) {
  assert(
    processDef.id !== "application.backend-http" && processDef.id !== "application.open-http",
    `topology cloud split development must not start decomposed HTTP process ${processDef.id}`,
  );
}

if (failures.length > 0) {
  process.stderr.write(`Architecture alignment failed:\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Architecture alignment passed\n");
