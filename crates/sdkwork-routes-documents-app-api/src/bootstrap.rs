pub fn documents_environment() -> Option<String> {
    std::env::var("SDKWORK_DOCUMENTS_ENVIRONMENT").ok()
}

/// Canonical default IAM tenant id for documents deployment/runtime scope.
pub const DEFAULT_DOCUMENTS_TENANT_ID: i64 = 100_001;

/// Canonical default IAM organization id for tenant-level documents scope.
pub const DEFAULT_DOCUMENTS_ORGANIZATION_ID: i64 = 0;

/// Resolves deployment tenant id from `SDKWORK_DOCUMENTS_TENANT_ID`, defaulting to `100001`.
pub fn resolve_deployment_tenant_id() -> i64 {
    std::env::var("SDKWORK_DOCUMENTS_TENANT_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(DEFAULT_DOCUMENTS_TENANT_ID)
}

pub fn validate_process_config() {
    // Documents auth is owned by sdkwork-iam via sdkwork-iam-web-adapter.
    // Process-level configuration validation lives in the shared web framework layer.
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_deployment_tenant_id_defaults_to_iam_bootstrap_tenant() {
        if std::env::var("SDKWORK_DOCUMENTS_TENANT_ID").is_ok() {
            return;
        }
        assert_eq!(resolve_deployment_tenant_id(), DEFAULT_DOCUMENTS_TENANT_ID);
        assert_eq!(DEFAULT_DOCUMENTS_TENANT_ID, 100_001);
        assert_eq!(DEFAULT_DOCUMENTS_ORGANIZATION_ID, 0);
    }
}
