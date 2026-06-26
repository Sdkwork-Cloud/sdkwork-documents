use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_documents_contract::{
    Document, DocumentCreateRequest, DocumentList, DocumentUpdateRequest, DocumentsAppApi,
    DocumentsAppRequestContext, DocumentsServiceResult,
};
use sdkwork_routes_documents_app_api::build_router_with_shared_app_api;
use serde_json::Value;
use std::sync::Arc;
use tower::util::ServiceExt;

#[tokio::test]
async fn app_router_mounts_every_app_openapi_operation_path() {
    let spec: Value = serde_json::from_str(include_str!(
        "../../../sdks/sdkwork-documents-app-sdk/openapi/documents-app-api.openapi.json"
    ))
    .unwrap();
    let app = build_router_with_shared_app_api(Arc::new(StubAppApi));

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

struct StubAppApi;

#[async_trait]
impl DocumentsAppApi for StubAppApi {
    async fn list_documents(
        &self,
        _ctx: DocumentsAppRequestContext,
    ) -> DocumentsServiceResult<DocumentList> {
        Ok(DocumentList { items: vec![] })
    }

    async fn create_document(
        &self,
        _ctx: DocumentsAppRequestContext,
        request: DocumentCreateRequest,
    ) -> DocumentsServiceResult<Document> {
        Ok(Document {
            id: "doc-1".to_string(),
            title: request.title,
            status: "draft".to_string(),
            body: request.body,
        })
    }

    async fn retrieve_document(
        &self,
        _ctx: DocumentsAppRequestContext,
        _document_id: String,
    ) -> DocumentsServiceResult<Document> {
        Ok(Document {
            id: "doc-1".to_string(),
            title: "Example".to_string(),
            status: "draft".to_string(),
            body: String::new(),
        })
    }

    async fn update_document(
        &self,
        _ctx: DocumentsAppRequestContext,
        _document_id: String,
        _request: DocumentUpdateRequest,
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

fn request_body(operation_id: &str) -> &'static str {
    match operation_id {
        "documents.create" => r#"{"title":"Example","body":"Hello"}"#,
        "documents.update" => r#"{"title":"Updated"}"#,
        _ => "",
    }
}
