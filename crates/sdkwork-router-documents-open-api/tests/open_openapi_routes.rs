use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCapabilities, DocumentList, DocumentsOpenApi, DocumentsOpenApiRequestContext,
    DocumentsServiceResult,
};
use sdkwork_router_documents_open_api::build_router_with_shared_open_api;
use serde_json::Value;
use std::sync::Arc;
use tower::util::ServiceExt;

#[tokio::test]
async fn open_router_mounts_every_open_openapi_operation_path() {
    let spec: Value = serde_json::from_str(include_str!(
        "../../../sdks/sdkwork-documents-sdk/openapi/documents-open-api.openapi.json"
    ))
    .unwrap();
    let app = build_router_with_shared_open_api(Arc::new(StubOpenApi));

    let paths = spec["paths"].as_object().unwrap();
    for (template_path, methods) in paths {
        for (method_name, operation) in methods.as_object().unwrap() {
            if !["get", "post", "put", "patch", "delete"].contains(&method_name.as_str()) {
                continue;
            }
            let operation_id = operation["operationId"].as_str().unwrap();
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(method_from_openapi(method_name))
                        .uri(concrete_uri(template_path))
                        .header("content-type", "application/json")
                        .body(Body::from(request_body(operation_id)))
                        .unwrap(),
                )
                .await
                .unwrap();

            assert_ne!(
                response.status(),
                StatusCode::NOT_FOUND,
                "{operation_id} route from OpenAPI is not mounted: {method_name} {template_path}",
            );
        }
    }
}

struct StubOpenApi;

#[async_trait]
impl DocumentsOpenApi for StubOpenApi {
    async fn retrieve_capabilities(
        &self,
        _ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentCapabilities> {
        Ok(DocumentCapabilities {
            version: "0.1.0".to_string(),
            supported_formats: vec!["text/markdown".to_string()],
        })
    }

    async fn list_documents(
        &self,
        _ctx: DocumentsOpenApiRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        Ok(DocumentList { items: vec![] })
    }

    async fn retrieve_document(
        &self,
        _ctx: DocumentsOpenApiRequestContext,
        _document_id: String,
    ) -> DocumentsServiceResult<Document> {
        Ok(Document {
            id: "doc-1".to_string(),
            title: "Example".to_string(),
            status: "draft".to_string(),
            body: String::new(),
        })
    }
}

fn method_from_openapi(method_name: &str) -> Method {
    match method_name {
        "delete" => Method::DELETE,
        "get" => Method::GET,
        "patch" => Method::PATCH,
        "post" => Method::POST,
        "put" => Method::PUT,
        value => panic!("unsupported OpenAPI method: {value}"),
    }
}

fn concrete_uri(template_path: &str) -> String {
    template_path.replace("{documentId}", "doc-1")
}

fn request_body(_operation_id: &str) -> &'static str {
    ""
}
