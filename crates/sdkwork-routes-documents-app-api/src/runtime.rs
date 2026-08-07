use std::sync::Arc;

use axum::{routing::get, Json, Router};
use sdkwork_content_documents_repository_sqlx::DocumentsSqlxRepository;
use sdkwork_content_documents_service::DocumentsService;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_documents_contract::{
    DocumentsAppApi, DocumentsBackendApi, DocumentsOpenApi, DocumentsRepository,
};
use sdkwork_documents_database_host::{
    bootstrap_documents_database, bootstrap_documents_database_from_env, DocumentsDatabaseHost,
};
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_routes_documents_backend_api::{
    build_business_router_with_shared_backend_api, build_router_with_shared_backend_api,
    wrap_router_with_web_framework as wrap_backend_router,
};
use sdkwork_routes_documents_open_api::{
    build_business_router_with_shared_open_api, build_router_with_shared_open_api,
    wrap_router_with_web_framework as wrap_open_router,
};

use crate::bootstrap;

#[derive(Clone)]
pub struct DocumentsRuntime {
    service: Arc<DocumentsService>,
    pool: DatabasePool,
}

impl DocumentsRuntime {
    pub async fn connect(database_url: &str) -> Result<Self, String> {
        let pool = sdkwork_content_documents_repository_sqlx::connect_postgres_and_install_schema(
            database_url,
        )
        .await
        .map_err(|error| format!("connect documents database failed: {error}"))?;
        let repository: Arc<dyn DocumentsRepository> =
            Arc::new(DocumentsSqlxRepository::new(pool.clone()));
        Ok(Self {
            service: Arc::new(DocumentsService::new(repository)),
            pool,
        })
    }

    pub async fn connect_from_env() -> Result<Self, String> {
        let database_host = bootstrap_documents_database_from_env().await?;
        Self::from_database_host(database_host)
    }

    pub async fn connect_from_pool(pool: DatabasePool) -> Result<Self, String> {
        let database_host = bootstrap_documents_database(pool).await?;
        Self::from_database_host(database_host)
    }

    fn from_database_host(database_host: DocumentsDatabaseHost) -> Result<Self, String> {
        let pool = database_host.pool().clone();
        let repository: Arc<dyn DocumentsRepository> =
            Arc::new(DocumentsSqlxRepository::new(pool.clone()));
        Ok(Self {
            service: Arc::new(DocumentsService::new(repository)),
            pool,
        })
    }

    pub async fn readiness_check(&self) -> Result<(), String> {
        match self.pool.test_connection().await {
            Ok(true) => Ok(()),
            Ok(false) => Err("documents database readiness query returned no row".to_owned()),
            Err(error) => Err(format!(
                "documents database readiness check failed: {error}"
            )),
        }
    }

    pub fn service(&self) -> Arc<DocumentsService> {
        self.service.clone()
    }

    pub fn build_app_router_with_web_framework_resolver(
        &self,
        resolver: IamWebRequestContextResolver,
    ) -> Router {
        let api: Arc<dyn DocumentsAppApi> = self.service.clone();
        let router = crate::build_router_with_shared_app_api(api);
        crate::wrap_router_with_web_framework(resolver, router)
    }

    pub async fn build_app_router_with_web_framework(&self) -> Router {
        let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
        self.build_app_router_with_web_framework_resolver(resolver)
    }

    pub async fn build_app_business_router_with_web_framework(&self) -> Router {
        let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
        let router = self.build_app_business_router();
        crate::wrap_router_with_web_framework(resolver, router)
    }

    pub fn build_app_business_router(&self) -> Router {
        let api: Arc<dyn DocumentsAppApi> = self.service.clone();
        crate::build_business_router_with_shared_app_api(api)
    }

    pub fn build_backend_business_router(&self) -> Router {
        let api: Arc<dyn DocumentsBackendApi> = self.service.clone();
        build_business_router_with_shared_backend_api(api)
    }

    pub fn build_open_business_router(&self) -> Router {
        let api: Arc<dyn DocumentsOpenApi> = self.service.clone();
        build_business_router_with_shared_open_api(api)
    }

    pub fn build_backend_router_with_web_framework_resolver(
        &self,
        resolver: IamWebRequestContextResolver,
    ) -> Router {
        let api: Arc<dyn DocumentsBackendApi> = self.service.clone();
        let router = build_router_with_shared_backend_api(api);
        wrap_backend_router(resolver, router)
    }

    pub async fn build_backend_router_with_web_framework(&self) -> Router {
        let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
        self.build_backend_router_with_web_framework_resolver(resolver)
    }

    pub async fn build_backend_business_router_with_web_framework(&self) -> Router {
        let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
        let api: Arc<dyn DocumentsBackendApi> = self.service.clone();
        let router = build_business_router_with_shared_backend_api(api);
        wrap_backend_router(resolver, router)
    }

    pub fn build_open_router_with_web_framework_resolver(
        &self,
        resolver: IamWebRequestContextResolver,
    ) -> Router {
        let api: Arc<dyn DocumentsOpenApi> = self.service.clone();
        let router = build_router_with_shared_open_api(api);
        wrap_open_router(resolver, router)
    }

    pub async fn build_open_router_with_web_framework(&self) -> Router {
        let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
        self.build_open_router_with_web_framework_resolver(resolver)
    }

    pub async fn build_open_business_router_with_web_framework(&self) -> Router {
        let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
        let api: Arc<dyn DocumentsOpenApi> = self.service.clone();
        let router = build_business_router_with_shared_open_api(api);
        wrap_open_router(resolver, router)
    }

    pub async fn build_unified_router_with_web_framework(&self) -> Router {
        let open = self.build_open_router_with_web_framework().await;
        let app = self.build_app_router_with_web_framework().await;
        let backend = self.build_backend_router_with_web_framework().await;
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

pub async fn build_served_app_router(runtime: &DocumentsRuntime) -> Router {
    bootstrap::validate_process_config();
    if unified_process_layout() {
        runtime.build_unified_router_with_web_framework().await
    } else {
        runtime.build_app_router_with_web_framework().await
    }
}

pub async fn build_served_backend_router(runtime: &DocumentsRuntime) -> Router {
    bootstrap::validate_process_config();
    runtime.build_backend_router_with_web_framework().await
}

pub async fn build_served_open_router(runtime: &DocumentsRuntime) -> Router {
    bootstrap::validate_process_config();
    runtime.build_open_router_with_web_framework().await
}
