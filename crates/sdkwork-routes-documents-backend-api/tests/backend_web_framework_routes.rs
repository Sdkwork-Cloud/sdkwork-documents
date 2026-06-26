use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCreateRequest, DocumentList, DocumentsBackendApi,
    DocumentsBackendRequestContext, DocumentsServiceResult,
};
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_routes_documents_backend_api::{
    build_router_with_shared_backend_api, wrap_router_with_web_framework,
};
use sdkwork_web_core::{access_token_jwt, auth_token_jwt};
use std::sync::{Arc, Mutex};
use tower::util::ServiceExt;

const DEV_TENANT_ID: &str = "1";
const DEV_USER_ID: &str = "99";
const DEV_SESSION_ID: &str = "s-1";
const DEV_APP_ID: &str = "documents";

fn dev_auth_token() -> String {
    format!(
        "Bearer {}",
        auth_token_jwt(DEV_TENANT_ID, DEV_USER_ID, DEV_SESSION_ID, DEV_APP_ID)
    )
}

fn dev_access_token() -> String {
    access_token_jwt(DEV_TENANT_ID, DEV_USER_ID, DEV_SESSION_ID, DEV_APP_ID)
}

#[tokio::test]
async fn backend_router_web_framework_rejects_unauthenticated_requests() {
    let app = wrap_router_with_web_framework(
        IamWebRequestContextResolver::new(None),
        build_router_with_shared_backend_api(Arc::new(RecordingBackendApi::default())),
    );

    let response = app
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/documents")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn backend_router_web_framework_accepts_dev_jwt_dual_tokens_before_handler() {
    let service = RecordingBackendApi::default();
    let app = wrap_router_with_web_framework(
        IamWebRequestContextResolver::new(None),
        build_router_with_shared_backend_api(Arc::new(service.clone())),
    );

    let response = app
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/documents")
                .header("Authorization", dev_auth_token())
                .header("Access-Token", dev_access_token())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(service.contexts(), vec![(1, 99)]);
}

#[derive(Clone, Default)]
struct RecordingBackendApi {
    contexts: Arc<Mutex<Vec<(i64, i64)>>>,
}

impl RecordingBackendApi {
    fn contexts(&self) -> Vec<(i64, i64)> {
        self.contexts.lock().unwrap().clone()
    }
}

#[async_trait]
impl DocumentsBackendApi for RecordingBackendApi {
    async fn list_documents(
        &self,
        ctx: DocumentsBackendRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        self.contexts
            .lock()
            .unwrap()
            .push((ctx.tenant_id, ctx.operator_id));
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
        _ctx: DocumentsBackendRequestContext,
        _request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }

    async fn retrieve_document(
        &self,
        _ctx: DocumentsBackendRequestContext,
        _document_id: String,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }

    async fn update_document(
        &self,
        _ctx: DocumentsBackendRequestContext,
        _document_id: String,
        _request: sdkwork_documents_contract::DocumentUpdateRequest,
    ) -> DocumentsServiceResult<Document> {
        unimplemented!()
    }

    async fn delete_document(
        &self,
        _ctx: DocumentsBackendRequestContext,
        _document_id: String,
    ) -> DocumentsServiceResult<()> {
        unimplemented!()
    }
}
