//! API assembly for sdkwork-documents.
//! Application bootstrap lives in `bootstrap.rs`; route inventory is in `assembly-manifest.json`.

pub mod bootstrap;
mod generated;

pub use bootstrap::{
    assemble_api_router, assemble_api_router_from_env, assemble_app_api_contribution,
    assemble_business_routes, ApiAssembly, ApiAssemblyContribution,
};
pub use sdkwork_routes_documents_app_api::DocumentsRuntime;

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
