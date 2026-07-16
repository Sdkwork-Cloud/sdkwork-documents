//! Gateway assembly for the SDKWork Documents HTTP plane.

pub mod bootstrap;
mod generated;

pub use bootstrap::{
    assemble_application_business_router, assemble_application_business_router_from_env,
    assemble_application_router, ApplicationAssembly,
};
pub use sdkwork_routes_documents_app_api::DocumentsRuntime;

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
