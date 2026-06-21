# SDKWork Documents PC

Browser application root for SDKWork Documents reference surfaces.

This app follows `APP_PC_ARCHITECTURE_SPEC.md`, composes capability packages under `packages/`, and injects the generated `@sdkwork/documents-app-sdk` client through `DocumentsReferenceRuntimeProvider`.

## Scripts

- `pnpm dev`: Vite browser development server (default port `3902`).
- `pnpm build`: production browser bundle.
- `pnpm typecheck`: TypeScript validation for the app root.
- `pnpm test:architecture`: PC architecture contract test.

Run repository verification from the repository root with `pnpm verify`.

## Runtime

- Generated SDK: `@sdkwork/documents-app-sdk` (alias to repository generated OpenAPI transport).
- Reference modules: `@sdkwork/documents-pc-api-reference`, `@sdkwork/documents-pc-sdk-reference`.
- Dev proxy forwards `/app/v3/api`, `/backend/v3/api`, `/doc/v3/api`, and gateway OpenAPI paths to configured topology URLs.

Copy `.env.example` to `.env.local` for local overrides.
