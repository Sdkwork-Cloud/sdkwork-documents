use async_trait::async_trait;
use axum::body::{to_bytes, Body};
use axum::http::{header, Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCapabilities, DocumentList, DocumentsOpenApi, DocumentsOpenApiRequestContext,
    DocumentsServiceResult,
};
use sdkwork_routes_documents_open_api::{
    build_router_with_shared_open_api, manifest, open_route_manifest, ROUTES,
};
use sdkwork_web_core::RouteAuth;
use std::sync::{Arc, Mutex};
use tower::util::ServiceExt;

#[test]
fn open_api_manifest_matches_contract() {
    assert_eq!(manifest::PACKAGE_NAME, "sdkwork-routes-documents-open-api");
    assert_eq!(manifest::SURFACE, "open-api");
    assert_eq!(manifest::PREFIX, "/doc/v3/api");
    assert_eq!(ROUTES.len(), 3);
    assert!(ROUTES.iter().all(|route| route.auth_mode == "api-key"));
}

#[test]
fn open_route_manifest_declares_api_key_auth_for_all_operations() {
    let manifest = open_route_manifest();
    for entry in ROUTES {
        let matched = manifest
            .match_route(entry.method, entry.path)
            .unwrap_or_else(|| {
                panic!(
                    "missing http route manifest for {} {}",
                    entry.method, entry.path
                )
            });
        assert_eq!(matched.auth, RouteAuth::ApiKey);
        assert_eq!(matched.operation_id, entry.operation_id);
    }
}

#[tokio::test]
async fn open_list_documents_requires_request_context() {
    let app = build_router_with_shared_open_api(Arc::new(RecordingOpenApi::default()));
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
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );
}

#[tokio::test]
async fn open_list_documents_returns_payload_with_context() {
    let service = RecordingOpenApi::default();
    let app = build_router_with_shared_open_api(Arc::new(service.clone()));
    let response = app
        .oneshot(
            Request::builder()
                .uri("/doc/v3/api/documents")
                .extension(open_context())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    assert!(body.starts_with(b"{\"items\""));
    assert_eq!(service.contexts(), vec![("dev-key".to_owned(), 1)]);
}

fn open_context() -> DocumentsOpenApiRequestContext {
    DocumentsOpenApiRequestContext {
        api_key_id: "dev-key".to_owned(),
        tenant_id: 100_001,
    }
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
        Ok(DocumentCapabilities {
            version: "0.1.0".to_owned(),
            supported_formats: vec!["markdown".to_owned()],
        })
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
        document_id: String,
    ) -> DocumentsServiceResult<Document> {
        Ok(Document {
            id: document_id,
            title: "Hello".to_owned(),
            body: String::new(),
            status: "draft".to_owned(),
        })
    }
}
