use std::sync::Arc;

use axum::{routing::get, Router};

use crate::{handlers, paths, ports::DocumentsAppApi};

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) api: Arc<dyn DocumentsAppApi>,
}

pub fn build_router_with_app_api<A>(api: A) -> Router
where
    A: DocumentsAppApi + 'static,
{
    build_router_with_shared_app_api(Arc::new(api))
}

pub fn build_router_with_shared_app_api(api: Arc<dyn DocumentsAppApi>) -> Router {
    Router::new()
        .route(paths::HEALTHZ, get(handlers::health))
        .route(
            paths::DOCUMENTS,
            get(handlers::list_documents).post(handlers::create_document),
        )
        .route(
            paths::DOCUMENT,
            get(handlers::retrieve_document).patch(handlers::update_document),
        )
        .with_state(AppState { api })
}
