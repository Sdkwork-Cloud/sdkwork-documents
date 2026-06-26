use async_trait::async_trait;
use axum::body::{to_bytes, Body};
use axum::http::{header, Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCreateRequest, DocumentList, DocumentsBackendApi,
    DocumentsBackendRequestContext, DocumentsServiceResult,
};
use sdkwork_routes_documents_backend_api::{
    backend_route_manifest, build_router_with_shared_backend_api, manifest, ROUTES,
};
use sdkwork_web_core::RouteAuth;
use std::sync::{Arc, Mutex};
use tower::util::ServiceExt;

#[test]
fn backend_api_manifest_matches_contract() {
    assert_eq!(
        manifest::PACKAGE_NAME,
        "sdkwork-routes-documents-backend-api"
    );
    assert_eq!(manifest::SURFACE, "backend-api");
    assert_eq!(manifest::PREFIX, "/backend/v3/api");
    assert_eq!(ROUTES.len(), 5);
    assert!(ROUTES.iter().all(|route| route.auth_mode == "dual-token"));
}

#[test]
fn backend_route_manifest_declares_dual_token_auth_for_all_operations() {
    let manifest = backend_route_manifest();
    for entry in ROUTES {
        let matched = manifest
            .match_route(entry.method, entry.path)
            .unwrap_or_else(|| {
                panic!(
                    "missing http route manifest for {} {}",
                    entry.method, entry.path
                )
            });
        assert_eq!(matched.auth, RouteAuth::DualToken);
        assert_eq!(matched.operation_id, entry.operation_id);
    }
}

#[tokio::test]
async fn backend_list_documents_requires_request_context() {
    let app = build_router_with_shared_backend_api(Arc::new(RecordingBackendApi::default()));
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
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );
}

#[tokio::test]
async fn backend_list_documents_returns_payload_with_context() {
    let service = RecordingBackendApi::default();
    let app = build_router_with_shared_backend_api(Arc::new(service.clone()));
    let response = app
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/documents")
                .extension(backend_context())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    assert!(body.starts_with(b"{\"items\""));
    assert_eq!(service.contexts(), vec![(100_001, 99)]);
}

fn backend_context() -> DocumentsBackendRequestContext {
    DocumentsBackendRequestContext {
        tenant_id: 100_001,
        operator_id: 99,
    }
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
