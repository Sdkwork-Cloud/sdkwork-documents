use sdkwork_documents_api_server::serve_router;
use sdkwork_router_documents_app_api::{
    bootstrap,
    runtime::{build_served_open_router, DocumentsRuntime},
};

#[tokio::main]
async fn main() {
    bootstrap::validate_process_config();

    let tenant_id = std::env::var("SDKWORK_DOCUMENTS_TENANT_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(1);
    let listen_addr = std::env::var("SDKWORK_DOCUMENTS_APPLICATION_OPEN_HTTP_BIND")
        .unwrap_or_else(|_| "127.0.0.1:18086".to_string());

    let runtime = DocumentsRuntime::connect_from_env()
        .await
        .expect("initialize documents runtime");
    runtime
        .readiness_check()
        .await
        .expect("documents database readiness check failed");

    let router = build_served_open_router(&runtime, tenant_id, "dev-local").await;
    serve_router(&listen_addr, "sdkwork-documents-open-api", router).await;
}
