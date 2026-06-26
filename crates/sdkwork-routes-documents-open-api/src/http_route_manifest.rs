use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::api_key(
        HttpMethod::Get,
        "/doc/v3/api/documents/capabilities",
        "documents",
        "capabilities.retrieve",
    ),
    HttpRoute::api_key(
        HttpMethod::Get,
        "/doc/v3/api/documents",
        "documents",
        "documents.list",
    ),
    HttpRoute::api_key(
        HttpMethod::Get,
        "/doc/v3/api/documents/{documentId}",
        "documents",
        "documents.retrieve",
    ),
];

pub fn open_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
