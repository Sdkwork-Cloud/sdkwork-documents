use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/documents",
        "documents",
        "documents.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/documents",
        "documents",
        "documents.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/documents/{documentId}",
        "documents",
        "documents.retrieve",
    ),
    HttpRoute::dual_token(
        HttpMethod::Patch,
        "/backend/v3/api/documents/{documentId}",
        "documents",
        "documents.update",
    ),
    HttpRoute::dual_token(
        HttpMethod::Delete,
        "/backend/v3/api/documents/{documentId}",
        "documents",
        "documents.delete",
    ),
];

pub fn backend_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
