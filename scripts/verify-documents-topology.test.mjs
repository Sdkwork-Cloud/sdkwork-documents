import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

async function exists(relativePath) {
  try {
    await stat(path.join(ROOT, relativePath));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse((await read(relativePath)).replace(/^\uFEFF/u, ""));
}

test("declares SDKWork v3 deployment topology spec and profile env files for sdkwork-documents", async () => {
  assert.equal(await exists("specs/topology.spec.json"), true);
  assert.equal(await exists("scripts/lib/documents-topology.mjs"), true);
  assert.equal(await exists("scripts/documents-dev.mjs"), true);
  assert.equal(await exists("docs/topology-standard.md"), true);

  const spec = await readJson("specs/topology.spec.json");
  assert.equal(spec.schemaVersion, 2);
  assert.equal(spec.kind, "sdkwork.app.topology");
  assert.equal(spec.appId, "sdkwork-documents");
  assert.equal(spec.archetype, "application-http-gateway");
  assert.deepEqual(spec.vocabulary.deploymentProfile.allowed, ["standalone", "cloud"]);
  assert.equal(spec.defaults.developmentProfileId, "standalone.development");
  assert.equal(spec.defaults.productionProfileId, "cloud.production");
  assert.ok(spec.surfaces["application.public-ingress"]);
  assert.ok(spec.surfaces["application.backend-http"]);
  assert.ok(spec.surfaces["application.open-http"]);
  assert.ok(spec.surfaces["platform.api-gateway"]);

  for (const profileId of [
    "standalone.development",
    "standalone.production",
    "cloud.development",
    "cloud.production",
  ]) {
    const profilePath = spec.profileFiles[profileId];
    assert.equal(await exists(profilePath), true, `${profilePath} should exist`);
    const profileEnv = await read(profilePath);
    assert.match(profileEnv, /SDKWORK_DOCUMENTS_PROFILE_ID=/);
    assert.match(profileEnv, /SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE=/);
    assert.doesNotMatch(profileEnv, /HOSTING|self-hosted|cloud-hosted/);
    assert.match(profileEnv, /VITE_SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_URL=/);
    assert.match(profileEnv, /VITE_SDKWORK_DOCUMENTS_PLATFORM_API_GATEWAY_HTTP_URL=/);
  }
});

test("root package.json wires @sdkwork/app-topology and standard dev scripts", async () => {
  const packageJson = await readJson("package.json");
  assert.equal(packageJson.dependencies["@sdkwork/app-topology"], "file:../sdkwork-app-topology");
  assert.match(packageJson.scripts["dev:server"], /dev:server:postgres:standalone/);
  assert.match(packageJson.scripts["topology:validate"], /sdkwork-topology\.mjs validate/);
  assert.match(packageJson.scripts["test"], /test:topology/);
});

test("declares cloud gateway config bundles referenced by topology spec", async () => {
  const spec = await readJson("specs/topology.spec.json");
  for (const configFile of spec.packaging.cloudConfigFiles) {
    const configPath = path.join("configs", configFile);
    assert.equal(await exists(configPath), true, `${configPath} should exist`);
  }
});

test("documents dev orchestrator loads topology profile env", async () => {
  const devScript = await read("scripts/documents-dev.mjs");
  assert.match(devScript, /listOrchestrationProcesses/);
  assert.match(devScript, /partitionOrchestrationProcesses/);
  assert.doesNotMatch(devScript, /createPlatformGatewayProcess/);
  assert.match(devScript, /SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE/);
  assert.match(devScript, /SDKWORK_DOCUMENTS_SERVICE_LAYOUT/);
  assert.match(devScript, /DEFAULT_API_SERVER_CRATE/);
  assert.match(devScript, /processDef\.binary/);
  assert.match(devScript, /partitionOrchestrationProcesses/);
  assert.match(devScript, /isRendererProcess/);
  assert.match(devScript, /browser-only/);
  assert.match(devScript, /loadEnvFile/);
  assert.match(devScript, /resolveIamDevEnv/);
  assert.match(devScript, /IAM_APPLICATION_BOOTSTRAP_ENV/);
  assert.doesNotMatch(devScript, /--hosting/);
  assert.doesNotMatch(devScript, /self-hosted|cloud-hosted/);
});

test("root package.json wires browser dev through topology orchestrator", async () => {
  const packageJson = await readJson("package.json");
  assert.match(
    packageJson.scripts["dev:browser:postgres:standalone"],
    /documents-dev\.mjs --target browser/,
  );
});

test("topology standard documents PC browser dev surface", async () => {
  const topologyDoc = await read("docs/topology-standard.md");
  assert.match(topologyDoc, /pnpm dev:browser/);
  assert.match(topologyDoc, /3902/);
});

test("standalone development orchestration declares pc-renderer process", async () => {
  const spec = await readJson("specs/topology.spec.json");
  const processes =
    spec.orchestration?.profiles?.["standalone.development"]?.processes ?? [];
  const pcRenderer = processes.find((entry) => entry.id === "pc-renderer");
  assert.ok(pcRenderer, "standalone development profile must declare pc-renderer");
  assert.equal(pcRenderer.package, "apps/sdkwork-documents-pc");
  assert.equal(pcRenderer.script, "dev");
});

test("cloud split-services orchestration maps each HTTP surface to its canonical binary", async () => {
  const spec = await readJson("specs/topology.spec.json");
  const components = spec.components ?? {};
  const processes =
    spec.orchestration?.profiles?.["cloud.development"]?.processes ?? [];

  const expectedBySurface = {
    "application.public-ingress": components.appApiRouter?.binary,
    "application.backend-http": components.backendApiRouter?.binary,
    "application.open-http": components.openApiRouter?.binary,
  };

  for (const [surfaceId, expectedBinary] of Object.entries(expectedBySurface)) {
    assert.equal(typeof expectedBinary, "string", `${surfaceId} component binary must be declared`);
    const processDef = processes.find((entry) => entry.id === surfaceId);
    assert.ok(processDef, `${surfaceId} must be declared in cloud split-services orchestration`);
    assert.equal(
      processDef.binary,
      expectedBinary,
      `${surfaceId} must launch ${expectedBinary}`,
    );
  }
});

test("api authority materializer and patch scripts exist", async () => {
  assert.equal(await exists("tools/materialize-apis-authority.mjs"), true);
  assert.equal(await exists("tools/patch-route-manifest-extensions.mjs"), true);
});
