# sdkwork-routes-documents-open-api

Domain: content
Capability: documents
Package type: rust-route-crate
Surface: open-api

This crate owns the SDKWork Documents public open-api route adapter for `/doc/v3/api`.

## Responsibilities

- Mount public Documents open-api routes.
- Expose deterministic route manifest metadata and `HttpRouteManifest` (`RouteAuth::ApiKey`).
- Wire `sdkwork-web-framework` through `IamWebRequestContextResolver` with route-manifest auth enforcement.
- Decode HTTP requests, consume typed open-api credential context, call injected service traits, and map responses to API contracts.

## Boundaries

- Does not own business rules, SQLx queries, or provider clients.
- Does not expose login, session, app-api, or backend-api routes.
- Does not import generated SDK output for the same authority.
- Open-api auth mode is `api-key` per contract; OAuth/flexible modes require an explicit contract change before adoption.

## Verification

- `cargo test -p sdkwork-routes-documents-open-api`
- `pnpm check:architecture-alignment`
