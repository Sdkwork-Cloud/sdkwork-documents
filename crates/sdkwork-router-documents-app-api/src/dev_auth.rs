use axum::{
    extract::Request,
    middleware::{self, Next},
    Router,
};
use sdkwork_documents_contract::{
    DocumentsAppRequestContext, DocumentsBackendRequestContext, DocumentsOpenApiRequestContext,
};

pub fn dev_auth_bypass_enabled() -> bool {
    std::env::var("SDKWORK_DOCUMENTS_ENVIRONMENT")
        .map(|value| value.eq_ignore_ascii_case("development"))
        .unwrap_or(true)
        || std::env::var("SDKWORK_DOCUMENTS_DEV_AUTH_BYPASS")
            .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
}

pub fn with_dev_open_auth(router: Router, tenant_id: i64, api_key_id: &str) -> Router {
    let api_key_id = api_key_id.to_owned();
    router.layer(middleware::from_fn(
        move |mut request: Request, next: Next| {
            let api_key_id = api_key_id.clone();
            async move {
                if request
                    .extensions()
                    .get::<DocumentsOpenApiRequestContext>()
                    .is_none()
                {
                    request
                        .extensions_mut()
                        .insert(DocumentsOpenApiRequestContext {
                            api_key_id,
                            tenant_id,
                        });
                }
                next.run(request).await
            }
        },
    ))
}

pub fn with_dev_app_auth(router: Router, tenant_id: i64, user_id: i64) -> Router {
    router.layer(middleware::from_fn(
        move |mut request: Request, next: Next| async move {
            if request
                .extensions()
                .get::<DocumentsAppRequestContext>()
                .is_none()
            {
                request
                    .extensions_mut()
                    .insert(DocumentsAppRequestContext { tenant_id, user_id });
            }
            next.run(request).await
        },
    ))
}

pub fn with_dev_backend_auth(router: Router, tenant_id: i64, operator_id: i64) -> Router {
    router.layer(middleware::from_fn(
        move |mut request: Request, next: Next| async move {
            if request
                .extensions()
                .get::<DocumentsBackendRequestContext>()
                .is_none()
            {
                request
                    .extensions_mut()
                    .insert(DocumentsBackendRequestContext {
                        tenant_id,
                        operator_id,
                    });
            }
            next.run(request).await
        },
    ))
}
