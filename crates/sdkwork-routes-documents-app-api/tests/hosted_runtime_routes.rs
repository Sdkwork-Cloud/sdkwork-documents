use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_routes_documents_app_api::DocumentsRuntime;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::util::ServiceExt;

#[tokio::test]
async fn hosted_app_router_mounts_protected_documents_route() {
    let runtime = test_runtime().await;
    let app =
        runtime.build_app_router_with_web_framework_resolver(IamWebRequestContextResolver::new(None));

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
    let status = response.status();
    let body_text = response_body_text(response).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body_text}");
    assert_ne!(
        status,
        StatusCode::NOT_IMPLEMENTED,
        "hosted app api route must be mounted and protected"
    );
}

#[tokio::test]
async fn hosted_backend_router_mounts_protected_documents_route() {
    let runtime = test_runtime().await;
    let app = runtime
        .build_backend_router_with_web_framework_resolver(IamWebRequestContextResolver::new(
            None,
        ));

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
    let status = response.status();
    let body_text = response_body_text(response).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body_text}");
    assert_ne!(
        status,
        StatusCode::NOT_IMPLEMENTED,
        "hosted backend route must be mounted and protected"
    );
}

#[tokio::test]
async fn hosted_open_router_mounts_protected_capabilities_route() {
    let runtime = test_runtime().await;
    let app =
        runtime.build_open_router_with_web_framework_resolver(IamWebRequestContextResolver::new(None));

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
    let status = response.status();
    let body_text = response_body_text(response).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body_text}");
    assert_ne!(
        status,
        StatusCode::NOT_IMPLEMENTED,
        "hosted open api route must be mounted and protected"
    );
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

    std::env::set_var("SDKWORK_ENV", "dev");
    std::env::set_var("SDKWORK_IAM_ALLOW_DEV_AUTH_FALLBACK", "true");
    std::env::remove_var("SDKWORK_IAM_DATABASE_URL");
    std::env::remove_var("SDKWORK_DATABASE_URL");
    std::env::remove_var("DATABASE_URL");
    std::env::remove_var("SDKWORK_CLAW_DATABASE_URL");

    DocumentsRuntime::connect(&database_url)
        .await
        .expect("initialize hosted runtime")
}

async fn response_body_text(response: axum::response::Response) -> String {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read response body");
    String::from_utf8(bytes.to_vec()).expect("utf8 response body")
}
