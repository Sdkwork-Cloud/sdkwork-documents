pub const POSTGRES_CORE_MIGRATION: &str =
    include_str!("../migrations/postgres/V202606200001__documents_core.sql");

pub const SQLITE_CORE_MIGRATION: &str =
    include_str!("../migrations/sqlite/V202606200001__documents_core.sql");

pub const POSTGRES_REVISION_AUDIT_MIGRATION: &str =
    include_str!("../migrations/postgres/V202606200002__documents_revision_audit.sql");

pub const SQLITE_REVISION_AUDIT_MIGRATION: &str =
    include_str!("../migrations/sqlite/V202606200002__documents_revision_audit.sql");

pub const SQLITE_MIGRATIONS: &[&str] = &[SQLITE_CORE_MIGRATION, SQLITE_REVISION_AUDIT_MIGRATION];

pub const POSTGRES_MIGRATIONS: &[&str] =
    &[POSTGRES_CORE_MIGRATION, POSTGRES_REVISION_AUDIT_MIGRATION];
