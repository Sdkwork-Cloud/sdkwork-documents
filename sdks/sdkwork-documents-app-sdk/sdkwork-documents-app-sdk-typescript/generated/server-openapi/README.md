# sdkwork-documents-app-sdk

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
npm install @sdkwork/documents-app-sdk
# or
yarn add @sdkwork/documents-app-sdk
# or
pnpm add @sdkwork/documents-app-sdk
```

## Quick Start

```typescript
import { SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';

const client = new SdkworkDocumentsAppClient({
  baseUrl: 'https://api.sdkwork.com',
  timeout: 30000,
});

// Authentication
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
const result = await client.documents.list();
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```typescript
import { SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';

const client = new SdkworkDocumentsAppClient({
  baseUrl: 'https://api.sdkwork.com',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.documents` - documents API
- `client.sdkReference` - sdk_reference API

## Usage Examples

### documents

```typescript
// GET /app/v3/api/documents
const result = await client.documents.list();
```

### sdk_reference

```typescript
// Generate SDK archive
const body = {
  config: {
    apiPrefix: 'apiPrefix',
    apiSpecPath: 'apiSpecPath',
    author: 'author',
    baseUrl: 'baseUrl',
    description: 'description',
    language: 'language',
    license: 'license',
    name: 'name',
    outputPath: 'outputPath',
    packageName: 'packageName',
    sdkType: 'app',
    version: 'version',
  },
  language: 'language',
  spec: {
    value: 'value',
  },
};
const result = await client.sdkReference.archives.create(body);
```

## Error Handling

```typescript
import { SdkworkDocumentsAppClient, NetworkError, TimeoutError, AuthenticationError } from '@sdkwork/documents-app-sdk';

try {
  const result = await client.documents.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
}
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

### Check

```bash
./bin/publish.sh --action check
```

### Publish

```bash
./bin/publish.sh --action publish --channel release
```

```powershell
.\bin\publish.ps1 --action publish --channel test --dry-run
```

> Configure npm registry credentials before release publish.

## License

MIT

## Regeneration Contract

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.
