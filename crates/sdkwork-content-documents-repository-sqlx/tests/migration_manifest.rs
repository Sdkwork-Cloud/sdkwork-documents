use sdkwork_content_documents_repository_sqlx::migrations::{
    POSTGRES_CORE_MIGRATION, POSTGRES_REVISION_AUDIT_MIGRATION, SQLITE_CORE_MIGRATION,
    SQLITE_REVISION_AUDIT_MIGRATION,
};

const REQUIRED_TABLES: [&str; 3] = [
    "documents_document",
    "documents_revision",
    "documents_audit_log",
];

const REQUIRED_INDEXES: [&str; 5] = [
    "idx_documents_document_tenant",
    "idx_documents_revision_tenant",
    "idx_documents_revision_document",
    "idx_documents_audit_log_tenant",
    "idx_documents_audit_log_document",
];

#[test]
fn migration_manifest_declares_documents_core_tables_and_indexes() {
    for migration in [
        POSTGRES_CORE_MIGRATION,
        SQLITE_CORE_MIGRATION,
        POSTGRES_REVISION_AUDIT_MIGRATION,
        SQLITE_REVISION_AUDIT_MIGRATION,
    ] {
        for table in REQUIRED_TABLES {
            assert!(
                table.starts_with("documents_"),
                "table name must use documents_ prefix: {table}"
            );
        }
        assert!(
            !migration.contains("CREATE TABLE IF NOT EXISTS document_"),
            "migration must not declare legacy document_ tables"
        );
    }

    for migration in [POSTGRES_CORE_MIGRATION, SQLITE_CORE_MIGRATION] {
        assert!(
            migration.contains("documents_document"),
            "core migration must declare documents_document"
        );
        assert!(
            migration.contains("idx_documents_document_tenant"),
            "core migration must declare documents_document tenant index"
        );
    }

    for migration in [
        POSTGRES_REVISION_AUDIT_MIGRATION,
        SQLITE_REVISION_AUDIT_MIGRATION,
    ] {
        for table in ["documents_revision", "documents_audit_log"] {
            assert!(
                migration.contains(table),
                "revision/audit migration must declare table {table}"
            );
        }
        for index in [
            "idx_documents_revision_tenant",
            "idx_documents_revision_document",
            "idx_documents_audit_log_tenant",
            "idx_documents_audit_log_document",
        ] {
            assert!(
                migration.contains(index),
                "revision/audit migration must declare index {index}"
            );
        }
    }
}

#[test]
fn migration_manifest_keeps_contract_tables_in_both_engines() {
    for table in REQUIRED_TABLES {
        assert!(
            POSTGRES_CORE_MIGRATION.contains(table)
                || POSTGRES_REVISION_AUDIT_MIGRATION.contains(table),
            "postgres migrations must declare contract table {table}"
        );
        assert!(
            SQLITE_CORE_MIGRATION.contains(table)
                || SQLITE_REVISION_AUDIT_MIGRATION.contains(table),
            "sqlite migrations must declare contract table {table}"
        );
    }

    for index in REQUIRED_INDEXES {
        assert!(
            POSTGRES_CORE_MIGRATION.contains(index)
                || POSTGRES_REVISION_AUDIT_MIGRATION.contains(index),
            "postgres migrations must declare index {index}"
        );
        assert!(
            SQLITE_CORE_MIGRATION.contains(index)
                || SQLITE_REVISION_AUDIT_MIGRATION.contains(index),
            "sqlite migrations must declare index {index}"
        );
    }
}
