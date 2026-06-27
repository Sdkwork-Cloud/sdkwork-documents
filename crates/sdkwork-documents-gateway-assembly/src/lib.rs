//! Gateway assembly for sdkwork-documents.

mod generated;

use axum::Router;
pub use sdkwork_routes_documents_app_api::bootstrap;
pub use sdkwork_routes_documents_app_api::runtime::DocumentsRuntime;

pub struct ApplicationAssembly {
    pub router: Router,
}

pub async fn assemble_application_router(runtime: &DocumentsRuntime) -> ApplicationAssembly {
    let router = runtime.build_unified_router_with_web_framework().await;
    ApplicationAssembly { router }
}

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
