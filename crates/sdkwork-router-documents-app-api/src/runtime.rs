use std::sync::Arc;

use crate::wrap_router_with_web_framework_from_env as wrap_app_router;
use axum::{routing::get, Json, Router};
use sdkwork_content_documents_repository_sqlx::DocumentsSqlxRepository;
use sdkwork_content_documents_service::DocumentsService;
use sdkwork_documents_contract::{
    DocumentsAppApi, DocumentsBackendApi, DocumentsOpenApi, DocumentsRepository,
};
use sdkwork_documents_database_host::bootstrap_documents_database_from_env;
use sdkwork_router_documents_backend_api::{
    build_router_with_shared_backend_api,
    wrap_router_with_web_framework_from_env as wrap_backend_router,
};
use sdkwork_router_documents_open_api::{
    build_router_with_shared_open_api, wrap_router_with_web_framework_from_env as wrap_open_router,
};

use crate::{bootstrap, dev_auth};

#[derive(Clone)]
pub struct DocumentsRuntime {
    service: Arc<DocumentsService>,
}

impl DocumentsRuntime {
    pub async fn connect(database_url: &str) -> Result<Self, String> {
        let pool = sdkwork_content_documents_repository_sqlx::connect_sqlite_and_install_schema(
            database_url,
        )
        .await
        .map_err(|error| format!("connect documents database failed: {error}"))?;
        let repository: Arc<dyn DocumentsRepository> = Arc::new(DocumentsSqlxRepository::new(pool));
        Ok(Self {
            service: Arc::new(DocumentsService::new(repository)),
        })
    }

    pub async fn connect_from_env() -> Result<Self, String> {
        let database_host = bootstrap_documents_database_from_env().await?;
        let repository: Arc<dyn DocumentsRepository> =
            Arc::new(DocumentsSqlxRepository::new(database_host.pool().clone()));
        Ok(Self {
            service: Arc::new(DocumentsService::new(repository)),
        })
    }

    pub async fn readiness_check(&self) -> Result<(), String> {
        Ok(())
    }

    pub fn service(&self) -> Arc<DocumentsService> {
        self.service.clone()
    }

    pub async fn build_app_router_with_web_framework(
        &self,
        tenant_id: i64,
        user_id: i64,
    ) -> Router {
        let api: Arc<dyn DocumentsAppApi> = self.service.clone();
        let router = crate::build_router_with_shared_app_api(api);
        let router = if dev_auth::dev_auth_bypass_enabled() {
            dev_auth::with_dev_app_auth(router, tenant_id, user_id)
        } else {
            wrap_app_router(router).await
        };
        router
    }

    pub async fn build_backend_router_with_web_framework(
        &self,
        tenant_id: i64,
        operator_id: i64,
    ) -> Router {
        let api: Arc<dyn DocumentsBackendApi> = self.service.clone();
        let router = build_router_with_shared_backend_api(api);
        let router = if dev_auth::dev_auth_bypass_enabled() {
            dev_auth::with_dev_backend_auth(router, tenant_id, operator_id)
        } else {
            wrap_backend_router(router).await
        };
        router
    }

    pub async fn build_open_router_with_web_framework(
        &self,
        tenant_id: i64,
        api_key_id: &str,
    ) -> Router {
        let api: Arc<dyn DocumentsOpenApi> = self.service.clone();
        let router = build_router_with_shared_open_api(api);
        let router = if dev_auth::dev_auth_bypass_enabled() {
            dev_auth::with_dev_open_auth(router, tenant_id, api_key_id)
        } else {
            wrap_open_router(router).await
        };
        router
    }

    pub async fn build_unified_router_with_web_framework(
        &self,
        tenant_id: i64,
        user_id: i64,
        operator_id: i64,
        api_key_id: &str,
    ) -> Router {
        let open = self
            .build_open_router_with_web_framework(tenant_id, api_key_id)
            .await;
        let app = self
            .build_app_router_with_web_framework(tenant_id, user_id)
            .await;
        let backend = self
            .build_backend_router_with_web_framework(tenant_id, operator_id)
            .await;
        Router::new()
            .merge(open)
            .merge(app)
            .merge(backend)
            .route("/health", get(health_check))
    }
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "sdkwork-documents",
        "version": "0.1.0"
    }))
}

pub fn unified_process_layout() -> bool {
    std::env::var("SDKWORK_DOCUMENTS_SERVICE_LAYOUT")
        .map(|value| value.eq_ignore_ascii_case("unified-process"))
        .unwrap_or(true)
}

pub async fn build_served_app_router(
    runtime: &DocumentsRuntime,
    tenant_id: i64,
    user_id: i64,
    operator_id: i64,
    api_key_id: &str,
) -> Router {
    bootstrap::validate_process_config();
    if unified_process_layout() {
        runtime
            .build_unified_router_with_web_framework(tenant_id, user_id, operator_id, api_key_id)
            .await
    } else {
        runtime
            .build_app_router_with_web_framework(tenant_id, user_id)
            .await
    }
}

pub async fn build_served_backend_router(
    runtime: &DocumentsRuntime,
    tenant_id: i64,
    operator_id: i64,
) -> Router {
    bootstrap::validate_process_config();
    runtime
        .build_backend_router_with_web_framework(tenant_id, operator_id)
        .await
}

pub async fn build_served_open_router(
    runtime: &DocumentsRuntime,
    tenant_id: i64,
    api_key_id: &str,
) -> Router {
    bootstrap::validate_process_config();
    runtime
        .build_open_router_with_web_framework(tenant_id, api_key_id)
        .await
}
