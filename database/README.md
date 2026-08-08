# Documents Database Module

Canonical lifecycle assets for `sdkwork-documents` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `documents`
- serviceCode: `DOCUMENTS`
- tablePrefix: `documents_`

## Commands

```bash
pnpm run db:validate
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```

Runtime services MUST create pools through `sdkwork-database-sqlx` and register `DefaultDatabaseModule` at bootstrap via `sdkwork-documents-database-host`.
