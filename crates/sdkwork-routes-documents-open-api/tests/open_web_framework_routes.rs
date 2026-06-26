use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCapabilities, DocumentList, DocumentsOpenApi, DocumentsOpenApiRequestContext,
    DocumentsServiceResult,
};
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_routes_documents_open_api::{
    build_router_with_shared_open_api, wrap_router_with_web_framework,
};
use std::sync::{Arc, Mutex};
use tower::util::ServiceExt;

#[tokio::test]
async fn open_router_web_framework_rejects_unauthenticated_requests() {
    let app = wrap_router_with_web_framework(
        IamWebRequestContextResolver::new(None),
        build_router_with_shared_open_api(Arc::new(RecordingOpenApi::default())),
    );

    let response = app
        .oneshot(
            Request::builder()
                .uri("/doc/v3/api/documents")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn open_router_web_framework_accepts_dev_api_key_claim_string_before_handler() {
    let service = RecordingOpenApi::default();
    let app = wrap_router_with_web_framework(
        IamWebRequestContextResolver::new(None),
        build_router_with_shared_open_api(Arc::new(service.clone())),
    );

    let response = app
        .oneshot(
            Request::builder()
                .uri("/doc/v3/api/documents")
                .header(
                    "x-api-key",
                    "api_key_id=dev-key;tenant_id=100001;user_id=42;app_id=documents",
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(service.contexts(), vec![("dev-key".to_owned(), 1)]);
}

#[derive(Clone, Default)]
struct RecordingOpenApi {
    contexts: Arc<Mutex<Vec<(String, i64)>>>,
}

impl RecordingOpenApi {
    fn contexts(&self) -> Vec<(String, i64)> {
        self.contexts.lock().unwrap().clone()
    }
}

#[async_trait]
impl DocumentsOpenApi for RecordingOpenApi {
    async fn retrieve_capabilities(
        &self,
        _ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentCapabilities> {
        unimplemented!()
    }

    async fn list_documents(
        &self,
        ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        self.contexts
            .lock()
            .unwrap()
            .push((ctx.api_key_id, ctx.tenant_id));
        Ok(DocumentList {
            items: vec![Document {
                id: "550e8400-e29b-41d4-a716-446655440000".to_owned(),
                title: "Hello".to_owned(),
                body: String::new(),
                status: "draft".to_owned(),
            }],
        })
    }

    async fn retrieve_document(
        &self,
        _ctx: DocumentsOpenApiRequestContext,
        _document_id: String,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }
}
