use std::sync::Arc;

use axum::{routing::get, Router};

use crate::{handlers, paths, ports::DocumentsOpenApi};

#[derive(Clone)]
pub(crate) struct OpenState {
    pub(crate) api: Arc<dyn DocumentsOpenApi>,
}

pub fn build_router_with_open_api<A>(api: A) -> Router
where
    A: DocumentsOpenApi + 'static,
{
    build_router_with_shared_open_api(Arc::new(api))
}

pub fn build_router_with_shared_open_api(api: Arc<dyn DocumentsOpenApi>) -> Router {
    build_business_router_with_shared_open_api(api).route(paths::HEALTHZ, get(handlers::health))
}

pub fn build_business_router_with_shared_open_api(api: Arc<dyn DocumentsOpenApi>) -> Router {
    Router::new()
        .route(paths::CAPABILITIES, get(handlers::retrieve_capabilities))
        .route(paths::DOCUMENTS, get(handlers::list_documents))
        .route(paths::DOCUMENT, get(handlers::retrieve_document))
        .with_state(OpenState { api })
}
