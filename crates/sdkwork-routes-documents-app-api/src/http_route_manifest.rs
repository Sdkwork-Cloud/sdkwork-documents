use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/documents",
        "documents",
        "documents.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/documents",
        "documents",
        "documents.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/documents/{documentId}",
        "documents",
        "documents.retrieve",
    ),
    HttpRoute::dual_token(
        HttpMethod::Patch,
        "/app/v3/api/documents/{documentId}",
        "documents",
        "documents.update",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/sdk_reference/archives",
        "sdkReference",
        "archives.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/sdk_reference/documentation",
        "sdkReference",
        "documentation.create",
    ),
];

pub fn app_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
