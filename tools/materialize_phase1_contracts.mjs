#!/usr/bin/env node
/**
 * Materialize SDKWork Documents phase-1 contract skeleton.
 * Run: node tools/materialize_phase1_contracts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", default: false },
  },
});

const root = process.cwd();
const owner = "sdkwork-documents";
const domain = "content";
const capability = "documents";
const version = "0.1.0";
const standardVersion = "2026-06-20";
const openPrefix = "/doc/v3/api";
const openSchemaUrl = "/doc/v3/openapi.json";
const appPrefix = "/app/v3/api";
const appSchemaUrl = "/app/v3/openapi.json";
const backendPrefix = "/backend/v3/api";
const backendSchemaUrl = "/backend/v3/openapi.json";

const PHASE1_REQUIRED_ARTIFACTS = [
  "AGENTS.md",
  "sdkwork.app.config.json",
  "sdkwork.workflow.json",
  "specs/component.spec.json",
  "apis/authority-manifest.json",
  "database/database.manifest.json",
  "configs/topology/standalone.unified-process.development.env",
  "scripts/documents-dev.mjs",
  "sdks/_route-manifests/open-api/sdkwork-router-documents-open-api.route-manifest.json",
  "sdks/_route-manifests/app-api/sdkwork-router-documents-app-api.route-manifest.json",
  "sdks/_route-manifests/backend-api/sdkwork-router-documents-backend-api.route-manifest.json",
  "sdks/sdkwork-documents-sdk/.sdkwork-assembly.json",
  "sdks/sdkwork-documents-sdk/sdk-manifest.json",
  "sdks/sdkwork-documents-sdk/openapi/documents-open-api.openapi.json",
  "sdks/sdkwork-documents-app-sdk/.sdkwork-assembly.json",
  "sdks/sdkwork-documents-app-sdk/sdk-manifest.json",
  "sdks/sdkwork-documents-app-sdk/openapi/documents-app-api.openapi.json",
  "sdks/sdkwork-documents-backend-sdk/.sdkwork-assembly.json",
  "sdks/sdkwork-documents-backend-sdk/sdk-manifest.json",
  "sdks/sdkwork-documents-backend-sdk/openapi/documents-backend-api.openapi.json",
];

if (values.check) {
  const missing = PHASE1_REQUIRED_ARTIFACTS.filter(
    (relativePath) => !fs.existsSync(path.join(root, relativePath)),
  );
  if (missing.length > 0) {
    console.error(
      `Documents phase1 contract check failed:\n${missing.map((item) => `- ${item}`).join("\n")}`,
    );
    process.exit(1);
  }
  console.log("Documents phase1 contract check passed.");
  process.exit(0);
}

function writeText(relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.replace(/\r\n/g, "\n"), "utf8");
  console.log(`wrote ${relativePath}`);
}

function writeTextIfMissing(relativePath, content) {
  const target = path.join(root, relativePath);
  if (fs.existsSync(target)) {
    return;
  }
  writeText(relativePath, content);
}

function writeJson(relativePath, value) {
  writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function problemResponseRef() {
  return {
    description: "Problem detail",
    content: {
      "application/problem+json": {
        schema: { $ref: "#/components/schemas/ProblemDetails" },
      },
    },
  };
}

function problemResponses() {
  const statuses = ["400", "401", "403", "404", "409", "422", "429", "500"];
  const out = {};
  for (const status of statuses) {
    out[status] = problemResponseRef();
  }
  return out;
}

function openApiSecuritySchemes(authMode) {
  if (authMode === "api-key") {
    return {
      ApiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Open API credential",
      },
    };
  }
  return {
    AuthToken: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    AccessToken: {
      type: "apiKey",
      in: "header",
      name: "Access-Token",
      description: "Session access token",
    },
  };
}

function operationSecurity(authMode) {
  if (authMode === "api-key") {
    return [{ ApiKey: [] }];
  }
  return [{ AuthToken: [], AccessToken: [] }];
}

function operationMeta({
  operationId,
  authority,
  sdkFamily,
  apiSurface,
  authMode,
  permission,
  auditEvent,
  idempotent = false,
}) {
  const meta = {
    operationId,
    tags: [capability],
    "x-sdkwork-owner": owner,
    "x-sdkwork-api-authority": authority,
    "x-sdkwork-sdk-family": sdkFamily,
    "x-sdkwork-api-surface": apiSurface,
    "x-sdkwork-request-context": "WebRequestContext",
    "x-sdkwork-auth-mode": authMode,
    "x-sdkwork-permission": permission,
    "x-sdkwork-audit-event": auditEvent,
    security: operationSecurity(authMode),
    responses: {
      "200": {
        description: "OK",
        content: { "application/json": { schema: { type: "object" } } },
      },
      ...problemResponses(),
    },
  };
  if (idempotent) {
    meta["x-sdkwork-idempotent"] = true;
    meta.parameters = [
      ...(meta.parameters ?? []),
      {
        name: "Idempotency-Key",
        in: "header",
        required: true,
        schema: { type: "string" },
      },
    ];
  }
  return meta;
}

function buildOpenApi({ title, authority, sdkFamily, apiSurface, authMode, paths }) {
  return {
    openapi: "3.1.2",
    info: { title, version },
    servers: [
      { url: "https://api.sdkwork.com", description: "SDKWork production API" },
      { url: "http://localhost:8080", description: "Local/private API" },
    ],
    "x-sdkwork-owner": owner,
    "x-sdkwork-domain": domain,
    "x-sdkwork-capability": capability,
    "x-sdkwork-api-authority": authority,
    "x-sdkwork-sdk-family": sdkFamily,
    paths,
    components: {
      securitySchemes: openApiSecuritySchemes(authMode),
      schemas: {
        ProblemDetails: {
          type: "object",
          required: ["type", "title", "status"],
          properties: {
            type: { type: "string", format: "uri" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
            instance: { type: "string", format: "uri" },
          },
        },
        DocumentCapabilities: {
          type: "object",
          required: ["version", "supportedFormats"],
          properties: {
            version: { type: "string" },
            supportedFormats: { type: "array", items: { type: "string" } },
          },
        },
        Document: {
          type: "object",
          required: ["id", "title", "status"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            status: { type: "string" },
            body: { type: "string" },
          },
        },
        DocumentCreateRequest: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
          },
        },
        DocumentUpdateRequest: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            status: { type: "string" },
          },
        },
        DocumentList: {
          type: "object",
          required: ["items"],
          properties: {
            items: { type: "array", items: { $ref: "#/components/schemas/Document" } },
          },
        },
      },
    },
  };
}

const openPaths = {
  [`${openPrefix}/documents/capabilities`]: {
    get: {
      ...operationMeta({
        operationId: "capabilities.retrieve",
        authority: "sdkwork-documents-open-api",
        sdkFamily: "sdkwork-documents-sdk",
        apiSurface: "open-api",
        authMode: "api-key",
        permission: "documents.capabilities.read",
        auditEvent: "documents.capabilities.retrieved",
      }),
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentCapabilities" },
            },
          },
        },
        ...problemResponses(),
      },
    },
  },
  [`${openPrefix}/documents`]: {
    get: {
      ...operationMeta({
        operationId: "documents.list",
        authority: "sdkwork-documents-open-api",
        sdkFamily: "sdkwork-documents-sdk",
        apiSurface: "open-api",
        authMode: "api-key",
        permission: "documents.read",
        auditEvent: "documents.listed",
      }),
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentList" },
            },
          },
        },
        ...problemResponses(),
      },
    },
  },
  [`${openPrefix}/documents/{documentId}`]: {
    get: {
      ...operationMeta({
        operationId: "documents.retrieve",
        authority: "sdkwork-documents-open-api",
        sdkFamily: "sdkwork-documents-sdk",
        apiSurface: "open-api",
        authMode: "api-key",
        permission: "documents.read",
        auditEvent: "documents.retrieved",
      }),
      parameters: [
        {
          name: "documentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
  },
};

const appPaths = {
  [`${appPrefix}/documents`]: {
    get: {
      ...operationMeta({
        operationId: "documents.list",
        authority: "sdkwork-documents.app",
        sdkFamily: "sdkwork-documents-app-sdk",
        apiSurface: "app-api",
        authMode: "dual-token",
        permission: "documents.read",
        auditEvent: "documents.listed",
      }),
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentList" },
            },
          },
        },
        ...problemResponses(),
      },
    },
    post: {
      ...operationMeta({
        operationId: "documents.create",
        authority: "sdkwork-documents.app",
        sdkFamily: "sdkwork-documents-app-sdk",
        apiSurface: "app-api",
        authMode: "dual-token",
        permission: "documents.write",
        auditEvent: "documents.created",
        idempotent: true,
      }),
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DocumentCreateRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
  },
  [`${appPrefix}/documents/{documentId}`]: {
    get: {
      ...operationMeta({
        operationId: "documents.retrieve",
        authority: "sdkwork-documents.app",
        sdkFamily: "sdkwork-documents-app-sdk",
        apiSurface: "app-api",
        authMode: "dual-token",
        permission: "documents.read",
        auditEvent: "documents.retrieved",
      }),
      parameters: [
        {
          name: "documentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
    patch: {
      ...operationMeta({
        operationId: "documents.update",
        authority: "sdkwork-documents.app",
        sdkFamily: "sdkwork-documents-app-sdk",
        apiSurface: "app-api",
        authMode: "dual-token",
        permission: "documents.write",
        auditEvent: "documents.updated",
      }),
      parameters: [
        {
          name: "documentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DocumentUpdateRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
  },
};

const backendPaths = {
  [`${backendPrefix}/documents`]: {
    get: {
      ...operationMeta({
        operationId: "documents.list",
        authority: "sdkwork-documents.backend",
        sdkFamily: "sdkwork-documents-backend-sdk",
        apiSurface: "backend-api",
        authMode: "dual-token",
        permission: "documents.admin.read",
        auditEvent: "documents.admin.listed",
      }),
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentList" },
            },
          },
        },
        ...problemResponses(),
      },
    },
    post: {
      ...operationMeta({
        operationId: "documents.create",
        authority: "sdkwork-documents.backend",
        sdkFamily: "sdkwork-documents-backend-sdk",
        apiSurface: "backend-api",
        authMode: "dual-token",
        permission: "documents.admin.write",
        auditEvent: "documents.admin.created",
        idempotent: true,
      }),
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DocumentCreateRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
  },
  [`${backendPrefix}/documents/{documentId}`]: {
    get: {
      ...operationMeta({
        operationId: "documents.retrieve",
        authority: "sdkwork-documents.backend",
        sdkFamily: "sdkwork-documents-backend-sdk",
        apiSurface: "backend-api",
        authMode: "dual-token",
        permission: "documents.admin.read",
        auditEvent: "documents.admin.retrieved",
      }),
      parameters: [
        {
          name: "documentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
    patch: {
      ...operationMeta({
        operationId: "documents.update",
        authority: "sdkwork-documents.backend",
        sdkFamily: "sdkwork-documents-backend-sdk",
        apiSurface: "backend-api",
        authMode: "dual-token",
        permission: "documents.admin.write",
        auditEvent: "documents.admin.updated",
      }),
      parameters: [
        {
          name: "documentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DocumentUpdateRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Document" },
            },
          },
        },
        ...problemResponses(),
      },
    },
    delete: {
      ...operationMeta({
        operationId: "documents.delete",
        authority: "sdkwork-documents.backend",
        sdkFamily: "sdkwork-documents-backend-sdk",
        apiSurface: "backend-api",
        authMode: "dual-token",
        permission: "documents.admin.delete",
        auditEvent: "documents.admin.deleted",
      }),
      parameters: [
        {
          name: "documentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "204": { description: "No Content" },
        ...problemResponses(),
      },
    },
  },
};

const openApiOpen = buildOpenApi({
  title: "SDKWork Documents Open API",
  authority: "sdkwork-documents-open-api",
  sdkFamily: "sdkwork-documents-sdk",
  apiSurface: "open-api",
  authMode: "api-key",
  paths: openPaths,
});
const openApiApp = buildOpenApi({
  title: "SDKWork Documents App API",
  authority: "sdkwork-documents.app",
  sdkFamily: "sdkwork-documents-app-sdk",
  apiSurface: "app-api",
  authMode: "dual-token",
  paths: appPaths,
});
const openApiBackend = buildOpenApi({
  title: "SDKWork Documents Backend API",
  authority: "sdkwork-documents.backend",
  sdkFamily: "sdkwork-documents-backend-sdk",
  apiSurface: "backend-api",
  authMode: "dual-token",
  paths: backendPaths,
});

function routeManifest(surface, crateName, authority, sdkFamily, prefix, openApiPath, routes) {
  return {
    schemaVersion: 1,
    kind: "sdkwork.route.manifest",
    packageName: crateName,
    surface,
    owner,
    domain,
    capability,
    apiAuthority: authority,
    sdkFamily,
    prefix,
    source: {
      crateRoot: `crates/${crateName}`,
      crateImport: crateName.replaceAll("-", "_"),
      openApiAuthority: openApiPath,
    },
    routes,
  };
}

function manifestRoutes(openApiSpec, authMode) {
  const routes = [];
  for (const [routePath, methods] of Object.entries(openApiSpec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation.operationId) continue;
      routes.push({
        method: method.toUpperCase(),
        path: routePath,
        operationId: operation.operationId,
        tags: operation.tags ?? [capability],
        auth: {
          mode: authMode === "api-key" ? "api-key" : "dual-token",
          required: true,
        },
        handler: { module: "crate::routes", name: null },
        ownership: { owner, apiAuthority: operation["x-sdkwork-api-authority"] },
        requestContext: "WebRequestContext",
        apiSurface: operation["x-sdkwork-api-surface"],
      });
    }
  }
  return routes;
}

const platformSdkDependencies = [
  {
    workspace: "sdkwork-web-framework",
    role: "http-web-framework-runtime",
    required: true,
    dependencyMode: "platform-framework",
    generatedTransportImportPolicy: "forbidden",
  },
  {
    workspace: "sdkwork-database",
    role: "database-runtime",
    required: true,
    dependencyMode: "platform-framework",
    generatedTransportImportPolicy: "forbidden",
  },
  {
    workspace: "sdkwork-utils",
    role: "cross-language-utility-runtime",
    required: true,
    dependencyMode: "platform-framework",
    generatedTransportImportPolicy: "forbidden",
  },
  {
    workspace: "sdkwork-appbase",
    role: "appbase-platform-runtime",
    required: true,
    dependencyMode: "platform-framework",
    generatedTransportImportPolicy: "forbidden",
  },
  {
    workspace: "sdkwork-sdk-generator",
    role: "sdk-generation-tooling",
    required: true,
    dependencyMode: "platform-tooling",
    generatedTransportImportPolicy: "forbidden",
  },
];

function sdkFamilyAssembly({ sdkFamily, authority, prefix, schemaUrl, specFile, clientName }) {
  return {
    schemaVersion: 1,
    kind: "sdkwork.sdk.assembly",
    sdkOwner: owner,
    sdkFamily,
    apiAuthority: authority,
    generationInputSpec: specFile,
    discoverySurface: { apiPrefix: prefix, schemaUrl },
    languages: ["typescript", "rust", "java"],
    metadata: { managedBy: "tools/materialize_phase1_contracts.mjs" },
  };
}

function sdkManifest({ sdkFamily, authority, prefix, specFile, clientName }) {
  return {
    schemaVersion: 1,
    kind: "sdkwork.sdk.manifest",
    sdkFamily,
    sdkOwner: owner,
    domain,
    capability,
    apiAuthority: authority,
    apiPrefix: prefix,
    generationInputSpec: specFile,
    sdkClients: [clientName],
    metadata: { version, managedBy: "tools/materialize_phase1_contracts.mjs" },
  };
}

const sdkFamilies = [
  {
    dir: "sdks/sdkwork-documents-sdk",
    authority: "sdkwork-documents-open-api",
    prefix: openPrefix,
    schemaUrl: openSchemaUrl,
    specFile: "openapi/documents-open-api.openapi.json",
    client: "SdkworkDocumentsOpenClient",
    openApi: openApiOpen,
    surface: "open-api",
    crate: "sdkwork-router-documents-open-api",
    authMode: "api-key",
  },
  {
    dir: "sdks/sdkwork-documents-app-sdk",
    authority: "sdkwork-documents.app",
    prefix: appPrefix,
    schemaUrl: appSchemaUrl,
    specFile: "openapi/documents-app-api.openapi.json",
    client: "SdkworkDocumentsAppClient",
    openApi: openApiApp,
    surface: "app-api",
    crate: "sdkwork-router-documents-app-api",
    authMode: "dual-token",
  },
  {
    dir: "sdks/sdkwork-documents-backend-sdk",
    authority: "sdkwork-documents.backend",
    prefix: backendPrefix,
    schemaUrl: backendSchemaUrl,
    specFile: "openapi/documents-backend-api.openapi.json",
    client: "SdkworkDocumentsBackendClient",
    openApi: openApiBackend,
    surface: "backend-api",
    crate: "sdkwork-router-documents-backend-api",
    authMode: "dual-token",
  },
];

for (const family of sdkFamilies) {
  writeJson(`${family.dir}/openapi/${path.basename(family.specFile)}`, family.openApi);
  writeJson(
    `${family.dir}/.sdkwork-assembly.json`,
    sdkFamilyAssembly({
      sdkFamily: path.basename(family.dir),
      authority: family.authority,
      prefix: family.prefix,
      schemaUrl: family.schemaUrl,
      specFile: family.specFile,
      clientName: family.client,
    }),
  );
  writeJson(
    `${family.dir}/sdk-manifest.json`,
    sdkManifest({
      sdkFamily: path.basename(family.dir),
      authority: family.authority,
      prefix: family.prefix,
      specFile: family.specFile,
      clientName: family.client,
    }),
  );
  writeText(
    `${family.dir}/README.md`,
    `# ${path.basename(family.dir)}\n\nOwner: ${owner}\nAuthority: ${family.authority}\n`,
  );
  writeText(`${family.dir}/specs/README.md`, `# ${path.basename(family.dir)} component specs\n`);
  writeJson(`${family.dir}/specs/component.spec.json`, {
    schemaVersion: 1,
    kind: "sdkwork.component.spec",
    component: {
      name: path.basename(family.dir),
      type: "sdk-family",
      domain,
      capability,
      owner,
    },
    contracts: {
      sdkClients: [family.client],
      sdkDependencies: platformSdkDependencies,
      dependencyApiExports: [],
      dependencyApiSurfaces: [],
    },
  });

  const routeManifestPath = `sdks/_route-manifests/${family.surface}/${family.crate}.route-manifest.json`;
  writeJson(
    routeManifestPath,
    routeManifest(
      family.surface,
      family.crate,
      family.authority,
      path.basename(family.dir),
      family.prefix,
      `${family.dir}/${family.specFile}`,
      manifestRoutes(family.openApi, family.authMode),
    ),
  );
}

writeJson("specs/component.spec.json", {
  schemaVersion: 1,
  kind: "sdkwork.component.spec",
  component: {
    name: owner,
    displayName: "SDKWork Documents",
    version,
    type: "web-backend-service",
    root: owner,
    domain,
    capability,
    surface: "backend-service",
    languages: ["rust", "typescript"],
    generated: false,
    status: "draft",
    manifests: [
      "sdkwork.app.config.json",
      "AGENTS.md",
      "specs/component.spec.json",
      ...sdkFamilies.map((f) => `${f.dir}/.sdkwork-assembly.json`),
    ],
  },
  canonicalSpecs: [
    { file: "WEB_FRAMEWORK_SPEC.md", path: "../sdkwork-specs/WEB_FRAMEWORK_SPEC.md" },
    { file: "WEB_BACKEND_SPEC.md", path: "../sdkwork-specs/WEB_BACKEND_SPEC.md" },
    { file: "DATABASE_SPEC.md", path: "../sdkwork-specs/DATABASE_SPEC.md" },
    { file: "DATABASE_FRAMEWORK_SPEC.md", path: "../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md" },
    { file: "DEPLOYMENT_SPEC.md", path: "../sdkwork-specs/DEPLOYMENT_SPEC.md" },
    { file: "API_SPEC.md", path: "../sdkwork-specs/API_SPEC.md" },
    { file: "SDK_SPEC.md", path: "../sdkwork-specs/SDK_SPEC.md" },
    { file: "SDK_WORKSPACE_GENERATION_SPEC.md", path: "../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md" },
    { file: "TEST_SPEC.md", path: "../sdkwork-specs/TEST_SPEC.md" },
  ],
  contracts: {
    apiAuthorities: sdkFamilies.map((f) => ({
      name: f.authority,
      prefix: f.prefix,
      authorityOpenApi: `${f.dir}/${f.specFile}`,
      sdkFamily: path.basename(f.dir),
    })),
    sdkClients: sdkFamilies.map((f) => f.client),
    sdkDependencies: platformSdkDependencies,
    runtimeEntrypoints: [
      "sdkwork-documents-app-api",
      "sdkwork-documents-backend-api",
      "sdkwork-documents-open-api",
      "crates/sdkwork-router-documents-app-api/src/runtime.rs",
    ],
    configKeys: [
      "SDKWORK_DOCUMENTS_DATABASE_URL",
      "SDKWORK_DOCUMENTS_TENANT_ID",
      "SDKWORK_DOCUMENTS_USER_ID",
      "SDKWORK_DOCUMENTS_OPERATOR_ID",
      "SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_BIND",
      "SDKWORK_DOCUMENTS_APPLICATION_BACKEND_HTTP_BIND",
      "SDKWORK_DOCUMENTS_APPLICATION_OPEN_HTTP_BIND",
      "SDKWORK_DOCUMENTS_DEV_AUTH_BYPASS",
    ],
    dependencyApiExports: [],
    dependencyApiSurfaces: [],
    events: ["documents.document.created", "documents.document.updated", "documents.document.deleted"],
  },
  verification: {
    commands: [
      "pnpm verify",
      "node sdks/test/verify-sdk-ownership-boundaries.test.mjs",
    ],
  },
  metadata: { standardVersion, managedBy: "tools/materialize_phase1_contracts.mjs" },
});

if (!fs.existsSync(path.join(root, "specs/topology.spec.json"))) {
  writeJson("specs/topology.spec.json", {
    schemaVersion: 2,
    kind: "sdkwork.app.topology",
    appId: owner,
    archetype: "application-http-gateway",
    profileRoot: "configs/topology",
    profilePattern: "{deploymentProfile}.{serviceLayout}.{environment}.env",
  });
}

writeJson("database/database.manifest.json", {
  schemaVersion: 1,
  kind: "sdkwork.database.module",
  moduleId: "documents",
  serviceCode: "DOCUMENTS",
  displayName: "Documents Database",
  owner: "documents-platform",
  engines: ["postgres", "sqlite"],
  defaultEngine: "postgres",
  tablePrefix: "documents_",
  contractVersion: "1.0.0",
  baselineStrategy: "baseline-plus-migrations",
  modules: [],
  lifecycle: {
    autoMigrate: true,
    seedOnBoot: false,
    defaultSeedLocale: "zh-CN",
    defaultSeedProfile: "standard",
    supportedSeedLocales: ["zh-CN", "en-US", "ja-JP", "de-DE", "fr-FR", "ru-RU", "ko-KR"],
    activeSeedLocales: ["zh-CN"],
    driftCheckIntervalSec: 60,
  },
  paths: {
    contract: "contract/schema.yaml",
    migrations: "migrations",
    seeds: "seeds",
    driftPolicy: "drift/policy.yaml",
  },
  spi: { provider: "default", hooks: [] },
});

writeText(
  "database/contract/schema.yaml",
  `schema_version: 1
kind: sdkwork.database.schema
module_id: documents
contract_version: 1.0.0
owner_team: documents-platform
compliance_level: L2
engines:
  - postgres
  - sqlite
table_prefix: documents_
tables:
  - name: documents_document
    lifecycle_status: active
    owner: documents-platform
  - name: documents_revision
    lifecycle_status: active
    owner: documents-platform
  - name: documents_audit_log
    lifecycle_status: active
    owner: documents-platform
`,
);

writeJson("database/contract/prefix-registry.json", {
  schemaVersion: 1,
  prefixes: [{ prefix: "documents_", owner: "documents-platform" }],
});
writeJson("database/contract/table-registry.json", {
  schemaVersion: 1,
  tables: [
    { name: "documents_document", prefix: "documents_", owner: "documents-platform" },
    { name: "documents_revision", prefix: "documents_", owner: "documents-platform" },
    { name: "documents_audit_log", prefix: "documents_", owner: "documents-platform" },
  ],
});

writeText(
  "database/ddl/baseline/postgres/0001_documents_baseline.sql",
  `-- SDKWork Documents baseline DDL
CREATE TABLE IF NOT EXISTS documents_document (
  id UUID PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_document_tenant ON documents_document (tenant_id);

CREATE TABLE IF NOT EXISTS documents_revision (
  id UUID PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  document_id UUID NOT NULL,
  revision_number BIGINT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_revision_tenant ON documents_revision (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_revision_document ON documents_revision (document_id);

CREATE TABLE IF NOT EXISTS documents_audit_log (
  id UUID PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  document_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id BIGINT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_tenant ON documents_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_document ON documents_audit_log (document_id);
`,
);

writeText(
  "database/ddl/baseline/sqlite/0001_documents_baseline.sql",
  `-- SDKWork Documents baseline DDL (sqlite)
CREATE TABLE IF NOT EXISTS documents_document (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_document_tenant ON documents_document (tenant_id);

CREATE TABLE IF NOT EXISTS documents_revision (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id INTEGER NOT NULL,
  document_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_revision_tenant ON documents_revision (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_revision_document ON documents_revision (document_id);

CREATE TABLE IF NOT EXISTS documents_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id INTEGER NOT NULL,
  document_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_tenant ON documents_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_document ON documents_audit_log (document_id);
`,
);

const seedLocales = ["zh-CN", "en-US", "ja-JP", "de-DE", "fr-FR", "ru-RU", "ko-KR"];

writeJson("database/seeds/seed.manifest.json", {
  schemaVersion: 1,
  kind: "sdkwork.database.seed",
  defaultLocale: "zh-CN",
  supportedLocales: seedLocales,
  activeLocales: ["zh-CN"],
  profiles: {
    minimal: {
      common: [],
      locales: {
        "zh-CN": [],
      },
    },
    standard: {
      common: ["common/001_bootstrap.sql"],
      locales: {
        "zh-CN": [],
      },
    },
  },
});
writeText("database/seeds/common/001_bootstrap.sql", "-- documents seed placeholder\n");
writeText("database/drift/policy.yaml", "drift_policy_version: 1\nmode: observe\n");

writeText(
  "database/README.md",
  `# Documents Database Module

Canonical lifecycle assets for \`sdkwork-documents\` per \`DATABASE_FRAMEWORK_SPEC.md\`.

- moduleId: \`documents\`
- serviceCode: \`DOCUMENTS\`
- tablePrefix: \`documents_\`

## Commands

\`\`\`bash
pnpm run db:validate
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
\`\`\`

Runtime services MUST create pools through \`sdkwork-database-sqlx\` and register \`DefaultDatabaseModule\` at bootstrap via \`sdkwork-documents-database-host\`.
`,
);
writeText(
  "database/migrations/postgres/README.md",
  "# PostgreSQL migrations\n\nAdd versioned SQL files using `{version}_{name}.up.sql` and matching `{version}_{name}.down.sql`.\n",
);
writeText(
  "database/migrations/sqlite/README.md",
  "# SQLite migrations\n\nAdd versioned SQL files using `{version}_{name}.up.sql` and matching `{version}_{name}.down.sql`.\n",
);
writeText(
  "database/ddl/baseline/postgres/README.md",
  "# PostgreSQL baseline DDL\n\nBaseline snapshots for bootstrap review before versioned migrations are split out.\n",
);
writeText(
  "database/ddl/baseline/sqlite/README.md",
  "# SQLite baseline DDL\n\nOptional full baseline snapshots when `baselineStrategy` is not `migrations-only`.\n",
);
writeText(
  "database/ddl/generated/README.md",
  "# Generated DDL\n\nContract-derived DDL output. Do not hand-edit unless your workflow explicitly allows it.\n",
);
writeText(
  "database/fixtures/README.md",
  "# Database fixtures\n\nNon-production SQL or data files for local verification and tests.\n",
);
writeText(
  "database/seeds/common/README.md",
  "# Common seeds\n\nShared seed SQL referenced from `seeds/seed.manifest.json`.\n",
);
writeText(
  "database/seeds/locales/README.md",
  "# Locale seeds\n\nLocale-specific seed SQL referenced from `seeds/seed.manifest.json`.\n",
);
for (const locale of seedLocales) {
  writeText(
    `database/seeds/locales/${locale}/README.md`,
    `# ${locale} locale seeds\n\nAdd locale-specific seed SQL referenced from \`seeds/seed.manifest.json\`.\n`,
  );
}

writeText(
  "docs/schema-registry/README.md",
  "# Documents schema registry\n\nSee `database/contract/schema.yaml` for authoritative table contract.\n",
);
writeText(
  "docs/schema-registry/tables/001-documents-core.yaml",
  `module: documents
owner: sdkwork-documents
table: documents_document
description: Primary document record
`,
);

writeTextIfMissing(
  "docs/superpowers/specs/2026-06-20-documents-architecture-design.md",
  `# SDKWork Documents Architecture Design

## Scope
Documents service for structured document storage, retrieval, and publishing.

## Open API Contract Draft
Public read surfaces under ${openPrefix}.

## App API Contract Draft
Authenticated app surfaces under ${appPrefix}.

## Backend API Contract Draft
Operator surfaces under ${backendPrefix}.

## Database And Storage Design
Tables use documents_ prefix: documents_document, documents_revision, documents_audit_log.

## Framework Integration
- sdkwork-web-framework for HTTP *-api surfaces
- sdkwork-database for lifecycle SPI
- sdkwork-utils for cross-language utility helpers (id, validation)
- sdkwork-discovery deferred until RPC services exist
`,
);

const readmeDirs = [
  "apis/README.md",
  "apps/README.md",
  "crates/README.md",
  "sdks/README.md",
  "deployments/docker/README.md",
  "deployments/kubernetes/README.md",
  "deployments/runbooks/README.md",
  "configs/README.md",
  "scripts/README.md",
  "docs/README.md",
  "tests/README.md",
  "database/README.md",
  "examples/README.md",
  "jobs/README.md",
  "tools/README.md",
  "plugins/README.md",
  "specs/README.md",
  "apis/open-api/content/documents/README.md",
  "apis/app-api/content/documents/README.md",
  "apis/backend-api/content/documents/README.md",
  "apis/rpc/README.md",
  ".sdkwork/README.md",
  ".sdkwork/skills/README.md",
  ".sdkwork/plugins/README.md",
];

for (const rel of readmeDirs) {
  if (!fs.existsSync(path.join(root, rel))) {
    writeText(rel, `# ${path.basename(path.dirname(rel)) || rel}\n\nOwner: ${owner}\n`);
  }
}

console.log("Documents phase1 contracts materialized.");
