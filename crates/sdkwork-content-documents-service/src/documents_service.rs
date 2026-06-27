use std::sync::Arc;

use async_trait::async_trait;
use sdkwork_documents_contract::{
    Document, DocumentCapabilities, DocumentCreateRequest, DocumentList, DocumentUpdateRequest,
    DocumentsAppApi, DocumentsAppRequestContext, DocumentsBackendApi,
    DocumentsBackendRequestContext, DocumentsOpenApi, DocumentsOpenApiRequestContext,
    DocumentsRepository, DocumentsServiceError, DocumentsServiceResult,
};
use sdkwork_utils_rust::{is_blank, trim, uuid};

const SERVICE_VERSION: &str = "0.1.0";

pub struct DocumentsService {
    repository: Arc<dyn DocumentsRepository>,
}

impl DocumentsService {
    pub fn new(repository: Arc<dyn DocumentsRepository>) -> Self {
        Self { repository }
    }

    fn validate_create(request: &DocumentCreateRequest) -> DocumentsServiceResult<()> {
        if is_blank(Some(&request.title)) {
            return Err(DocumentsServiceError::Validation(
                "title is required".to_owned(),
            ));
        }
        Ok(())
    }

    fn new_document_id() -> String {
        uuid()
    }
}

#[async_trait]
impl DocumentsOpenApi for DocumentsService {
    async fn retrieve_capabilities(
        &self,
        _ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentCapabilities> {
        Ok(DocumentCapabilities {
            version: SERVICE_VERSION.to_owned(),
            supported_formats: vec!["markdown".to_owned(), "plain".to_owned()],
        })
    }

    async fn list_documents(
        &self,
        ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        let items = self.repository.list_by_tenant(ctx.tenant_id).await?;
        Ok(DocumentList { items })
    }

    async fn retrieve_document(
        &self,
        ctx: DocumentsOpenApiRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<Document> {
        self.repository
            .find_by_id(ctx.tenant_id, &document_id)
            .await?
            .ok_or(DocumentsServiceError::NotFound(document_id))
    }
}

#[async_trait]
impl DocumentsAppApi for DocumentsService {
    async fn list_documents(
        &self,
        ctx: DocumentsAppRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        let items = self.repository.list_by_tenant(ctx.tenant_id).await?;
        Ok(DocumentList { items })
    }

    async fn create_document(
        &self,
        ctx: DocumentsAppRequestContext,
        request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document> {
        Self::validate_create(&request)?;
        let document = Document {
            id: Self::new_document_id(),
            title: request.title,
            body: request.body,
            status: "draft".to_owned(),
        };
        self.repository.insert(ctx.tenant_id, document).await
    }

    async fn retrieve_document(
        &self,
        ctx: DocumentsAppRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<Document> {
        self.repository
            .find_by_id(ctx.tenant_id, &document_id)
            .await?
            .ok_or(DocumentsServiceError::NotFound(document_id))
    }

    async fn update_document(
        &self,
        ctx: DocumentsAppRequestContext,
        document_id: String,
        request: DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document> {
        if let Some(title) = request.title.as_deref() {
            if is_blank(Some(title)) {
                return Err(DocumentsServiceError::Validation(
                    "title is required".to_owned(),
                ));
            }
        }
        self.repository
            .update(ctx.tenant_id, &document_id, request)
            .await
    }
}

#[async_trait]
impl DocumentsBackendApi for DocumentsService {
    async fn list_documents(
        &self,
        ctx: DocumentsBackendRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        let items = self.repository.list_by_tenant(ctx.tenant_id).await?;
        Ok(DocumentList { items })
    }

    async fn create_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document> {
        Self::validate_create(&request)?;
        let document = Document {
            id: Self::new_document_id(),
            title: request.title,
            body: request.body,
            status: "draft".to_owned(),
        };
        self.repository.insert(ctx.tenant_id, document).await
    }

    async fn retrieve_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<Document> {
        self.repository
            .find_by_id(ctx.tenant_id, &document_id)
            .await?
            .ok_or(DocumentsServiceError::NotFound(document_id))
    }

    async fn update_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        document_id: String,
        request: DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document> {
        if let Some(title) = request.title.as_deref() {
            if is_blank(Some(title)) {
                return Err(DocumentsServiceError::Validation(
                    "title is required".to_owned(),
                ));
            }
        }
        let mut normalized = request;
        if let Some(status) = normalized.status.as_deref() {
            let trimmed = trim(status);
            normalized.status = if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            };
        }
        self.repository
            .update(ctx.tenant_id, &document_id, normalized)
            .await
    }

    async fn delete_document(
        &self,
        ctx: DocumentsBackendRequestContext,
        document_id: String,
    ) -> DocumentsServiceResult<()> {
        self.repository.delete(ctx.tenant_id, &document_id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct InMemoryRepository {
        items: std::sync::Mutex<Vec<(i64, Document)>>,
    }

    #[async_trait]
    impl DocumentsRepository for InMemoryRepository {
        async fn list_by_tenant(&self, tenant_id: i64) -> DocumentsServiceResult<Vec<Document>> {
            Ok(self
                .items
                .lock()
                .unwrap()
                .iter()
                .filter(|(tenant, _)| *tenant == tenant_id)
                .map(|(_, doc)| doc.clone())
                .collect())
        }

        async fn find_by_id(
            &self,
            tenant_id: i64,
            document_id: &str,
        ) -> DocumentsServiceResult<Option<Document>> {
            Ok(self
                .items
                .lock()
                .unwrap()
                .iter()
                .find(|(tenant, doc)| *tenant == tenant_id && doc.id == document_id)
                .map(|(_, doc)| doc.clone()))
        }

        async fn insert(
            &self,
            tenant_id: i64,
            document: Document,
        ) -> DocumentsServiceResult<Document> {
            self.items
                .lock()
                .unwrap()
                .push((tenant_id, document.clone()));
            Ok(document)
        }

        async fn update(
            &self,
            tenant_id: i64,
            document_id: &str,
            request: DocumentUpdateRequest,
        ) -> DocumentsServiceResult<Document> {
            let mut guard = self.items.lock().unwrap();
            let entry = guard
                .iter_mut()
                .find(|(tenant, doc)| *tenant == tenant_id && doc.id == document_id)
                .ok_or_else(|| DocumentsServiceError::NotFound(document_id.to_owned()))?;
            if let Some(title) = request.title {
                entry.1.title = title;
            }
            if let Some(body) = request.body {
                entry.1.body = body;
            }
            if let Some(status) = request.status {
                entry.1.status = status;
            }
            Ok(entry.1.clone())
        }

        async fn delete(&self, tenant_id: i64, document_id: &str) -> DocumentsServiceResult<()> {
            let mut guard = self.items.lock().unwrap();
            let len = guard.len();
            guard.retain(|(tenant, doc)| !(*tenant == tenant_id && doc.id == document_id));
            if guard.len() == len {
                return Err(DocumentsServiceError::NotFound(document_id.to_owned()));
            }
            Ok(())
        }
    }

    use sdkwork_documents_contract::DocumentsAppApi;

    #[tokio::test]
    async fn create_document_uses_utils_id_and_validation() {
        let service = DocumentsService::new(Arc::new(InMemoryRepository {
            items: std::sync::Mutex::new(Vec::new()),
        }));
        let created = DocumentsAppApi::create_document(
            &service,
            DocumentsAppRequestContext {
                tenant_id: 100_001,
                user_id: 1,
            },
            DocumentCreateRequest {
                title: "Hello".to_owned(),
                body: String::new(),
            },
        )
        .await
        .expect("create");
        assert!(!created.id.is_empty());
    }
}
