use std::sync::Arc;

use axum::{routing::get, Router};

use crate::{handlers, paths, ports::DocumentsBackendApi};

#[derive(Clone)]
pub(crate) struct BackendState {
    pub(crate) api: Arc<dyn DocumentsBackendApi>,
}

pub fn build_router_with_backend_api<A>(api: A) -> Router
where
    A: DocumentsBackendApi + 'static,
{
    build_router_with_shared_backend_api(Arc::new(api))
}

pub fn build_router_with_shared_backend_api(api: Arc<dyn DocumentsBackendApi>) -> Router {
    Router::new()
        .route(paths::HEALTHZ, get(handlers::health))
        .route(
            paths::DOCUMENTS,
            get(handlers::list_documents).post(handlers::create_document),
        )
        .route(
            paths::DOCUMENT,
            get(handlers::retrieve_document)
                .patch(handlers::update_document)
                .delete(handlers::delete_document),
        )
        .with_state(BackendState { api })
}
