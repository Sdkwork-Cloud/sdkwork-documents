//! HTTP metrics primitives for SDKWork Documents services.

use axum::{
    extract::Request,
    http::{header, HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

static REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static REQUEST_ERRORS_TOTAL: AtomicU64 = AtomicU64::new(0);
static REQUEST_DURATION_MS_TOTAL: AtomicU64 = AtomicU64::new(0);

pub async fn metrics_middleware(request: Request, next: Next) -> Response {
    let started = Instant::now();
    REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
    let response = next.run(request).await;
    if response.status().is_server_error() {
        REQUEST_ERRORS_TOTAL.fetch_add(1, Ordering::Relaxed);
    }
    REQUEST_DURATION_MS_TOTAL.fetch_add(
        u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
        Ordering::Relaxed,
    );
    response
}

pub async fn metrics_handler() -> impl IntoResponse {
    let body = format!(
        "# HELP documents_api_requests_total Total HTTP requests handled by documents API servers.\n\
         # TYPE documents_api_requests_total counter\n\
         documents_api_requests_total {}\n\
         # HELP documents_api_request_errors_total Total HTTP 5xx responses.\n\
         # TYPE documents_api_request_errors_total counter\n\
         documents_api_request_errors_total {}\n\
         # HELP documents_api_request_duration_ms_total Cumulative request duration in milliseconds.\n\
         # TYPE documents_api_request_duration_ms_total counter\n\
         documents_api_request_duration_ms_total {}\n",
        REQUESTS_TOTAL.load(Ordering::Relaxed),
        REQUEST_ERRORS_TOTAL.load(Ordering::Relaxed),
        REQUEST_DURATION_MS_TOTAL.load(Ordering::Relaxed),
    );

    (
        StatusCode::OK,
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("text/plain; version=0.0.4"),
        )],
        body,
    )
}

pub fn metrics_route() -> Router {
    Router::new().route("/metrics", get(metrics_handler))
}

pub fn wrap_router_with_metrics(router: Router) -> Router {
    router
        .merge(metrics_route())
        .layer(axum::middleware::from_fn(metrics_middleware))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use tower::util::ServiceExt;

    #[tokio::test]
    async fn metrics_endpoint_exports_prometheus_counters() {
        let app = wrap_router_with_metrics(Router::new().route("/healthz", get(|| async { "ok" })));
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}
