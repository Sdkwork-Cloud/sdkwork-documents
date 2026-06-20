mod auth;
pub mod bootstrap;
pub mod dev_auth;
mod error;
pub mod http_route_manifest;
pub mod manifest;
mod paths;
mod routes;
pub mod runtime;
mod web_bootstrap;

mod handlers;
mod ports;
mod response;

pub use error::{created_json, ok_json, ApiProblem, ApiResult, DocumentsApiProblem};
pub use http_route_manifest::app_route_manifest;
pub use manifest::ROUTES;
pub use routes::{build_router_with_app_api, build_router_with_shared_app_api};
pub use runtime::DocumentsRuntime;
pub use web_bootstrap::{
    documents_app_api_prefixes, documents_app_api_public_path_prefixes,
    wrap_router_with_web_framework, wrap_router_with_web_framework_from_env,
};
