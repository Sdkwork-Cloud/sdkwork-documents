use std::path::PathBuf;
use std::sync::Arc;

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_lifecycle::{lifecycle_options_from_env, LifecycleOrchestrator};
use sdkwork_database_spi::{DatabaseAssetProvider, DatabaseManifest, DefaultDatabaseModule};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};

pub struct DocumentsDatabaseHost {
    pool: DatabasePool,
    module: Arc<DefaultDatabaseModule>,
}

impl DocumentsDatabaseHost {
    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    pub fn module(&self) -> &Arc<DefaultDatabaseModule> {
        &self.module
    }
}

pub async fn bootstrap_documents_database(
    pool: DatabasePool,
) -> Result<DocumentsDatabaseHost, String> {
    let app_root = resolve_app_root();
    let module = Arc::new(
        DefaultDatabaseModule::from_app_root(&app_root)
            .map_err(|error| format!("load documents database module failed: {error}"))?,
    );
    let manifest = DatabaseManifest::from_file(module.manifest_path())
        .map_err(|error| format!("read documents database manifest failed: {error}"))?;
    let options = lifecycle_options_from_env("DOCUMENTS", &manifest);
    let orchestrator = LifecycleOrchestrator::new(pool.clone(), module.clone())
        .with_applied_by("sdkwork-documents");

    orchestrator
        .init()
        .await
        .map_err(|error| format!("documents database init failed: {error}"))?;

    if options.auto_migrate {
        orchestrator
            .migrate()
            .await
            .map_err(|error| format!("documents database migrate failed: {error}"))?;
    }

    Ok(DocumentsDatabaseHost { pool, module })
}

pub async fn bootstrap_documents_database_from_env() -> Result<DocumentsDatabaseHost, String> {
    let _ = dotenvy::dotenv();
    let config = DatabaseConfig::from_env("DOCUMENTS")
        .map_err(|error| format!("read documents database config failed: {error}"))?;
    let pool = create_pool_from_config(config)
        .await
        .map_err(|error| format!("create documents database pool failed: {error}"))?;
    bootstrap_documents_database(pool).await
}

fn resolve_app_root() -> PathBuf {
    std::env::var("SDKWORK_DOCUMENTS_APP_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../..")
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        })
}
