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
use sdkwork_documents_contract::DocumentsOpenApi;
use sdkwork_web_core::HttpRouteManifest;

pub use error::{ok_json, ApiProblem, ApiResult, DocumentsApiProblem};
pub use http_route_manifest::open_route_manifest;
pub use manifest::ROUTES;
pub use routes::{build_router_with_open_api, build_router_with_shared_open_api};
pub use web_bootstrap::{
    documents_open_api_prefixes, documents_open_api_public_path_prefixes,
    wrap_router_with_web_framework, wrap_router_with_web_framework_from_env,
};

pub fn gateway_route_manifest() -> HttpRouteManifest {
    open_route_manifest()
}

pub fn gateway_mount(api: Arc<dyn DocumentsOpenApi>) -> Router {
    build_router_with_shared_open_api(api)
}
