use std::sync::Arc;

use axum::Router;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_routes_documents_app_api::DocumentsRuntime;
pub use sdkwork_web_bootstrap::ApiAssemblyContribution;
use sdkwork_web_bootstrap::{ReadinessCheck, ReadinessFuture};
use sdkwork_web_core::HttpRouteManifest;

pub use sdkwork_routes_documents_app_api::bootstrap::validate_process_config;

pub type ApiAssembly = ApiAssemblyContribution;

#[derive(Clone)]
struct DocumentsReadiness {
    runtime: DocumentsRuntime,
}

impl ReadinessCheck for DocumentsReadiness {
    fn check(&self) -> ReadinessFuture<'_> {
        Box::pin(self.runtime.readiness_check())
    }
}

pub async fn assemble_api_router(runtime: &DocumentsRuntime) -> Result<ApiAssembly, String> {
    assemble_owner_api_contribution(runtime.clone())
}

pub async fn assemble_api_router_from_env() -> Result<ApiAssembly, String> {
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_env().await?;
    assemble_owner_api_contribution(runtime)
}

pub async fn assemble_api_router_with_pool(pool: DatabasePool) -> Result<ApiAssembly, String> {
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_pool(pool).await?;
    assemble_owner_api_contribution(runtime)
}

fn assemble_owner_api_contribution(runtime: DocumentsRuntime) -> Result<ApiAssembly, String> {
    let router = Router::new()
        .merge(runtime.build_app_business_router())
        .merge(runtime.build_backend_business_router())
        .merge(runtime.build_open_business_router());
    let routes = sdkwork_routes_documents_app_api::gateway_route_manifest()
        .routes()
        .iter()
        .chain(
            sdkwork_routes_documents_backend_api::gateway_route_manifest()
                .routes()
                .iter(),
        )
        .chain(
            sdkwork_routes_documents_open_api::gateway_route_manifest()
                .routes()
                .iter(),
        )
        .cloned()
        .collect();
    ApiAssemblyContribution::from_manifest(
        "sdkwork-documents",
        "SDKWork Documents API",
        router,
        HttpRouteManifest::from_owned_routes(routes),
        vec![sdkwork_routes_documents_app_api::documents_app_context_injector()],
        Arc::new(DocumentsReadiness { runtime }),
    )
}

pub async fn assemble_app_api_contribution() -> Result<ApiAssemblyContribution, String> {
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_env().await?;
    assemble_app_api_contribution_with_runtime(runtime)
}

pub async fn assemble_app_api_contribution_with_pool(
    pool: DatabasePool,
) -> Result<ApiAssemblyContribution, String> {
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_pool(pool).await?;
    assemble_app_api_contribution_with_runtime(runtime)
}

fn assemble_app_api_contribution_with_runtime(
    runtime: DocumentsRuntime,
) -> Result<ApiAssemblyContribution, String> {
    ApiAssemblyContribution::from_manifest(
        "sdkwork-documents",
        "SDKWork Documents App API",
        runtime.build_app_business_router(),
        sdkwork_routes_documents_app_api::app_route_manifest(),
        vec![sdkwork_routes_documents_app_api::documents_app_context_injector()],
        Arc::new(DocumentsReadiness { runtime }),
    )
}
