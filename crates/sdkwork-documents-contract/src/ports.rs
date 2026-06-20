use async_trait::async_trait;
use thiserror::Error;

use crate::dto::{
    Document, DocumentCapabilities, DocumentCreateRequest, DocumentList, DocumentUpdateRequest,
};

pub type DocumentsServiceResult<T> = Result<T, DocumentsServiceError>;

#[derive(Debug, Error)]
pub enum DocumentsServiceError {
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("internal error: {0}")]
    Internal(String),
}

#[derive(Debug, Clone)]
pub struct DocumentsOpenApiRequestContext {
    pub api_key_id: String,
    pub tenant_id: i64,
}

#[derive(Debug, Clone)]
pub struct DocumentsAppRequestContext {
    pub tenant_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone)]
pub struct DocumentsBackendRequestContext {
    pub tenant_id: i64,
    pub operator_id: i64,
}

#[async_trait]
pub trait DocumentsOpenApi: Send + Sync {
    async fn retrieve_capabilities(
        &self,
        ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentCapabilities>;
    async fn list_documents(
        &self,
        ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentList>;
    async fn retrieve_document(
        &self,
        ctx: DocumentsOpenApiRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<Document>;
}

#[async_trait]
pub trait DocumentsAppApi: Send + Sync {
    async fn list_documents(
        &self,
        ctx: DocumentsAppRequestContext,
    ) -> DocumentsServiceResult<DocumentList>;
    async fn create_document(
        &self,
        ctx: DocumentsAppRequestContext,
        request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document>;
    async fn retrieve_document(
        &self,
        ctx: DocumentsAppRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<Document>;
    async fn update_document(
        &self,
        ctx: DocumentsAppRequestContext,
        document_id: String,
        request: DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document>;
}

#[async_trait]
pub trait DocumentsBackendApi: Send + Sync {
    async fn list_documents(
        &self,
        ctx: DocumentsBackendRequestContext,
    ) -> DocumentsServiceResult<DocumentList>;
    async fn create_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document>;
    async fn retrieve_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<Document>;
    async fn update_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        document_id: String,
        request: DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document>;
    async fn delete_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<()>;
}

#[async_trait]
pub trait DocumentsRepository: Send + Sync {
    async fn list_by_tenant(&self, tenant_id: i64) -> DocumentsServiceResult<Vec<Document>>;
    async fn find_by_id(
        &self,
        tenant_id: i64,
        document_id: &str,
    ) -> DocumentsServiceResult<Option<Document>>;
    async fn insert(&self, tenant_id: i64, document: Document) -> DocumentsServiceResult<Document>;
    async fn update(
        &self,
        tenant_id: i64,
        document_id: &str,
        request: DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document>;
    async fn delete(&self, tenant_id: i64, document_id: &str) -> DocumentsServiceResult<()>;
}
