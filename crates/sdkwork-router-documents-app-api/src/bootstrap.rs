pub fn documents_environment() -> Option<String> {
    std::env::var("SDKWORK_DOCUMENTS_ENVIRONMENT").ok()
}

pub fn validate_process_config() {
    if crate::dev_auth::dev_auth_bypass_enabled() {
        return;
    }

    let organization_id = std::env::var("SDKWORK_DOCUMENTS_ORGANIZATION_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(0);
    if organization_id == 0 {
        eprintln!(
            "SDKWORK_DOCUMENTS_ORGANIZATION_ID must be set when SDKWORK_DOCUMENTS_ENVIRONMENT is not development"
        );
        std::process::exit(1);
    }
}
