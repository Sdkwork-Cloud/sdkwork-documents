use std::collections::BTreeSet;
use std::sync::Arc;

use axum::Router;
use sdkwork_routes_documents_app_api::DocumentsRuntime;
use sdkwork_web_bootstrap::{ReadinessCheck, ReadinessFuture};
use sdkwork_web_core::{DomainContextInjector, HttpRoute, HttpRouteManifest};

pub use sdkwork_routes_documents_app_api::bootstrap::validate_process_config;

pub struct ApiAssembly {
    pub router: Router,
}

pub struct ApiAssemblyContribution {
    pub router: Router,
    pub route_manifest: HttpRouteManifest,
    pub openapi: serde_json::Value,
    pub permission_catalog: Vec<&'static str>,
    pub domain_context_injectors: Vec<Arc<dyn DomainContextInjector>>,
    pub readiness_check: Arc<dyn ReadinessCheck>,
}

#[derive(Clone)]
struct DocumentsReadiness {
    runtime: DocumentsRuntime,
}

impl ReadinessCheck for DocumentsReadiness {
    fn check(&self) -> ReadinessFuture<'_> {
        Box::pin(self.runtime.readiness_check())
    }
}

pub async fn assemble_business_routes(runtime: &DocumentsRuntime) -> ApiAssembly {
    let open = runtime
        .build_open_business_router_with_web_framework()
        .await;
    let app = runtime.build_app_business_router_with_web_framework().await;
    let backend = runtime
        .build_backend_business_router_with_web_framework()
        .await;

    ApiAssembly {
        router: Router::new().merge(open).merge(app).merge(backend),
    }
}

pub async fn assemble_api_router(runtime: &DocumentsRuntime) -> ApiAssembly {
    assemble_business_routes(runtime).await
}

pub async fn assemble_api_router_from_env() -> Result<ApiAssembly, String> {
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_env().await?;
    runtime.readiness_check().await?;
    Ok(assemble_api_router(&runtime).await)
}

/// Builds the raw Documents App API for a gateway-owned Web Framework layer.
pub async fn assemble_app_api_contribution() -> Result<ApiAssemblyContribution, String> {
    validate_process_config();
    let runtime = DocumentsRuntime::connect_from_env().await?;
    let route_manifest = sdkwork_routes_documents_app_api::app_route_manifest();
    let router = runtime.build_app_business_router();
    Ok(ApiAssemblyContribution {
        router,
        openapi: sdkwork_web_contract::build_openapi_document(
            "SDKWork Documents App API",
            route_manifest.routes(),
        ),
        permission_catalog: permission_catalog(route_manifest.routes()),
        route_manifest,
        domain_context_injectors: vec![
            sdkwork_routes_documents_app_api::documents_app_context_injector(),
        ],
        readiness_check: Arc::new(DocumentsReadiness { runtime }),
    })
}

fn permission_catalog(routes: &[HttpRoute]) -> Vec<&'static str> {
    let mut permissions = BTreeSet::new();
    for route in routes {
        if let Some(permission) = route.required_permission {
            permissions.insert(permission);
        }
        if let Some(alternate_permissions) = route.alternate_permissions {
            permissions.extend(alternate_permissions.iter().copied());
        }
    }
    permissions.into_iter().collect()
}
