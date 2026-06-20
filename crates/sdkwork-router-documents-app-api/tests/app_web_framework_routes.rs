use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCreateRequest, DocumentList, DocumentsAppApi, DocumentsAppRequestContext,
    DocumentsServiceResult,
};
use sdkwork_iam_web_adapter::IamDatabaseWebRequestContextResolver;
use sdkwork_router_documents_app_api::{
    build_router_with_shared_app_api, wrap_router_with_web_framework,
};
use std::sync::{Arc, Mutex};
use tower::util::ServiceExt;

const DEV_AUTH_TOKEN: &str =
    "Bearer tenant_id=1;user_id=42;session_id=s-1;app_id=documents;auth_level=password";
const DEV_ACCESS_TOKEN: &str =
    "tenant_id=1;user_id=42;session_id=s-1;app_id=documents;environment=dev;deployment_mode=saas";

#[tokio::test]
async fn app_router_web_framework_rejects_unauthenticated_requests() {
    let app = wrap_router_with_web_framework(
        IamDatabaseWebRequestContextResolver::new(None),
        build_router_with_shared_app_api(Arc::new(RecordingAppApi::default())),
    );

    let response = app
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/documents")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn app_router_web_framework_accepts_dev_inline_dual_tokens_before_handler() {
    let service = RecordingAppApi::default();
    let app = wrap_router_with_web_framework(
        IamDatabaseWebRequestContextResolver::new(None),
        build_router_with_shared_app_api(Arc::new(service.clone())),
    );

    let response = app
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/documents")
                .header("Authorization", DEV_AUTH_TOKEN)
                .header("Access-Token", DEV_ACCESS_TOKEN)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(service.contexts(), vec![(1, 42)]);
}

#[derive(Clone, Default)]
struct RecordingAppApi {
    contexts: Arc<Mutex<Vec<(i64, i64)>>>,
}

impl RecordingAppApi {
    fn contexts(&self) -> Vec<(i64, i64)> {
        self.contexts.lock().unwrap().clone()
    }
}

#[async_trait]
impl DocumentsAppApi for RecordingAppApi {
    async fn list_documents(
        &self,
        ctx: DocumentsAppRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        self.contexts
            .lock()
            .unwrap()
            .push((ctx.tenant_id, ctx.user_id));
        Ok(DocumentList {
            items: vec![Document {
                id: "550e8400-e29b-41d4-a716-446655440000".to_owned(),
                title: "Hello".to_owned(),
                body: String::new(),
                status: "draft".to_owned(),
            }],
        })
    }

    async fn create_document(
        &self,
        _ctx: DocumentsAppRequestContext,
        _request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }

    async fn retrieve_document(
        &self,
        _ctx: DocumentsAppRequestContext,
        _document_id: String,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }

    async fn update_document(
        &self,
        _ctx: DocumentsAppRequestContext,
        _document_id: String,
        _request: sdkwork_documents_contract::DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }
}
