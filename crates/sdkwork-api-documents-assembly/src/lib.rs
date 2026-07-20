//! Generated API assembly for sdkwork-documents.

mod generated;

pub struct ApiAssembly {
    pub router: axum::Router,
}

pub async fn assemble_api_router() -> ApiAssembly {
    let mut router = axum::Router::new();
    router = router.merge(sdkwork_routes_documents_app_api::gateway_mount());
    router = router.merge(sdkwork_routes_documents_backend_api::gateway_mount());
    router = router.merge(sdkwork_routes_documents_open_api::gateway_mount());
    ApiAssembly { router }
}

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
