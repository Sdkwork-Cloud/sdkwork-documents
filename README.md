# SDKWork Documents

SDKWork Documents is the content-domain document storage and delivery service.

## Active Root Layout

| Directory | Purpose |
| --- | --- |
| `apis/` | Authoritative OpenAPI contracts and authority manifest |
| `apps/` | Reserved for future client application roots |
| `crates/` | Rust service, repository, route, and API server crates |
| `sdks/` | SDK family workspaces and route manifests |
| `database/` | Database contract, baseline DDL, migrations, seeds |
| `deployments/` | Container and Kubernetes deployment descriptors |
| `configs/` | Safe checked-in runtime config templates |
| `scripts/` | Thin command entrypoints |
| `docs/` | Architecture notes, schema registry, runbooks |
| `tests/` | Cross-package contract and integration tests |
| `tools/` | Contract materialization and architecture validators |
| `.sdkwork/` | Repository workspace metadata |

Inactive standard directories (`jobs/`, `plugins/`, `examples/`) are omitted until those capabilities are added.

## Platform Integration

- HTTP surfaces integrate `sdkwork-web-framework` through route crates.
- Database lifecycle integrates `sdkwork-database` through `sdkwork-documents-database-host`.
- Shared validation and identifiers use `sdkwork-utils-rust`.
- RPC and `sdkwork-discovery` are not required for the current HTTP-only phase.

## Commands

```bash
pnpm dev       # start local API server
pnpm build     # release build all Rust crates
pnpm test      # unit tests + architecture contract tests
pnpm check     # static architecture and database checks
pnpm verify    # merge-ready verification aggregate
pnpm clean     # remove build artifacts
```

## Standards

See `../sdkwork-specs/README.md` and `AGENTS.md`.
