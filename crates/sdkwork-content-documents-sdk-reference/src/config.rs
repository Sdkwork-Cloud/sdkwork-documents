use sdkwork_utils_rust::{is_blank, trim};

pub fn env_optional(name: &str) -> Option<String> {
    std::env::var(name).ok().and_then(|value| {
        let normalized = trim(&value);
        if is_blank(Some(&normalized)) {
            None
        } else {
            Some(normalized)
        }
    })
}

fn normalize_optional_string(value: Option<&str>) -> Option<String> {
    value.and_then(|raw| {
        let normalized = trim(raw);
        if is_blank(Some(&normalized)) {
            None
        } else {
            Some(normalized)
        }
    })
}

fn read_secret_file(env_name: &str, path: &str) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map(|value| trim(&value))
        .map_err(|error| format!("failed to read secret file for {env_name} at {path}: {error}"))
        .and_then(|value| {
            if is_blank(Some(&value)) {
                Err(format!("secret file for {env_name} at {path} is empty"))
            } else {
                Ok(value)
            }
        })
}

pub fn config_secret_value(
    name: &str,
    file_name: &str,
    config_value: Option<&str>,
    config_file: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(value) = env_optional(name) {
        return Ok(Some(value));
    }
    if let Some(path) = env_optional(file_name).or_else(|| normalize_optional_string(config_file)) {
        return read_secret_file(file_name, &path).map(Some);
    }
    Ok(normalize_optional_string(config_value))
}

pub struct RequestLimitsConfig;

impl RequestLimitsConfig {
    pub const DEFAULT_SDK_REFERENCE_JSON_BODY_MAX_BYTES: usize = 16 * 1024 * 1024;
}
