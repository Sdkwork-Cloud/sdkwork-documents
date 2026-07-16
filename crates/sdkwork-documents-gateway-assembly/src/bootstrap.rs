use axum::Router;
use sdkwork_routes_documents_app_api::DocumentsRuntime;

pub use sdkwork_routes_documents_app_api::bootstrap::validate_process_config;

pub struct ApplicationAssembly {
    pub router: Router,
}

pub async fn assemble_application_business_router(
    runtime: &DocumentsRuntime,
) -> ApplicationAssembly {
    let open = runtime
        .build_open_business_router_with_web_framework()
        .await;
    let app = runtime.build_app_business_router_with_web_framework().await;
    let backend = runtime
        .build_backend_business_router_with_web_framework()
        .await;

    ApplicationAssembly {
        router: Router::new().merge(open).merge(app).merge(backend),
    }
}

pub async fn assemble_application_router(runtime: &DocumentsRuntime) -> ApplicationAssembly {
    assemble_application_business_router(runtime).await
}

pub async fn assemble_application_business_router_from_env() -> Result<ApplicationAssembly, String>
{
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_env().await?;
    runtime.readiness_check().await?;
    Ok(assemble_application_business_router(&runtime).await)
}
