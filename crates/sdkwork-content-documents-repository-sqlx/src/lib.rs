mod db;
mod repository;

pub mod migrations;

pub use db::bootstrap::{
    connect_documents_pool_from_url, connect_postgres_and_install_schema,
    connect_sqlite_and_install_schema, install_postgres_schema, install_sqlite_schema,
};
pub use repository::DocumentsSqlxRepository;

use sdkwork_database_sqlx::DatabasePool;

pub async fn connect_documents_pool_from_env() -> Result<DatabasePool, String> {
    let _ = dotenvy::dotenv();
    let config = sdkwork_database_config::DatabaseConfig::from_env("DOCUMENTS")
        .map_err(|error| format!("read documents database config failed: {error}"))?;
    sdkwork_database_sqlx::create_pool_from_config(config)
        .await
        .map_err(|error| format!("create documents database pool failed: {error}"))
}

pub async fn bootstrap_documents_database(pool: DatabasePool) -> Result<(), String> {
    sdkwork_documents_database_host::bootstrap_documents_database(pool).await?;
    Ok(())
}
