# SDKWork Documents Runtime Topology

This repository adopts the shared SDKWork runtime topology framework.

- Platform standard: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`
- Naming authority: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_NAMING.md`
- Adoption guide: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md`
- Framework: `../sdkwork-app-topology`

## Archetype

`application-http-gateway`: Documents exposes application HTTP surfaces through `sdkwork-routes-documents-*` route crates. Cloud profiles route through `platform.api-gateway`.

## Default Dev Profile

`standalone.development`

```bash
pnpm dev:server
pnpm dev:browser
pnpm topology:validate
```

`pnpm dev:browser` starts the topology-aware backend orchestration, waits for health checks, then launches the PC Vite dev server. Use `pnpm dev:browser:postgres:standalone:local` when the backend is already running.

## Local URLs

### Default dev profile (`standalone.development`)

| Surface | URL |
| --- | --- |
| `application.public-ingress` | http://127.0.0.1:18084 |
| `application.browser-pc` | http://127.0.0.1:3902 |

### Cloud development profile (`cloud.development`)

| Surface | URL |
| --- | --- |
| `application.public-ingress` | http://127.0.0.1:18084 |
| `application.backend-http` | http://127.0.0.1:18085 |
| `application.open-http` | http://127.0.0.1:18086 |
| `platform.api-gateway` | http://127.0.0.1:3900 |

Client env keys:

- `VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE`: browser-visible deployment profile.
- `VITE_SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_URL`: app SDK surface.
- `VITE_SDKWORK_DOCUMENTS_APPLICATION_BACKEND_HTTP_URL`: backend SDK surface.
- `VITE_SDKWORK_DOCUMENTS_APPLICATION_OPEN_HTTP_URL`: open SDK surface.
- `VITE_SDKWORK_DOCUMENTS_PLATFORM_API_GATEWAY_HTTP_URL`: platform gateway surface.

Profile values live in `etc/topology/*.env` only.

Cloud gateway config bundles:

- `configs/sdkwork-api-cloud-gateway.documents.development.toml`
- `configs/sdkwork-api-cloud-gateway.documents.production.toml`
