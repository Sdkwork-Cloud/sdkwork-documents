pub const PACKAGE_NAME: &str = "sdkwork-routes-documents-open-api";
pub const SURFACE: &str = "open-api";
pub const OWNER: &str = "sdkwork-documents";
pub const DOMAIN: &str = "content";
pub const CAPABILITY: &str = "documents";
pub const API_AUTHORITY: &str = "sdkwork-documents-open-api";
pub const SDK_FAMILY: &str = "sdkwork-documents-sdk";
pub const PREFIX: &str = "/doc/v3/api";
pub const AUTH_MODE: &str = "api-key";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RouteManifestEntry {
    pub method: &'static str,
    pub path: &'static str,
    pub operation_id: &'static str,
    pub auth_mode: &'static str,
}

pub const ROUTES: &[RouteManifestEntry] = &[
    RouteManifestEntry {
        method: "GET",
        path: "/doc/v3/api/documents/capabilities",
        operation_id: "capabilities.retrieve",
        auth_mode: AUTH_MODE,
    },
    RouteManifestEntry {
        method: "GET",
        path: "/doc/v3/api/documents",
        operation_id: "documents.list",
        auth_mode: AUTH_MODE,
    },
    RouteManifestEntry {
        method: "GET",
        path: "/doc/v3/api/documents/{documentId}",
        operation_id: "documents.retrieve",
        auth_mode: AUTH_MODE,
    },
];
