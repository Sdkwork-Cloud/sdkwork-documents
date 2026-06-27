use sdkwork_documents_gateway_assembly::{
    assemble_application_router, bootstrap, DocumentsRuntime,
};
use sdkwork_documents_standalone_gateway::serve_router;

#[tokio::main]
async fn main() {
    bootstrap::validate_process_config();

    let listen_addr = std::env::var("SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_INGRESS_BIND")
        .unwrap_or_else(|_| "127.0.0.1:18084".to_string());

    let runtime = DocumentsRuntime::connect_from_env()
        .await
        .expect("initialize documents runtime");
    runtime
        .readiness_check()
        .await
        .expect("documents database readiness check failed");

    let router = assemble_application_router(&runtime)
        .await
        .router;
    serve_router(
        &listen_addr,
        "sdkwork-documents-standalone-gateway",
        router,
    )
    .await;
}
