pub fn documents_environment() -> Option<String> {
    std::env::var("SDKWORK_DOCUMENTS_ENVIRONMENT").ok()
}

pub fn validate_process_config() {
    // Documents auth is owned by sdkwork-iam via sdkwork-iam-web-adapter.
    // Process-level configuration validation lives in the shared web framework layer.
}
