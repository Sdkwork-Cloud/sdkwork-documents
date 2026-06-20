use async_trait::async_trait;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_documents_contract::{
    Document, DocumentUpdateRequest, DocumentsRepository, DocumentsServiceError,
    DocumentsServiceResult,
};
use sdkwork_utils_rust::is_uuid;

pub struct DocumentsSqlxRepository {
    pool: DatabasePool,
}

impl DocumentsSqlxRepository {
    pub fn new(pool: DatabasePool) -> Self {
        Self { pool }
    }

    fn map_sqlx_error(error: impl std::fmt::Display) -> DocumentsServiceError {
        DocumentsServiceError::Internal(error.to_string())
    }

    fn parse_document_id(document_id: &str) -> DocumentsServiceResult<uuid::Uuid> {
        if !is_uuid(document_id) {
            return Err(DocumentsServiceError::Validation(format!(
                "invalid document id: {document_id}"
            )));
        }
        uuid::Uuid::parse_str(document_id.trim())
            .map_err(|error| DocumentsServiceError::Validation(error.to_string()))
    }
}

#[async_trait]
impl DocumentsRepository for DocumentsSqlxRepository {
    async fn list_by_tenant(&self, tenant_id: i64) -> DocumentsServiceResult<Vec<Document>> {
        if let Some(pg) = self.pool.as_postgres() {
            let rows = sqlx::query_as::<_, PostgresDocumentRow>(
                "SELECT id, title, body, status FROM documents_document WHERE tenant_id = $1 ORDER BY updated_at DESC",
            )
            .bind(tenant_id)
            .fetch_all(pg)
            .await
            .map_err(Self::map_sqlx_error)?;
            return Ok(rows
                .into_iter()
                .map(PostgresDocumentRow::into_document)
                .collect());
        }

        let sqlite = self
            .pool
            .as_sqlite()
            .ok_or_else(|| DocumentsServiceError::Internal("database pool unavailable".into()))?;
        let rows = sqlx::query_as::<_, SqliteDocumentRow>(
            "SELECT id, title, body, status FROM documents_document WHERE tenant_id = ? ORDER BY updated_at DESC",
        )
        .bind(tenant_id)
        .fetch_all(sqlite)
        .await
        .map_err(Self::map_sqlx_error)?;
        Ok(rows
            .into_iter()
            .map(SqliteDocumentRow::into_document)
            .collect())
    }

    async fn find_by_id(
        &self,
        tenant_id: i64,
        document_id: &str,
    ) -> DocumentsServiceResult<Option<Document>> {
        if let Some(pg) = self.pool.as_postgres() {
            let id = Self::parse_document_id(document_id)?;
            let row = sqlx::query_as::<_, PostgresDocumentRow>(
                "SELECT id, title, body, status FROM documents_document WHERE tenant_id = $1 AND id = $2",
            )
            .bind(tenant_id)
            .bind(id)
            .fetch_optional(pg)
            .await
            .map_err(Self::map_sqlx_error)?;
            return Ok(row.map(PostgresDocumentRow::into_document));
        }

        let sqlite = self
            .pool
            .as_sqlite()
            .ok_or_else(|| DocumentsServiceError::Internal("database pool unavailable".into()))?;
        let row = sqlx::query_as::<_, SqliteDocumentRow>(
            "SELECT id, title, body, status FROM documents_document WHERE tenant_id = ? AND id = ?",
        )
        .bind(tenant_id)
        .bind(document_id)
        .fetch_optional(sqlite)
        .await
        .map_err(Self::map_sqlx_error)?;
        Ok(row.map(SqliteDocumentRow::into_document))
    }

    async fn insert(&self, tenant_id: i64, document: Document) -> DocumentsServiceResult<Document> {
        if let Some(pg) = self.pool.as_postgres() {
            let id = Self::parse_document_id(&document.id)?;
            sqlx::query(
                "INSERT INTO documents_document (id, tenant_id, title, body, status) VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(id)
            .bind(tenant_id)
            .bind(&document.title)
            .bind(&document.body)
            .bind(&document.status)
            .execute(pg)
            .await
            .map_err(Self::map_sqlx_error)?;
            return Ok(document);
        }

        let sqlite = self
            .pool
            .as_sqlite()
            .ok_or_else(|| DocumentsServiceError::Internal("database pool unavailable".into()))?;
        Self::parse_document_id(&document.id)?;
        sqlx::query(
            "INSERT INTO documents_document (id, tenant_id, title, body, status) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&document.id)
        .bind(tenant_id)
        .bind(&document.title)
        .bind(&document.body)
        .bind(&document.status)
        .execute(sqlite)
        .await
        .map_err(Self::map_sqlx_error)?;
        Ok(document)
    }

    async fn update(
        &self,
        tenant_id: i64,
        document_id: &str,
        request: DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document> {
        let existing = self
            .find_by_id(tenant_id, document_id)
            .await?
            .ok_or_else(|| DocumentsServiceError::NotFound(document_id.to_owned()))?;
        let updated = Document {
            title: request.title.unwrap_or(existing.title),
            body: request.body.unwrap_or(existing.body),
            status: request.status.unwrap_or(existing.status),
            ..existing
        };

        if let Some(pg) = self.pool.as_postgres() {
            let id = Self::parse_document_id(&updated.id)?;
            sqlx::query(
                "UPDATE documents_document SET title = $1, body = $2, status = $3, updated_at = NOW() WHERE tenant_id = $4 AND id = $5",
            )
            .bind(&updated.title)
            .bind(&updated.body)
            .bind(&updated.status)
            .bind(tenant_id)
            .bind(id)
            .execute(pg)
            .await
            .map_err(Self::map_sqlx_error)?;
            return Ok(updated);
        }

        let sqlite = self
            .pool
            .as_sqlite()
            .ok_or_else(|| DocumentsServiceError::Internal("database pool unavailable".into()))?;
        sqlx::query(
            "UPDATE documents_document SET title = ?, body = ?, status = ?, updated_at = datetime('now') WHERE tenant_id = ? AND id = ?",
        )
        .bind(&updated.title)
        .bind(&updated.body)
        .bind(&updated.status)
        .bind(tenant_id)
        .bind(&updated.id)
        .execute(sqlite)
        .await
        .map_err(Self::map_sqlx_error)?;
        Ok(updated)
    }

    async fn delete(&self, tenant_id: i64, document_id: &str) -> DocumentsServiceResult<()> {
        if let Some(pg) = self.pool.as_postgres() {
            let id = Self::parse_document_id(document_id)?;
            let result =
                sqlx::query("DELETE FROM documents_document WHERE tenant_id = $1 AND id = $2")
                    .bind(tenant_id)
                    .bind(id)
                    .execute(pg)
                    .await
                    .map_err(Self::map_sqlx_error)?;
            if result.rows_affected() == 0 {
                return Err(DocumentsServiceError::NotFound(document_id.to_owned()));
            }
            return Ok(());
        }

        let sqlite = self
            .pool
            .as_sqlite()
            .ok_or_else(|| DocumentsServiceError::Internal("database pool unavailable".into()))?;
        let result = sqlx::query("DELETE FROM documents_document WHERE tenant_id = ? AND id = ?")
            .bind(tenant_id)
            .bind(document_id)
            .execute(sqlite)
            .await
            .map_err(Self::map_sqlx_error)?;
        if result.rows_affected() == 0 {
            return Err(DocumentsServiceError::NotFound(document_id.to_owned()));
        }
        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct PostgresDocumentRow {
    id: uuid::Uuid,
    title: String,
    body: String,
    status: String,
}

impl PostgresDocumentRow {
    fn into_document(self) -> Document {
        Document {
            id: self.id.to_string(),
            title: self.title,
            body: self.body,
            status: self.status,
        }
    }
}

#[derive(sqlx::FromRow)]
struct SqliteDocumentRow {
    id: String,
    title: String,
    body: String,
    status: String,
}

impl SqliteDocumentRow {
    fn into_document(self) -> Document {
        Document {
            id: self.id,
            title: self.title,
            body: self.body,
            status: self.status,
        }
    }
}
