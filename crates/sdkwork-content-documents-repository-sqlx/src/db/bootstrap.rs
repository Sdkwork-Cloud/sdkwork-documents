//! SDKWork database pool bootstrap for Documents repository tests and runtime helpers.

use sdkwork_database_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};

const DOCUMENTS_POOL_MAX_CONNECTIONS: u32 = 5;

pub fn database_config_from_url(database_url: &str) -> Result<DatabaseConfig, PoolError> {
    let normalized = database_url.trim();
    let engine = DatabaseEngine::from_url(normalized).ok_or_else(|| {
        PoolError::InvalidUrl(format!("unsupported documents database url: {normalized}"))
    })?;
    Ok(DatabaseConfig {
        engine,
        url: normalized.to_string(),
        max_connections: max_connections_for_url(engine, normalized),
        ..DatabaseConfig::default()
    })
}

fn max_connections_for_url(engine: DatabaseEngine, database_url: &str) -> u32 {
    if engine == DatabaseEngine::Sqlite && database_url.trim() == "sqlite::memory:" {
        return 1;
    }
    DOCUMENTS_POOL_MAX_CONNECTIONS
}

pub async fn connect_documents_pool_from_url(
    database_url: &str,
) -> Result<DatabasePool, PoolError> {
    create_pool_from_config(database_config_from_url(database_url)?).await
}

fn map_pool_error(error: PoolError) -> sqlx::Error {
    sqlx::Error::Configuration(error.to_string().into())
}

pub async fn install_sqlite_schema(pool: &sqlx::SqlitePool) -> Result<(), sqlx::Error> {
    for migration in crate::migrations::SQLITE_MIGRATIONS {
        for statement in migration.split(';') {
            let statement = statement.trim();
            if statement.is_empty() {
                continue;
            }
            match sqlx::query(statement).execute(pool).await {
                Ok(_) => {}
                Err(sqlx::Error::Database(error)) if error.message().contains("already exists") => {
                }
                Err(error) => return Err(error),
            }
        }
    }
    Ok(())
}

pub async fn install_postgres_schema(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    for migration in crate::migrations::POSTGRES_MIGRATIONS {
        for statement in migration.split(';') {
            let statement = statement.trim();
            if statement.is_empty() {
                continue;
            }
            match sqlx::query(statement).execute(pool).await {
                Ok(_) => {}
                Err(sqlx::Error::Database(error)) if error.message().contains("already exists") => {
                }
                Err(error) => return Err(error),
            }
        }
    }
    Ok(())
}

pub async fn connect_postgres_and_install_schema(
    database_url: &str,
) -> Result<DatabasePool, sqlx::Error> {
    let pool = connect_documents_pool_from_url(database_url)
        .await
        .map_err(map_pool_error)?;
    let postgres = pool
        .as_postgres()
        .ok_or_else(|| sqlx::Error::Configuration("expected postgres database url".into()))?;
    install_postgres_schema(postgres).await?;
    Ok(pool)
}

pub async fn connect_sqlite_and_install_schema(
    database_url: &str,
) -> Result<DatabasePool, sqlx::Error> {
    let pool = connect_documents_pool_from_url(database_url)
        .await
        .map_err(map_pool_error)?;
    let sqlite = pool
        .as_sqlite()
        .ok_or_else(|| sqlx::Error::Configuration("expected sqlite database url".into()))?;
    install_sqlite_schema(sqlite).await?;
    Ok(pool)
}
