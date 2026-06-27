mod auth;
mod error;
mod handlers;
pub mod http_route_manifest;
pub mod manifest;
mod paths;
mod ports;
mod response;
mod routes;
mod web_bootstrap;

use std::sync::Arc;

use axum::Router;
use sdkwork_documents_contract::DocumentsBackendApi;
use sdkwork_web_core::HttpRouteManifest;

pub use error::{created_json, no_content, ok_json, ApiProblem, ApiResult, DocumentsApiProblem};
pub use http_route_manifest::backend_route_manifest;
pub use manifest::ROUTES;
pub use routes::{build_router_with_backend_api, build_router_with_shared_backend_api};
pub use web_bootstrap::{
    documents_backend_api_prefixes, documents_backend_api_public_path_prefixes,
    wrap_router_with_web_framework, wrap_router_with_web_framework_from_env,
};

pub fn gateway_route_manifest() -> HttpRouteManifest {
    backend_route_manifest()
}

pub fn gateway_mount(api: Arc<dyn DocumentsBackendApi>) -> Router {
    build_router_with_shared_backend_api(api)
}
