use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_router_documents_app_api::{dev_auth, DocumentsRuntime};
use serde_json::Value;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::util::ServiceExt;

#[tokio::test]
async fn hosted_app_router_lists_documents() {
    let runtime = test_runtime().await;
    let app = dev_auth::with_dev_app_auth(
        runtime.build_app_router_with_web_framework(1, 42).await,
        1,
        42,
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/documents")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_ne!(
        response.status(),
        StatusCode::NOT_IMPLEMENTED,
        "hosted app api must not return operation_not_implemented for documents.list"
    );

    let body = response_body_json(response).await;
    assert!(body["items"].is_array());
}

#[tokio::test]
async fn hosted_backend_router_lists_documents() {
    let runtime = test_runtime().await;
    let app = dev_auth::with_dev_backend_auth(
        runtime.build_backend_router_with_web_framework(1, 99).await,
        1,
        99,
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/documents")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_ne!(
        response.status(),
        StatusCode::NOT_IMPLEMENTED,
        "hosted backend must not return operation_not_implemented for documents.list"
    );

    let body = response_body_json(response).await;
    assert!(body["items"].is_array());
}

#[tokio::test]
async fn hosted_open_router_reports_capabilities() {
    let runtime = test_runtime().await;
    let app = dev_auth::with_dev_open_auth(
        runtime
            .build_open_router_with_web_framework(1, "test-api-key")
            .await,
        1,
        "test-api-key",
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/doc/v3/api/documents/capabilities")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_ne!(
        response.status(),
        StatusCode::NOT_IMPLEMENTED,
        "hosted open api must not return operation_not_implemented for documents.capabilities"
    );

    let body = response_body_json(response).await;
    assert!(body.is_object());
}

async fn test_runtime() -> DocumentsRuntime {
    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_nanos();
    let sequence = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    let work_dir = std::env::current_dir().expect("current directory");
    let test_root = work_dir
        .join("target")
        .join("hosted-runtime-tests")
        .join(format!("{}-{}-{}", std::process::id(), nanos, sequence));
    std::fs::create_dir_all(&test_root).expect("create hosted runtime test directory");

    let database_path = test_root.join("documents.db");
    let relative_database_path = database_path
        .strip_prefix(&work_dir)
        .unwrap_or(&database_path)
        .display()
        .to_string()
        .replace('\\', "/");
    let database_url = format!("sqlite://{relative_database_path}?mode=rwc");

    std::env::set_var("SDKWORK_DOCUMENTS_DEV_AUTH_BYPASS", "true");
    std::env::set_var("SDKWORK_DOCUMENTS_ENVIRONMENT", "development");

    DocumentsRuntime::connect(&database_url)
        .await
        .expect("initialize hosted runtime")
}

async fn response_body_json(response: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read response body");
    serde_json::from_slice(&bytes).expect("parse response json")
}
