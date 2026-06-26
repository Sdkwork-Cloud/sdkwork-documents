use std::sync::Arc;

use axum::Router;
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{DomainContextInjector, WebRequestContext, WebRequestContextProfile};

use crate::http_route_manifest::open_route_manifest;
use crate::paths;
use sdkwork_documents_contract::DocumentsOpenApiRequestContext;

pub fn documents_open_api_public_path_prefixes() -> Vec<String> {
    vec![paths::HEALTHZ.to_owned()]
}

pub fn documents_open_api_prefixes() -> Vec<String> {
    vec![paths::PREFIX.to_owned()]
}

#[derive(Clone, Default)]
struct DocumentsOpenApiContextInjector;

impl DomainContextInjector for DocumentsOpenApiContextInjector {
    fn inject(&self, request: &mut axum::extract::Request, context: &WebRequestContext) {
        if let Some(open_context) = open_api_context_from_web_request(context) {
            request.extensions_mut().insert(open_context);
        }
    }
}

fn open_api_context_from_web_request(
    context: &WebRequestContext,
) -> Option<DocumentsOpenApiRequestContext> {
    let principal = context.principal.as_ref()?;
    let tenant_id = principal.tenant_id().parse().ok()?;
    let api_key_id = principal
        .api_key_id()
        .map(str::to_owned)
        .or_else(|| principal.session_id().map(str::to_owned))
        .unwrap_or_else(|| principal.user_id().to_owned());
    Some(DocumentsOpenApiRequestContext {
        api_key_id,
        tenant_id,
    })
}

pub fn wrap_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    let route_manifest = open_route_manifest();
    route_manifest
        .validate_public_path_prefixes(&documents_open_api_public_path_prefixes())
        .expect("documents open-api public prefixes must not cover protected manifest routes");

    let layer = WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            open_api_prefixes: documents_open_api_prefixes(),
            public_path_prefixes: documents_open_api_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest)
        .with_domain_injector(Arc::new(DocumentsOpenApiContextInjector));
    with_web_request_context(router, layer)
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    wrap_router_with_web_framework(resolver, router)
}
