use sdkwork_api_documents_assembly::assemble_api_router_from_env;
use sdkwork_api_documents_standalone_gateway::serve_router;
use sdkwork_web_bootstrap::ComposedApiAssembly;

#[tokio::main]
async fn main() {
    let listen_addr = std::env::var("SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_INGRESS_BIND")
        .unwrap_or_else(|_| "127.0.0.1:18084".to_string());

    let assembly = assemble_api_router_from_env()
        .await
        .expect("initialize documents API assembly");
    let manifest = assembly.route_manifest.clone();
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    let framework =
        sdkwork_iam_web_adapter::build_web_framework_builder(resolver, manifest, Vec::new());
    let router = ComposedApiAssembly::try_compose("SDKWork Documents API", vec![assembly])
        .expect("compose documents API contribution")
        .into_hosted(framework)
        .router;
    serve_router(
        &listen_addr,
        "sdkwork-api-documents-standalone-gateway",
        router,
    )
    .await;
}
