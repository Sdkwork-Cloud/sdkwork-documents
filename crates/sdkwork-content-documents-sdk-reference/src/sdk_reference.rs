use std::time::Duration;

use axum::extract::DefaultBodyLimit;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;
use crate::config::{config_secret_value, env_optional};
use crate::api_prefixes::{APP_API_PREFIX, BACKEND_API_PREFIX, OPENAI_V1_API_PREFIX};
use sdkwork_sdk_generator::{
    GenerateFromFileRequest, GeneratedPackage, GeneratedPackageFormat, SdkGeneratorClient,
    SdkLanguage, SdkType,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::response::PlusApiResult;

const SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL: &str = "SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL";
const SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY: &str = "SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY";
const SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY_FILE: &str = "SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY_FILE";
const LEGACY_SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL: &str = "PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL";
const LEGACY_SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY: &str = "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY";
const LEGACY_SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY_FILE: &str = "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE";
const DEFAULT_SDK_NAME: &str = "SdkworkClient";
const DEFAULT_SDK_VERSION: &str = "0.1.0";
const DEFAULT_SDK_BASE_URL: &str = "https://api.sdkwork.com";
const DEFAULT_PACKAGE_NAME: &str = "@sdkwork/sdk";
const DEFAULT_DESCRIPTION: &str = "Generated SDK";
const DEFAULT_JSON_BODY_MAX_BYTES: usize =
    crate::config::RequestLimitsConfig::DEFAULT_SDK_REFERENCE_JSON_BODY_MAX_BYTES;
const MAX_SAFE_TEXT_LEN: usize = 2048;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SdkReferenceGenerationRequest {
    spec: Value,
    language: String,
    config: Option<SdkReferenceGenerationConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SdkReferenceGenerationConfig {
    name: Option<String>,
    version: Option<String>,
    language: Option<String>,
    sdk_type: Option<String>,
    output_path: Option<String>,
    api_spec_path: Option<String>,
    base_url: Option<String>,
    api_prefix: Option<String>,
    endpoint_path: Option<String>,
    endpoint_method: Option<String>,
    operation_id: Option<String>,
    package_name: Option<String>,
    author: Option<String>,
    license: Option<String>,
    description: Option<String>,
}

#[derive(Debug)]
struct NormalizedSdkReferenceRequest {
    spec: Value,
    spec_title: String,
    language: String,
    generator_language: SdkLanguage,
    name: String,
    version: String,
    sdk_type: Option<SdkType>,
    api_spec_path: Option<String>,
    base_url: String,
    api_prefix: Option<String>,
    package_name: Option<String>,
    author: Option<String>,
    license: Option<String>,
    description: Option<String>,
    selected_operation: Option<SdkReferenceOperationDoc>,
}

#[derive(Debug, Clone)]
struct SdkReferenceOperationDoc {
    path: String,
    method: String,
    operation: Value,
    path_item_parameters: Vec<Value>,
}

#[derive(Debug)]
struct SdkReferenceOperationDocumentation {
    method_definition: String,
    usage_example: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SdkReferenceDocumentationResponse {
    readme: String,
    method_definition: Option<String>,
    usage_example: Option<String>,
    language: String,
    generated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SdkReferenceArchiveResponse {
    file_name: String,
    content_type: String,
    content_base64: String,
    language: String,
}

struct SdkGeneratorRuntime {
    client: SdkGeneratorClient,
}

pub fn app_sdk_reference_router() -> Router {
    app_sdk_reference_router_with_json_body_limit(DEFAULT_JSON_BODY_MAX_BYTES)
}

pub fn app_sdk_reference_router_with_json_body_limit(json_body_max_bytes: usize) -> Router {
    Router::new()
        .route(
            "/app/v3/api/sdk_reference/documentation",
            post(generate_documentation),
        )
        .route("/app/v3/api/sdk_reference/archives", post(generate_archive))
        .layer(DefaultBodyLimit::max(json_body_max_bytes.max(1)))
}

async fn generate_documentation(Json(payload): Json<SdkReferenceGenerationRequest>) -> Response {
    let request = match normalize_generation_request(payload) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let runtime = match sdk_generator_runtime() {
        Ok(runtime) => runtime,
        Err(SdkReferenceConfigError::Unavailable) => {
            return sdk_documentation_response(&request, build_sdk_readme(&request), false)
        }
        Err(SdkReferenceConfigError::Invalid(_)) => {
            return sdk_documentation_response(&request, build_sdk_readme(&request), false)
        }
    };

    let package = match generate_sdk_package(&runtime, &request).await {
        Ok(package) => package,
        Err(_) => return sdk_documentation_response(&request, build_sdk_readme(&request), false),
    };
    let readme = extract_readme_from_zip(package.bytes.as_ref())
        .unwrap_or_else(|| build_sdk_readme(&request));
    sdk_documentation_response(&request, readme, true)
}

fn sdk_documentation_response(
    request: &NormalizedSdkReferenceRequest,
    readme: String,
    generated: bool,
) -> Response {
    let operation_documentation = request
        .selected_operation
        .as_ref()
        .map(|operation| build_operation_documentation(request, operation));
    let response = SdkReferenceDocumentationResponse {
        method_definition: operation_documentation
            .as_ref()
            .map(|documentation| documentation.method_definition.clone())
            .or_else(|| extract_first_code_block(&readme))
            .filter(|value| !value.trim().is_empty()),
        usage_example: operation_documentation
            .as_ref()
            .map(|documentation| documentation.usage_example.clone())
            .or_else(|| extract_usage_examples(&readme)),
        readme,
        language: request.language.clone(),
        generated,
    };
    Json(PlusApiResult::success(response)).into_response()
}

async fn generate_archive(Json(payload): Json<SdkReferenceGenerationRequest>) -> Response {
    let request = match normalize_generation_request(payload) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let runtime = match sdk_generator_runtime() {
        Ok(runtime) => runtime,
        Err(SdkReferenceConfigError::Unavailable) => return generator_unavailable(),
        Err(SdkReferenceConfigError::Invalid(message)) => {
            return bad_gateway(format!("SDK generator configuration is invalid: {message}"))
        }
    };

    let package = match generate_sdk_package(&runtime, &request).await {
        Ok(package) => package,
        Err(message) => return bad_gateway(message),
    };
    let response = SdkReferenceArchiveResponse {
        file_name: package
            .file_name
            .unwrap_or_else(|| generated_archive_file_name(&request)),
        content_type: package
            .content_type
            .unwrap_or_else(|| "application/zip".to_owned()),
        content_base64: BASE64_STANDARD.encode(package.bytes.as_ref()),
        language: request.language,
    };
    Json(PlusApiResult::success(response)).into_response()
}

async fn generate_sdk_package(
    runtime: &SdkGeneratorRuntime,
    request: &NormalizedSdkReferenceRequest,
) -> Result<GeneratedPackage, String> {
    let spec_bytes = serde_json::to_vec(&request.spec)
        .map_err(|error| format!("spec must be serializable JSON: {error}"))?;
    let mut generate_request = GenerateFromFileRequest::new(
        api_spec_file_name(request),
        spec_bytes,
        request.generator_language,
        request.name.clone(),
    )
    .base_url(request.base_url.clone())
    .version(request.version.clone());

    if let Some(api_prefix) = &request.api_prefix {
        generate_request = generate_request.api_prefix(api_prefix.clone());
    }
    if let Some(sdk_type) = request.sdk_type {
        generate_request = generate_request.sdk_type(sdk_type);
    }
    if let Some(package_name) = &request.package_name {
        generate_request = generate_request.package_name(package_name.clone());
    }
    if let Some(description) = &request.description {
        generate_request = generate_request.description(description.clone());
    }
    if let Some(author) = &request.author {
        generate_request = generate_request.author(author.clone());
    }
    if let Some(license) = &request.license {
        generate_request = generate_request.license(license.clone());
    }

    runtime
        .client
        .generate_from_file_and_download(generate_request, GeneratedPackageFormat::Zip)
        .await
        .map_err(|error| format!("SDK generator request failed: {error}"))
}

fn sdk_generator_runtime() -> Result<SdkGeneratorRuntime, SdkReferenceConfigError> {
    let base_url = env_optional(SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL)
        .or_else(|| env_optional(LEGACY_SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL))
        .ok_or(SdkReferenceConfigError::Unavailable)?;
    let legacy_api_key = env_optional(LEGACY_SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY);
    let legacy_api_key_file = env_optional(LEGACY_SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY_FILE);
    let api_key = config_secret_value(
        SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY,
        SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY_FILE,
        legacy_api_key.as_deref(),
        legacy_api_key_file.as_deref(),
    )
    .map_err(SdkReferenceConfigError::Invalid)?;
    let mut builder = SdkGeneratorClient::builder(base_url)
        .poll_interval(Duration::from_millis(200))
        .max_poll_attempts(300);
    if let Some(api_key) = api_key {
        builder = builder.api_key(api_key);
    }
    let client = builder
        .build()
        .map_err(|error| SdkReferenceConfigError::Invalid(error.to_string()))?;
    Ok(SdkGeneratorRuntime { client })
}

fn normalize_generation_request(
    payload: SdkReferenceGenerationRequest,
) -> Result<NormalizedSdkReferenceRequest, String> {
    let spec = require_json_object(&payload.spec, "spec")?;
    let info = require_json_object(
        spec.get("info")
            .ok_or_else(|| "spec.info must be a JSON object".to_owned())?,
        "spec.info",
    )?;
    let spec_title =
        require_non_empty_string(info.get("title"), "spec.info.title", MAX_SAFE_TEXT_LEN)?;
    require_non_empty_string(info.get("version"), "spec.info.version", 128)?;
    let paths = require_json_object(
        spec.get("paths")
            .ok_or_else(|| "spec.paths must be a JSON object".to_owned())?,
        "spec.paths",
    )?;

    let language = normalize_token(&payload.language, "language")?;
    let generator_language = sdk_generator_language(&language)?;
    let config = payload.config;
    let _config_language_hint = config.as_ref().and_then(|value| value.language.as_deref());
    let name = optional_safe_text(
        config.as_ref().and_then(|value| value.name.as_deref()),
        "config.name",
        128,
    )?
    .unwrap_or_else(|| DEFAULT_SDK_NAME.to_owned());
    let version = optional_safe_text(
        config.as_ref().and_then(|value| value.version.as_deref()),
        "config.version",
        64,
    )?
    .unwrap_or_else(|| DEFAULT_SDK_VERSION.to_owned());
    let configured_sdk_type = config
        .as_ref()
        .and_then(|value| value.sdk_type.as_deref())
        .map(|value| sdk_generator_type(&normalize_token(value, "config.sdkType")?))
        .transpose()?;
    let sdk_type = configured_sdk_type.or_else(|| infer_sdk_type_from_paths(paths));
    let base_url = config
        .as_ref()
        .and_then(|value| value.base_url.as_deref())
        .map(|value| normalize_base_url(value, "config.baseUrl"))
        .transpose()?
        .unwrap_or_else(|| DEFAULT_SDK_BASE_URL.to_owned());
    let api_prefix = optional_api_prefix(
        config
            .as_ref()
            .and_then(|value| value.api_prefix.as_deref()),
        sdk_type,
        "config.apiPrefix",
    )?;
    let api_spec_path = optional_safe_text(
        config
            .as_ref()
            .and_then(|value| value.api_spec_path.as_deref()),
        "config.apiSpecPath",
        512,
    )?;
    let package_name = optional_safe_text(
        config
            .as_ref()
            .and_then(|value| value.package_name.as_deref()),
        "config.packageName",
        256,
    )?
    .or_else(|| Some(DEFAULT_PACKAGE_NAME.to_owned()));
    let author = optional_safe_text(
        config.as_ref().and_then(|value| value.author.as_deref()),
        "config.author",
        128,
    )?;
    let license = optional_safe_text(
        config.as_ref().and_then(|value| value.license.as_deref()),
        "config.license",
        64,
    )?;
    let description = optional_safe_text(
        config
            .as_ref()
            .and_then(|value| value.description.as_deref()),
        "config.description",
        512,
    )?
    .or_else(|| Some(DEFAULT_DESCRIPTION.to_owned()));
    let _ = optional_safe_text(
        config
            .as_ref()
            .and_then(|value| value.output_path.as_deref()),
        "config.outputPath",
        512,
    )?;
    let selected_operation = select_sdk_reference_operation(&payload.spec, paths, config.as_ref())?;

    Ok(NormalizedSdkReferenceRequest {
        spec: payload.spec,
        spec_title,
        language,
        generator_language,
        name,
        version,
        sdk_type,
        api_spec_path,
        base_url,
        api_prefix,
        package_name,
        author,
        license,
        description,
        selected_operation,
    })
}

fn require_json_object<'a>(
    value: &'a Value,
    field: &str,
) -> Result<&'a Map<String, Value>, String> {
    value
        .as_object()
        .ok_or_else(|| format!("{field} must be a JSON object"))
}

fn require_non_empty_string(
    value: Option<&Value>,
    field: &str,
    max_len: usize,
) -> Result<String, String> {
    let value = value
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{field} must be a non-empty string"))?
        .trim();
    if value.is_empty()
        || value.chars().count() > max_len
        || value.chars().any(|character| character.is_control())
    {
        return Err(format!(
            "{field} must be a non-empty string with at most {max_len} characters"
        ));
    }
    Ok(value.to_owned())
}

fn optional_safe_text(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || value.chars().any(|character| character.is_control()) {
        return Err(format!(
            "{field} must not contain control characters and must be at most {max_len} characters"
        ));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_token(value: &str, field: &str) -> Result<String, String> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty()
        || value.len() > 64
        || !value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-' | '/')
        })
    {
        return Err(format!("{field} must be 1-64 ASCII token characters"));
    }
    Ok(value)
}

fn normalize_api_path(value: &str, field: &str) -> Result<String, String> {
    let value = value.trim();
    if !value.starts_with('/')
        || value.starts_with("//")
        || value.contains('\\')
        || value.chars().any(|character| character.is_control())
        || value.contains('?')
        || value.contains('#')
    {
        return Err(format!(
            "{field} must start with / and must not contain query strings or control characters"
        ));
    }
    let value = value.trim_end_matches('/');
    Ok(if value.is_empty() { "/" } else { value }.to_owned())
}

fn optional_api_prefix(
    value: Option<&str>,
    sdk_type: Option<SdkType>,
    field: &str,
) -> Result<Option<String>, String> {
    let explicit = match value {
        Some(value) => {
            let value = value.trim();
            if value.is_empty() || value == "/" {
                None
            } else {
                Some(normalize_api_path(value, field)?)
            }
        }
        None => None,
    };
    Ok(explicit.or_else(|| default_api_prefix_for_sdk_type(sdk_type)))
}

fn default_api_prefix_for_sdk_type(sdk_type: Option<SdkType>) -> Option<String> {
    match sdk_type? {
        SdkType::App => Some(APP_API_PREFIX.to_owned()),
        SdkType::Backend => Some(BACKEND_API_PREFIX.to_owned()),
        SdkType::Ai => Some(OPENAI_V1_API_PREFIX.to_owned()),
        SdkType::Custom => None,
    }
}

fn infer_sdk_type_from_paths(paths: &Map<String, Value>) -> Option<SdkType> {
    let mut inferred = None;
    for path in paths.keys() {
        let candidate = if has_api_prefix(path, BACKEND_API_PREFIX) {
            Some(SdkType::Backend)
        } else if has_api_prefix(path, APP_API_PREFIX) {
            Some(SdkType::App)
        } else if has_api_prefix(path, OPENAI_V1_API_PREFIX) {
            Some(SdkType::Ai)
        } else {
            None
        };
        let Some(candidate) = candidate else {
            continue;
        };
        if inferred.is_some_and(|existing| existing != candidate) {
            return None;
        }
        inferred = Some(candidate);
    }
    inferred
}

fn has_api_prefix(path: &str, prefix: &str) -> bool {
    path == prefix
        || path
            .strip_prefix(prefix)
            .is_some_and(|suffix| suffix.starts_with('/'))
}

fn normalize_base_url(value: &str, field: &str) -> Result<String, String> {
    let value = value.trim();
    if value.starts_with('/') {
        return normalize_api_path(value, field);
    }
    let parsed = value
        .parse::<axum::http::Uri>()
        .map_err(|_| format!("{field} must be an HTTP or HTTPS URL or root-relative path"))?;
    if !matches!(parsed.scheme_str(), Some("http" | "https"))
        || parsed.authority().is_none()
        || parsed.query().is_some()
        || value.contains('#')
    {
        return Err(format!(
            "{field} must be an HTTP or HTTPS URL or root-relative path without query strings"
        ));
    }
    Ok(value.trim_end_matches('/').to_owned())
}

fn select_sdk_reference_operation(
    spec: &Value,
    paths: &Map<String, Value>,
    config: Option<&SdkReferenceGenerationConfig>,
) -> Result<Option<SdkReferenceOperationDoc>, String> {
    let endpoint_path = optional_safe_text(
        config.and_then(|value| value.endpoint_path.as_deref()),
        "config.endpointPath",
        512,
    )?;
    let endpoint_method = config
        .and_then(|value| value.endpoint_method.as_deref())
        .map(|value| normalize_http_method(value, "config.endpointMethod"))
        .transpose()?;
    let operation_id = optional_safe_text(
        config.and_then(|value| value.operation_id.as_deref()),
        "config.operationId",
        256,
    )?;

    if let Some(path) = endpoint_path.as_deref() {
        let path_item = paths
            .get(path)
            .and_then(Value::as_object)
            .ok_or_else(|| "config.endpointPath must match a path in spec.paths".to_owned())?;
        let method = match endpoint_method.as_deref() {
            Some(method) => method.to_owned(),
            None => first_operation_method(path_item).ok_or_else(|| {
                "config.endpointPath must contain an OpenAPI operation".to_owned()
            })?,
        };
        let operation = path_item
            .get(&method)
            .and_then(Value::as_object)
            .ok_or_else(|| {
                "config.endpointMethod must match an operation on config.endpointPath".to_owned()
            })?;
        if let Some(operation_id) = operation_id.as_deref() {
            let actual_operation_id = operation
                .get("operationId")
                .and_then(Value::as_str)
                .unwrap_or_default();
            if actual_operation_id != operation_id {
                return Err(
                    "config.operationId must match the selected OpenAPI operation".to_owned(),
                );
            }
        }
        return Ok(Some(SdkReferenceOperationDoc {
            path: path.to_owned(),
            method,
            operation: Value::Object(operation.clone()),
            path_item_parameters: path_item_parameters(path_item),
        }));
    }

    if let Some(operation_id) = operation_id.as_deref() {
        return Ok(find_operation_by_id(paths, operation_id));
    }

    Ok(first_operation(paths).or_else(|| first_operation_from_spec(spec)))
}

fn normalize_http_method(value: &str, field: &str) -> Result<String, String> {
    let method = normalize_token(value, field)?;
    if matches!(method.as_str(), "get" | "post" | "put" | "patch" | "delete") {
        Ok(method)
    } else {
        Err(format!("{field} must be an HTTP operation method"))
    }
}

fn first_operation_method(path_item: &Map<String, Value>) -> Option<String> {
    for method in ["get", "post", "put", "patch", "delete"] {
        if path_item.get(method).is_some_and(Value::is_object) {
            return Some(method.to_owned());
        }
    }
    None
}

fn path_item_parameters(path_item: &Map<String, Value>) -> Vec<Value> {
    path_item
        .get("parameters")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

fn find_operation_by_id(
    paths: &Map<String, Value>,
    operation_id: &str,
) -> Option<SdkReferenceOperationDoc> {
    iter_operations(paths).into_iter().find(|operation| {
        operation
            .operation
            .get("operationId")
            .and_then(Value::as_str)
            .is_some_and(|value| value == operation_id)
    })
}

fn first_operation(paths: &Map<String, Value>) -> Option<SdkReferenceOperationDoc> {
    iter_operations(paths).into_iter().next()
}

fn first_operation_from_spec(spec: &Value) -> Option<SdkReferenceOperationDoc> {
    spec.get("paths")
        .and_then(Value::as_object)
        .and_then(first_operation)
}

fn iter_operations(paths: &Map<String, Value>) -> Vec<SdkReferenceOperationDoc> {
    let mut operations = Vec::new();
    for (path, path_item_value) in paths {
        let Some(path_item) = path_item_value.as_object() else {
            continue;
        };
        let path_parameters = path_item_parameters(path_item);
        for method in ["get", "post", "put", "patch", "delete"] {
            let Some(operation) = path_item.get(method).and_then(Value::as_object) else {
                continue;
            };
            operations.push(SdkReferenceOperationDoc {
                path: path.clone(),
                method: method.to_owned(),
                operation: Value::Object(operation.clone()),
                path_item_parameters: path_parameters.clone(),
            });
        }
    }
    operations
}

fn sdk_generator_language(language: &str) -> Result<SdkLanguage, String> {
    match language {
        "typescript" | "javascript" => Ok(SdkLanguage::TypeScript),
        "dart" => Ok(SdkLanguage::Dart),
        "python" => Ok(SdkLanguage::Python),
        "go" => Ok(SdkLanguage::Go),
        "java" => Ok(SdkLanguage::Java),
        "kotlin" => Ok(SdkLanguage::Kotlin),
        "swift" => Ok(SdkLanguage::Swift),
        "csharp" => Ok(SdkLanguage::CSharp),
        "flutter" => Ok(SdkLanguage::Flutter),
        "rust" => Ok(SdkLanguage::Rust),
        "php" => Ok(SdkLanguage::Php),
        "ruby" => Ok(SdkLanguage::Ruby),
        _ => Err(format!(
            "language {language} is not supported for SDK generation"
        )),
    }
}

fn sdk_generator_type(sdk_type: &str) -> Result<SdkType, String> {
    match sdk_type {
        "app" => Ok(SdkType::App),
        "backend" => Ok(SdkType::Backend),
        "ai" => Ok(SdkType::Ai),
        "cloud-services" => Ok(SdkType::Custom),
        "custom" => Ok(SdkType::Custom),
        _ => Err(format!("config.sdkType {sdk_type} is not supported")),
    }
}

fn api_spec_file_name(request: &NormalizedSdkReferenceRequest) -> String {
    request
        .api_spec_path
        .as_deref()
        .and_then(|path| path.rsplit('/').next())
        .filter(|file_name| {
            !file_name.is_empty()
                && file_name.contains('.')
                && !file_name.contains(['\\', '\r', '\n'])
        })
        .unwrap_or("openapi.json")
        .to_owned()
}

fn generated_archive_file_name(request: &NormalizedSdkReferenceRequest) -> String {
    let identity = request
        .package_name
        .as_deref()
        .unwrap_or(&request.name)
        .trim_start_matches('@');
    let package = safe_archive_slug(identity).unwrap_or_else(|| "sdk".to_owned());
    let language = safe_archive_slug(&request.language).unwrap_or_else(|| "typescript".to_owned());
    let version = safe_archive_slug(&request.version).unwrap_or_else(|| "0.1.0".to_owned());
    format!("{package}-{language}-{version}.zip")
}

fn safe_archive_slug(value: &str) -> Option<String> {
    let slug = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else if matches!(character, '-' | '_' | '/' | '.') {
                '-'
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    (!slug.is_empty()).then_some(slug)
}

fn build_sdk_readme(request: &NormalizedSdkReferenceRequest) -> String {
    let package_name = request
        .package_name
        .as_deref()
        .unwrap_or(DEFAULT_PACKAGE_NAME);
    let description = request
        .description
        .as_deref()
        .unwrap_or(DEFAULT_DESCRIPTION);
    format!(
        "# {name}\n\n{description}\n\n## Package\n\n`{package_name}`\n\n## Version\n\n`{version}`\n\n## API\n\n{spec_title}\n\n## Base URL\n\n`{base_url}`\n\n## Installation\n\n```shell\n{install_command}\n```\n\n## Quick Start\n\n```{fence_language}\n{quick_start}\n```\n\n## Usage Examples\n\n```{fence_language}\n{usage_example}\n```\n",
        name = request.name,
        description = description,
        package_name = package_name,
        version = request.version,
        spec_title = request.spec_title,
        base_url = request.base_url,
        install_command = install_command(&request.language, package_name),
        fence_language = code_fence_language(&request.language),
        quick_start = quick_start_snippet(request, package_name),
        usage_example = usage_example_snippet(request),
    )
}

fn build_operation_documentation(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
) -> SdkReferenceOperationDocumentation {
    let language = request.language.as_str();
    let surface = sdk_operation_surface(request, operation, language);
    let operation_parameters = operation_parameters(operation, language);
    let path_parameters = operation_parameters
        .iter()
        .filter(|parameter| parameter.location == "path")
        .cloned()
        .collect::<Vec<_>>();
    let query_parameters = operation_parameters
        .iter()
        .filter(|parameter| parameter.location == "query")
        .cloned()
        .collect::<Vec<_>>();
    let has_path_params = !path_parameters.is_empty();
    let has_query_params = !query_parameters.is_empty();
    let has_body = request_schema(operation).is_some();
    let params_required = query_parameters.iter().any(|parameter| parameter.required);
    let params_type = if has_query_params {
        format!(
            "{}{}Params",
            surface.class_base_name,
            to_pascal_case(&split_identifier(&surface.method_name))
        )
    } else {
        String::new()
    };
    let body_type =
        request_schema_name(operation).unwrap_or_else(|| fallback_object_type(language));
    let response_type = response_schema_type_name(operation, language)
        .unwrap_or_else(|| fallback_void_type(language));
    let signature = sdk_signature(
        language,
        &surface.method_name,
        &params_type,
        &body_type,
        &response_type,
        has_query_params,
        has_body,
        params_required,
        has_path_params,
        &path_parameters,
    );
    let method_definition = sdk_method_definition(
        operation,
        language,
        &signature,
        &path_parameters,
        &query_parameters,
        &params_type,
        &body_type,
        &response_type,
        has_query_params,
        has_body,
    );
    let usage_example = sdk_usage_example(
        request,
        operation,
        language,
        &surface,
        &path_parameters,
        &query_parameters,
        has_query_params,
        has_body,
    );
    SdkReferenceOperationDocumentation {
        method_definition,
        usage_example,
    }
}

#[derive(Debug, Clone)]
struct SdkOperationParameter {
    name: String,
    sdk_name: String,
    location: String,
    type_label: String,
    description: String,
    required: bool,
}

#[derive(Debug)]
struct SdkOperationSurface {
    client_path: Vec<String>,
    method_name: String,
    class_base_name: String,
}

fn sdk_method_definition(
    operation: &SdkReferenceOperationDoc,
    language: &str,
    signature: &str,
    path_parameters: &[SdkOperationParameter],
    query_parameters: &[SdkOperationParameter],
    params_type: &str,
    body_type: &str,
    response_type: &str,
    has_query_params: bool,
    has_body: bool,
) -> String {
    if language == "python" {
        let mut lines = vec![
            format!("{signature}:"),
            "    \"\"\"".to_owned(),
            format!("    {}", operation_description(operation)),
        ];
        if !path_parameters.is_empty() || has_query_params || has_body {
            lines.push(String::new());
            lines.push("    Args:".to_owned());
        }
        for parameter in path_parameters {
            lines.push(format!(
                "        {}: OpenAPI path parameter `{}`. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!("        params: {params_type} query parameters."));
            for parameter in query_parameters {
                lines.push(format!(
                    "        params.{}: {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!("        body: {body_type} JSON request body."));
        }
        lines.push(String::new());
        lines.push("    Returns:".to_owned());
        lines.push(format!("        {response_type}"));
        lines.push("    \"\"\"".to_owned());
        return lines.join("\n");
    }

    if language == "go" {
        let mut lines = vec![format!("// {}", operation_description(operation))];
        for parameter in path_parameters {
            lines.push(format!(
                "// {}: OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(
                "// params is a {params_type} value containing query parameters."
            ));
            for parameter in query_parameters {
                lines.push(format!(
                    "// params.{}: {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!("// body is a {body_type} JSON request body."));
        }
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if language == "java" {
        let mut lines = vec![
            "/**".to_owned(),
            format!(" * {}", operation_description(operation)),
        ];
        for parameter in path_parameters {
            lines.push(format!(
                " * @param {} OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(" * @param params {params_type} query parameters."));
            for parameter in query_parameters {
                lines.push(format!(
                    " * @param params.{} {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!(" * @param body {body_type} JSON request body."));
        }
        lines.push(format!(" * @return {response_type}"));
        lines.push(" */".to_owned());
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if language == "ruby" {
        let mut lines = vec![format!("# {}", operation_description(operation))];
        for parameter in path_parameters {
            lines.push(format!(
                "# @param {} [{}] OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.type_label, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!("# @param params [{params_type}] query parameters."));
            for parameter in query_parameters {
                lines.push(format!(
                    "# @param params.{} [{}] {}",
                    parameter.sdk_name, parameter.type_label, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!("# @param body [{body_type}] JSON request body."));
        }
        lines.push(format!("# @return [{response_type}]"));
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if language == "php" {
        let mut lines = vec![
            "/**".to_owned(),
            format!(" * {}", operation_description(operation)),
        ];
        for parameter in path_parameters {
            lines.push(format!(
                " * @param mixed ${} OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(
                " * @param array $requestParams {params_type} query parameters."
            ));
            for parameter in query_parameters {
                lines.push(format!(
                    " * @param mixed $requestParams['{}'] {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!(
                " * @param array $body {body_type} JSON request body."
            ));
        }
        lines.push(format!(" * @return {response_type}"));
        lines.push(" */".to_owned());
        lines.push(format!("{signature};"));
        return lines.join("\n");
    }

    if language == "csharp" {
        let mut lines = vec![
            "/// <summary>".to_owned(),
            format!("/// {}", operation_description(operation)),
            "/// </summary>".to_owned(),
        ];
        for parameter in path_parameters {
            lines.push(format!(
                "/// <param name=\"{}\">OpenAPI path parameter {}. {}</param>",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(
                "/// <param name=\"requestParams\">{params_type} query parameters.</param>"
            ));
            for parameter in query_parameters {
                lines.push(format!(
                    "/// <param name=\"requestParams.{}\">{}</param>",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!(
                "/// <param name=\"body\">{body_type} JSON request body.</param>"
            ));
        }
        lines.push(format!("/// <returns>{response_type}</returns>"));
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if language == "rust" {
        let mut lines = vec![format!("/// {}", operation_description(operation))];
        for parameter in path_parameters {
            lines.push(format!(
                "/// {}: OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!("/// params: {params_type} query parameters."));
            for parameter in query_parameters {
                lines.push(format!(
                    "/// params.{}: {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!("/// body: {body_type} JSON request body."));
        }
        lines.push(format!("/// Returns {response_type}."));
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if language == "swift" {
        let mut lines = vec![format!("/// {}", operation_description(operation))];
        for parameter in path_parameters {
            lines.push(format!(
                "/// - Parameter {}: OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(
                "/// - Parameter params: {params_type} query parameters."
            ));
            for parameter in query_parameters {
                lines.push(format!(
                    "///   - {}: {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!(
                "/// - Parameter body: {body_type} JSON request body."
            ));
        }
        lines.push(format!("/// - Returns: {response_type}"));
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if language == "kotlin" {
        let mut lines = vec![
            "/**".to_owned(),
            format!(" * {}", operation_description(operation)),
        ];
        for parameter in path_parameters {
            lines.push(format!(
                " * @param {} OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(" * @param params {params_type} query parameters."));
            for parameter in query_parameters {
                lines.push(format!(
                    " * @param params.{} {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!(" * @param body {body_type} JSON request body."));
        }
        lines.push(format!(" * @return {response_type}"));
        lines.push(" */".to_owned());
        lines.push(signature.to_owned());
        return lines.join("\n");
    }

    if matches!(language, "flutter" | "dart") {
        let mut lines = vec![format!("/// {}", operation_description(operation))];
        for parameter in path_parameters {
            lines.push(format!(
                "/// [{}] is OpenAPI path parameter {}. {}",
                parameter.sdk_name, parameter.name, parameter.description
            ));
        }
        if has_query_params {
            lines.push(format!(
                "/// [params] is a {params_type} value containing query parameters."
            ));
            for parameter in query_parameters {
                lines.push(format!(
                    "/// params.{}: {}",
                    parameter.sdk_name, parameter.description
                ));
            }
        }
        if has_body {
            lines.push(format!("/// [body] is a {body_type} JSON request body."));
        }
        lines.push(format!("/// Returns {response_type}."));
        lines.push(format!("{signature};"));
        return lines.join("\n");
    }

    let mut lines = Vec::new();
    if has_query_params {
        lines.push(format!("export interface {params_type} {{"));
        for parameter in query_parameters {
            lines.push(format!(
                "  /** OpenAPI {} parameter `{}`. {} */",
                parameter.location, parameter.name, parameter.description
            ));
            lines.push(format!(
                "  {}{}: {};",
                parameter.sdk_name,
                if parameter.required { "" } else { "?" },
                parameter.type_label
            ));
        }
        lines.push("}".to_owned());
        lines.push(String::new());
    }
    lines.push("/**".to_owned());
    lines.push(format!(" * {}", operation_description(operation)));
    for parameter in path_parameters {
        lines.push(format!(
            " * @param {} - OpenAPI path parameter `{}`. {}",
            parameter.sdk_name, parameter.name, parameter.description
        ));
    }
    if has_query_params {
        lines.push(format!(
            " * @param params - {params_type} query parameters."
        ));
        for parameter in query_parameters {
            lines.push(format!(
                " * @param params.{} - {}",
                parameter.sdk_name, parameter.description
            ));
        }
    }
    if has_body {
        lines.push(format!(" * @param body - {body_type} JSON request body."));
    }
    lines.push(format!(" * @returns {response_type}"));
    lines.push(" */".to_owned());
    lines.push(signature.to_owned());
    lines.join("\n")
}

fn sdk_usage_example(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    language: &str,
    surface: &SdkOperationSurface,
    path_parameters: &[SdkOperationParameter],
    query_parameters: &[SdkOperationParameter],
    has_query_params: bool,
    has_body: bool,
) -> String {
    if language == "python" {
        let args = sdk_call_arguments(
            request,
            language,
            path_parameters,
            query_parameters,
            operation,
            has_query_params,
            has_body,
        );
        let method_call = format!(
            "client.{}.{}({args})",
            surface.client_path.join("."),
            surface.method_name
        );
        return format!(
            "from {module_name} import {client_name}\n\nclient = {client_name}(\n    base_url=\"{base_url}\",\n    api_key=\"YOUR_API_KEY\",\n)\n\nresponse = {method_call}\nprint(response)",
            module_name = request
                .package_name
                .as_deref()
                .unwrap_or(DEFAULT_PACKAGE_NAME)
                .replace(['-', '@', '/'], "_")
                .trim_matches('_')
                .to_owned(),
            client_name = request.name,
            base_url = request.base_url,
            method_call = method_call,
        );
    }

    if language == "go" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "package main\n\nimport (\n  \"context\"\n  \"fmt\"\n)\n\nfunc main() {{\n  client := {client_name}.New(\"{base_url}\", \"YOUR_API_KEY\")\n  {params_block}response, err := {method_call}\n  if err != nil {{\n    panic(err)\n  }}\n  fmt.Println(response)\n}}",
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "java" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "import {package_name}.{client_name};\n\npublic class Main {{\n  public static void main(String[] args) {{\n    {client_name} client = {client_name}.builder()\n        .baseUrl(\"{base_url}\")\n        .apiKey(\"YOUR_API_KEY\")\n        .build();\n    {params_block}Object response = {method_call};\n    System.out.println(response);\n  }}\n}}",
            package_name = request.package_name.as_deref().unwrap_or(DEFAULT_PACKAGE_NAME),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "ruby" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "require '{package_name}'\n\nclient = {client_name}.new(\n  base_url: '{base_url}',\n  api_key: 'YOUR_API_KEY'\n)\n\n{params_block}response = {method_call}\nputs response",
            package_name = request
                .package_name
                .as_deref()
                .unwrap_or(DEFAULT_PACKAGE_NAME)
                .replace('-', "_"),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "php" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "<?php\nrequire_once 'vendor/autoload.php';\n\n$client = new {client_name}([\n  'base_url' => '{base_url}',\n  'api_key' => 'YOUR_API_KEY',\n]);\n\n{params_block}$response = {method_call};\nprint_r($response);",
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "csharp" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "using {package_name};\n\nvar client = new {client_name}(\"{base_url}\", \"YOUR_API_KEY\");\n{params_block}var response = await {method_call};\nConsole.WriteLine(response);",
            package_name = request.package_name.as_deref().unwrap_or(DEFAULT_PACKAGE_NAME),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "rust" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "use {package_name}::{client_name};\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {{\n  let client = {client_name}::new(\"{base_url}\", \"YOUR_API_KEY\");\n  {params_block}let response = {method_call};\n  println!(\"{{:?}}\", response);\n  Ok(())\n}}",
            package_name = request
                .package_name
                .as_deref()
                .unwrap_or(DEFAULT_PACKAGE_NAME)
                .replace(['-', '@', '/'], "_")
                .trim_matches('_')
                .to_owned(),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "swift" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "import {package_name}\n\nlet client = {client_name}(\n  baseURL: \"{base_url}\",\n  apiKey: \"YOUR_API_KEY\"\n)\n\n{params_block}let response = try await {method_call}\nprint(response)",
            package_name = swift_module_name(request.package_name.as_deref().unwrap_or(DEFAULT_PACKAGE_NAME)),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if language == "kotlin" {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "import {package_name}.{client_name}\n\nsuspend fun main() {{\n  val client = {client_name}(\n    baseUrl = \"{base_url}\",\n    apiKey = \"YOUR_API_KEY\"\n  )\n\n  {params_block}val response = {method_call}\n  println(response)\n}}",
            package_name = kotlin_package_name(request.package_name.as_deref().unwrap_or(DEFAULT_PACKAGE_NAME)),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    if matches!(language, "flutter" | "dart") {
        let params_block = sdk_variable_blocks(
            language,
            path_parameters,
            query_parameters,
            operation,
            request,
            has_query_params,
            has_body,
        );
        let method_call = sdk_named_argument_method_call(
            language,
            surface,
            path_parameters,
            has_query_params,
            has_body,
        );
        return format!(
            "import 'package:{package_name}/{package_name}.dart';\n\nvoid main() async {{\n  final client = {client_name}(\n    baseUrl: '{base_url}',\n    apiKey: 'YOUR_API_KEY',\n  );\n\n  {params_block}final response = await {method_call};\n  print(response);\n}}",
            package_name = request.package_name.as_deref().unwrap_or(DEFAULT_PACKAGE_NAME),
            client_name = request.name,
            base_url = request.base_url,
            params_block = params_block,
            method_call = method_call,
        );
    }

    let args = sdk_call_arguments(
        request,
        language,
        path_parameters,
        query_parameters,
        operation,
        has_query_params,
        has_body,
    );
    let method_call = format!(
        "client.{}.{}({args})",
        surface.client_path.join("."),
        surface.method_name
    );
    format!(
        "import {{ {client_name} }} from \"{package_name}\";\n\nconst client = new {client_name}({{\n  baseUrl: \"{base_url}\",\n  apiKey: process.env.SDKWORK_API_KEY,\n}});\n\nasync function main() {{\n  const response = await {method_call};\n  console.log(response);\n}}\n\nmain();",
        client_name = request.name,
        package_name = request.package_name.as_deref().unwrap_or(DEFAULT_PACKAGE_NAME),
        base_url = request.base_url,
        method_call = method_call,
    )
}

fn sdk_call_arguments(
    request: &NormalizedSdkReferenceRequest,
    language: &str,
    path_parameters: &[SdkOperationParameter],
    query_parameters: &[SdkOperationParameter],
    operation: &SdkReferenceOperationDoc,
    has_query_params: bool,
    has_body: bool,
) -> String {
    let mut arguments = Vec::new();
    for parameter in path_parameters {
        arguments.push(parameter_example(parameter, language));
    }
    if has_body {
        let body_fields = body_example_fields(request, operation);
        let body_fields = body_fields
            .iter()
            .map(|(name, value)| (name.as_str(), value.clone()))
            .collect::<Vec<_>>();
        arguments.push(format_object_literal(language, body_fields.as_slice()));
    }
    if has_query_params {
        arguments.push(format_object_literal(
            language,
            query_parameters
                .iter()
                .map(|parameter| {
                    (
                        parameter.sdk_name.as_str(),
                        parameter_example(parameter, language),
                    )
                })
                .collect::<Vec<_>>()
                .as_slice(),
        ));
    }
    arguments.join(", ")
}

fn sdk_variable_blocks(
    language: &str,
    path_parameters: &[SdkOperationParameter],
    query_parameters: &[SdkOperationParameter],
    operation: &SdkReferenceOperationDoc,
    request: &NormalizedSdkReferenceRequest,
    has_query_params: bool,
    has_body: bool,
) -> String {
    let mut lines = Vec::new();
    for parameter in path_parameters {
        lines.push(format!(
            "{}{}",
            sdk_variable_declaration_prefix(language, &parameter.sdk_name),
            parameter_example(parameter, language)
        ));
    }
    if has_query_params {
        let params = format_object_literal(
            language,
            query_parameters
                .iter()
                .map(|parameter| {
                    (
                        parameter.sdk_name.as_str(),
                        parameter_example(parameter, language),
                    )
                })
                .collect::<Vec<_>>()
                .as_slice(),
        );
        lines.push(format!(
            "{}{}",
            sdk_variable_declaration_prefix(language, sdk_params_variable_name(language)),
            params
        ));
    }
    if has_body {
        let body_fields = body_example_fields(request, operation);
        let body_fields = body_fields
            .iter()
            .map(|(name, value)| (name.as_str(), value.clone()))
            .collect::<Vec<_>>();
        let body = format_object_literal(language, body_fields.as_slice());
        lines.push(format!(
            "{}{}",
            sdk_variable_declaration_prefix(language, sdk_body_variable_name(language)),
            body
        ));
    }
    if lines.is_empty() {
        String::new()
    } else {
        format!("{}\n  ", lines.join(";\n  "))
    }
}

fn sdk_variable_declaration_prefix(language: &str, name: &str) -> String {
    match language {
        "go" => format!("{name} := "),
        "java" => format!("Object {name} = "),
        "ruby" => format!("{name} = "),
        "php" => format!("${name} = "),
        "csharp" => format!("var {name} = "),
        "rust" => format!("let {name} = "),
        "swift" => format!("let {name} = "),
        "kotlin" => format!("val {name} = "),
        "flutter" | "dart" => format!("final {name} = "),
        _ => format!("{name} = "),
    }
}

fn sdk_params_variable_name(language: &str) -> &str {
    match language {
        "csharp" => "requestParams",
        "php" => "requestParams",
        _ => "params",
    }
}

fn sdk_body_variable_name(_language: &str) -> &str {
    "body"
}

fn sdk_named_argument_method_call(
    language: &str,
    surface: &SdkOperationSurface,
    path_parameters: &[SdkOperationParameter],
    has_query_params: bool,
    has_body: bool,
) -> String {
    let mut arguments = path_parameters
        .iter()
        .map(|parameter| sdk_variable_reference(language, &parameter.sdk_name))
        .collect::<Vec<_>>();
    if has_body {
        arguments.push(sdk_variable_reference(
            language,
            sdk_body_variable_name(language),
        ));
    }
    if has_query_params {
        arguments.push(sdk_variable_reference(
            language,
            sdk_params_variable_name(language),
        ));
    }
    let args = arguments.join(", ");
    match language {
        "go" => {
            let context_args = if args.is_empty() {
                "context.Background()".to_owned()
            } else {
                format!("context.Background(), {args}")
            };
            format!(
                "client.{}.{}({context_args})",
                surface.client_path.join("."),
                surface.method_name
            )
        }
        "java" => format!(
            "client.{}().{}({args})",
            surface.client_path.join("."),
            surface.method_name
        ),
        "php" => format!(
            "$client->{}()->{}({args})",
            surface.client_path.join("()->"),
            surface.method_name
        ),
        "csharp" => format!(
            "client.{}.{}Async({args})",
            surface.client_path.join("."),
            surface.method_name
        ),
        "rust" => format!(
            "client.{}().{}({args}).await?",
            surface.client_path.join("()."),
            surface.method_name
        ),
        _ => format!(
            "client.{}.{}({args})",
            surface.client_path.join("."),
            surface.method_name
        ),
    }
}

fn sdk_variable_reference(language: &str, name: &str) -> String {
    if language == "php" {
        format!("${name}")
    } else {
        name.to_owned()
    }
}

fn format_object_literal(language: &str, fields: &[(&str, String)]) -> String {
    if fields.is_empty() {
        return match language {
            "go" => "map[string]any{}".to_owned(),
            "java" => "Map.of()".to_owned(),
            "php" => "[]".to_owned(),
            "csharp" => "new Dictionary<string, object?>()".to_owned(),
            "rust" => "serde_json::json!({})".to_owned(),
            "swift" => "[:]".to_owned(),
            "kotlin" => "emptyMap<String, Any?>()".to_owned(),
            _ => "{}".to_owned(),
        };
    }
    if language == "go" {
        let mut lines = vec!["map[string]any{".to_owned()];
        for (name, value) in fields {
            lines.push(format!("    \"{name}\": {value},"));
        }
        lines.push("  }".to_owned());
        return lines.join("\n");
    }
    if language == "java" {
        let mut entries = Vec::new();
        for (name, value) in fields {
            entries.push(format!("    \"{name}\", {value}"));
        }
        return format!("Map.of(\n{}\n  )", entries.join(",\n"));
    }
    if language == "php" {
        let mut lines = vec!["[".to_owned()];
        for (name, value) in fields {
            lines.push(format!("    '{name}' => {value},"));
        }
        lines.push("  ]".to_owned());
        return lines.join("\n");
    }
    if language == "csharp" {
        let mut lines = vec!["new Dictionary<string, object?> {".to_owned()];
        for (name, value) in fields {
            lines.push(format!("    [\"{name}\"] = {value},"));
        }
        lines.push("  }".to_owned());
        return lines.join("\n");
    }
    if language == "rust" {
        let mut lines = vec!["serde_json::json!({".to_owned()];
        for (name, value) in fields {
            lines.push(format!("    \"{name}\": {value},"));
        }
        lines.push("  })".to_owned());
        return lines.join("\n");
    }
    if language == "swift" {
        let mut lines = vec!["[".to_owned()];
        for (name, value) in fields {
            lines.push(format!("    \"{name}\": {value},"));
        }
        lines.push("  ]".to_owned());
        return lines.join("\n");
    }
    if language == "kotlin" {
        let mut lines = vec!["mapOf(".to_owned()];
        for (name, value) in fields {
            lines.push(format!("    \"{name}\" to {value},"));
        }
        lines.push("  )".to_owned());
        return lines.join("\n");
    }
    if matches!(language, "ruby" | "flutter" | "dart") {
        let mut lines = vec!["{".to_owned()];
        for (name, value) in fields {
            let key = if language == "ruby" {
                format!("{name}:")
            } else {
                format!("'{name}':")
            };
            lines.push(format!("    {key} {value},"));
        }
        lines.push("  }".to_owned());
        return lines.join("\n");
    }
    let mut lines = vec!["{".to_owned()];
    for (name, value) in fields {
        if language == "python" {
            lines.push(format!("    \"{name}\": {value},"));
        } else if is_identifier(name) {
            lines.push(format!("    {name}: {value},"));
        } else {
            lines.push(format!("    \"{name}\": {value},"));
        }
    }
    lines.push("  }".to_owned());
    lines.join("\n")
}

fn operation_parameters(
    operation: &SdkReferenceOperationDoc,
    language: &str,
) -> Vec<SdkOperationParameter> {
    let mut seen = std::collections::BTreeSet::new();
    operation
        .path_item_parameters
        .iter()
        .chain(
            operation
                .operation
                .get("parameters")
                .and_then(Value::as_array)
                .into_iter()
                .flatten(),
        )
        .filter_map(|parameter| {
            let object = parameter.as_object()?;
            let name = object.get("name").and_then(Value::as_str)?.trim();
            let location = object.get("in").and_then(Value::as_str)?.trim();
            if name.is_empty() || !matches!(location, "path" | "query") {
                return None;
            }
            let key = format!("{location}:{name}");
            if !seen.insert(key) {
                return None;
            }
            Some(SdkOperationParameter {
                name: name.to_owned(),
                sdk_name: parameter_sdk_name(name, language),
                location: location.to_owned(),
                type_label: schema_sdk_type_label(object.get("schema"), language),
                description: object
                    .get("description")
                    .and_then(Value::as_str)
                    .unwrap_or("parameter")
                    .to_owned(),
                required: object
                    .get("required")
                    .and_then(Value::as_bool)
                    .unwrap_or(location == "path"),
            })
        })
        .collect::<Vec<_>>()
}

fn body_example_fields(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
) -> Vec<(String, String)> {
    request_schema(operation)
        .and_then(|schema| schema_for_example(request, schema))
        .and_then(|schema| schema.get("properties").and_then(Value::as_object))
        .map(|properties| {
            properties
                .iter()
                .take(8)
                .map(|(name, schema)| (name.clone(), schema_example(schema)))
                .collect()
        })
        .unwrap_or_else(|| vec![("value".to_owned(), "\"string\"".to_owned())])
}

fn schema_for_example<'a>(
    request: &'a NormalizedSdkReferenceRequest,
    schema: &'a Value,
) -> Option<&'a Value> {
    let Some(reference) = schema.get("$ref").and_then(Value::as_str) else {
        return Some(schema);
    };
    let Some(schema_name) = reference.strip_prefix("#/components/schemas/") else {
        return Some(schema);
    };
    request
        .spec
        .get("components")
        .and_then(|value| value.get("schemas"))
        .and_then(|value| value.get(schema_name))
        .or(Some(schema))
}

fn request_schema(operation: &SdkReferenceOperationDoc) -> Option<&Value> {
    operation
        .operation
        .get("requestBody")?
        .get("content")?
        .as_object()?
        .values()
        .next()?
        .get("schema")
}

fn request_schema_name(operation: &SdkReferenceOperationDoc) -> Option<String> {
    request_schema(operation).and_then(schema_name)
}

fn response_schema_type_name(
    operation: &SdkReferenceOperationDoc,
    language: &str,
) -> Option<String> {
    let (content_type, schema) = response_schema_with_content_type(operation)?;
    if is_binary_response_schema(content_type, schema) {
        return Some(binary_response_type(language));
    }
    schema_name(schema).or_else(|| Some(schema_type_label(Some(schema))))
}

fn response_schema_with_content_type(
    operation: &SdkReferenceOperationDoc,
) -> Option<(&str, &Value)> {
    let content = operation
        .operation
        .get("responses")
        .and_then(|responses| responses.get("200").or_else(|| responses.get("201")))
        .and_then(|response| response.get("content"))
        .and_then(Value::as_object)?;
    content.iter().next().and_then(|(content_type, content)| {
        content
            .get("schema")
            .map(|schema| (content_type.as_str(), schema))
    })
}

fn is_binary_response_schema(content_type: &str, schema: &Value) -> bool {
    content_type.eq_ignore_ascii_case("application/octet-stream")
        || schema
            .get("format")
            .and_then(Value::as_str)
            .is_some_and(|format| format.eq_ignore_ascii_case("binary"))
}

fn binary_response_type(language: &str) -> String {
    match language {
        "python" => "bytes".to_owned(),
        "rust" => "Vec<u8>".to_owned(),
        "go" => "[]byte".to_owned(),
        "java" => "byte[]".to_owned(),
        "swift" => "Data".to_owned(),
        "kotlin" => "ByteArray".to_owned(),
        "php" => "string".to_owned(),
        "ruby" => "String".to_owned(),
        "csharp" => "byte[]".to_owned(),
        _ => "Blob".to_owned(),
    }
}

fn schema_name(schema: &Value) -> Option<String> {
    schema
        .get("$ref")
        .and_then(Value::as_str)
        .and_then(|value| value.rsplit('/').next())
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            schema
                .get("title")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
}

fn schema_type_label(schema: Option<&Value>) -> String {
    let Some(schema) = schema else {
        return "string".to_owned();
    };
    if let Some(name) = schema_name(schema) {
        return name;
    }
    let schema_type = schema
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("string");
    if schema_type == "array" {
        let item_type = schema_type_label(schema.get("items"));
        return format!("{item_type}[]");
    }
    match schema_type {
        "integer" | "number" => "number".to_owned(),
        "boolean" => "boolean".to_owned(),
        "object" => "Record<string, unknown>".to_owned(),
        _ => "string".to_owned(),
    }
}

fn schema_sdk_type_label(schema: Option<&Value>, language: &str) -> String {
    let Some(schema) = schema else {
        return primitive_sdk_type_label("string", language);
    };
    if let Some(name) = schema_name(schema) {
        return name;
    }
    let schema_type = schema
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("string");
    if schema_type == "array" {
        let item_type = schema_sdk_type_label(schema.get("items"), language);
        return match language {
            "python" => format!("list[{item_type}]"),
            "go" => format!("[]{item_type}"),
            "rust" => format!("Vec<{item_type}>"),
            "swift" => format!("[{item_type}]"),
            "kotlin" => format!("List<{item_type}>"),
            _ => format!("{item_type}[]"),
        };
    }
    if schema_type == "string"
        && schema
            .get("format")
            .and_then(Value::as_str)
            .is_some_and(|format| format.eq_ignore_ascii_case("binary"))
    {
        return binary_response_type(language);
    }
    primitive_sdk_type_label(schema_type, language)
}

fn primitive_sdk_type_label(schema_type: &str, language: &str) -> String {
    match schema_type {
        "integer" => match language {
            "python" => "int".to_owned(),
            "go" | "rust" | "flutter" | "dart" => "int".to_owned(),
            "swift" | "kotlin" => "Int".to_owned(),
            "java" | "csharp" => "Integer".to_owned(),
            _ => "number".to_owned(),
        },
        "number" => match language {
            "python" => "float".to_owned(),
            "go" | "java" | "csharp" => "double".to_owned(),
            "rust" => "f64".to_owned(),
            "swift" | "kotlin" => "Double".to_owned(),
            "flutter" | "dart" => "num".to_owned(),
            _ => "number".to_owned(),
        },
        "boolean" => match language {
            "python" | "ruby" | "rust" => "bool".to_owned(),
            "java" => "Boolean".to_owned(),
            "csharp" => "bool".to_owned(),
            "swift" => "Bool".to_owned(),
            "kotlin" => "Boolean".to_owned(),
            _ => "boolean".to_owned(),
        },
        "object" => fallback_object_type(language),
        _ => match language {
            "python" | "ruby" | "php" => "str".to_owned(),
            "go" => "string".to_owned(),
            "java" | "csharp" | "rust" => "String".to_owned(),
            "swift" | "kotlin" => "String".to_owned(),
            _ => "string".to_owned(),
        },
    }
}

fn schema_example(schema: &Value) -> String {
    if let Some(value) = schema
        .get("example")
        .or_else(|| schema.get("default"))
        .and_then(example_json_literal)
    {
        return value;
    }
    if let Some(value) = schema
        .get("enum")
        .and_then(Value::as_array)
        .and_then(|values| values.first())
        .and_then(example_json_literal)
    {
        return value;
    }
    match schema.get("type").and_then(Value::as_str) {
        Some("integer") | Some("number") => "0".to_owned(),
        Some("boolean") => "true".to_owned(),
        Some("array") => {
            let item = schema
                .get("items")
                .map(schema_example)
                .unwrap_or_else(|| "\"string\"".to_owned());
            format!("[{item}]")
        }
        Some("object") => "{}".to_owned(),
        _ => "\"string\"".to_owned(),
    }
}

fn example_json_literal(value: &Value) -> Option<String> {
    match value {
        Value::String(value) => Some(format!("\"{}\"", value.replace('"', "\\\""))),
        Value::Number(value) => Some(value.to_string()),
        Value::Bool(value) => Some(value.to_string()),
        Value::Array(values) => Some(format!(
            "[{}]",
            values
                .iter()
                .take(3)
                .filter_map(example_json_literal)
                .collect::<Vec<_>>()
                .join(", ")
        )),
        Value::Object(_) => Some("{}".to_owned()),
        Value::Null => None,
    }
}

fn parameter_example(parameter: &SdkOperationParameter, language: &str) -> String {
    let type_label = parameter.type_label.to_ascii_lowercase();
    if is_numeric_sdk_type(&type_label) {
        "0".to_owned()
    } else if is_boolean_sdk_type(&type_label) {
        sdk_boolean_literal(language, true)
    } else if is_array_sdk_type(&type_label) {
        sdk_array_literal(language, sdk_string_literal(language, "string"))
    } else if parameter.name.to_ascii_lowercase().contains("id") {
        sdk_string_literal(language, &parameter.name)
    } else {
        sdk_string_literal(language, "string")
    }
}

fn is_numeric_sdk_type(type_label: &str) -> bool {
    matches!(
        type_label,
        "int"
            | "integer"
            | "number"
            | "float"
            | "double"
            | "decimal"
            | "long"
            | "short"
            | "i32"
            | "i64"
            | "u32"
            | "u64"
            | "usize"
            | "f32"
            | "f64"
            | "num"
    ) || type_label.contains("integer")
        || type_label.contains("number")
}

fn is_boolean_sdk_type(type_label: &str) -> bool {
    matches!(type_label, "bool" | "boolean") || type_label.contains("boolean")
}

fn is_array_sdk_type(type_label: &str) -> bool {
    type_label.starts_with("array<")
        || type_label.starts_with("list[")
        || type_label.starts_with("list<")
        || type_label.starts_with("vec<")
        || type_label.starts_with("[]")
        || type_label.ends_with("[]")
}

fn sdk_boolean_literal(language: &str, value: bool) -> String {
    match language {
        "python" => {
            if value {
                "True".to_owned()
            } else {
                "False".to_owned()
            }
        }
        _ => value.to_string(),
    }
}

fn sdk_string_literal(_language: &str, value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\\\""))
}

fn sdk_array_literal(language: &str, item: String) -> String {
    match language {
        "go" => format!("[]any{{{item}}}"),
        "java" => format!("List.of({item})"),
        "csharp" => format!("new[] {{ {item} }}"),
        "rust" => format!("vec![{item}]"),
        "kotlin" => format!("listOf({item})"),
        _ => format!("[{item}]"),
    }
}

fn sdk_operation_surface(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    language: &str,
) -> SdkOperationSurface {
    let root_property = sdk_root_property_name(request, operation, language);
    let resource_path = sdk_resource_path(request, operation, &root_property);
    let client_path = std::iter::once(root_property)
        .chain(
            resource_path
                .iter()
                .skip(1)
                .map(|segment| format_property_name(segment, language)),
        )
        .collect::<Vec<_>>();
    let method_name = sdk_resource_method_name(request, operation, language, &resource_path)
        .unwrap_or_else(|| sdk_method_name(operation, language));
    let class_base_name = client_path
        .iter()
        .flat_map(|part| split_identifier(part))
        .collect::<Vec<_>>();
    SdkOperationSurface {
        client_path,
        method_name,
        class_base_name: to_pascal_case(&class_base_name),
    }
}

fn sdk_root_property_name(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    language: &str,
) -> String {
    let domain = sdk_operation_group_domain(request, operation);
    let surface_name = sdk_resource_surface_name(request, &domain);
    format_property_name(&surface_name, language)
}

fn sdk_operation_group_domain(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
) -> String {
    if matches!(request.sdk_type.as_ref(), Some(SdkType::Ai)) {
        if let Some(domain) = configured_prefix_domain(request, &operation.path) {
            return domain;
        }
    }

    if let Some(tag) = operation_tag(operation) {
        return normalize_operation_group_tag(&tag);
    }

    relative_path_segments(request, &operation.path)
        .into_iter()
        .find(|segment| !is_path_parameter_segment(segment))
        .map(|segment| normalize_operation_group_tag(&segment))
        .unwrap_or_else(|| "default".to_owned())
}

fn configured_prefix_domain(request: &NormalizedSdkReferenceRequest, path: &str) -> Option<String> {
    let prefix = request.api_prefix.as_deref()?;
    let prefix_segments = normalized_group_path_segments(prefix);
    if prefix_segments.is_empty() {
        return None;
    }

    let path_segments = normalized_group_path_segments(path);
    if !starts_with_segments(&path_segments, &prefix_segments)
        || path_segments.len() <= prefix_segments.len()
    {
        return None;
    }

    let domain_candidates = &path_segments[prefix_segments.len()..];
    domain_candidates
        .iter()
        .find(|segment| !is_reserved_group_segment_after_prefix(segment))
        .or_else(|| domain_candidates.first())
        .map(|segment| normalize_operation_group_tag(segment))
}

fn normalized_group_path_segments(value: &str) -> Vec<String> {
    raw_path_segments(value)
        .into_iter()
        .filter(|segment| !is_path_parameter_segment(segment))
        .map(|segment| normalize_static_segment(&segment))
        .filter(|segment| !segment.is_empty())
        .map(|segment| {
            if is_reserved_tag_path_segment(&segment) {
                segment
            } else {
                singularize(&segment)
            }
        })
        .filter(|segment| !segment.is_empty())
        .collect()
}

fn normalize_operation_group_tag(value: &str) -> String {
    let normalized = split_identifier(value).join("_");
    if normalized.is_empty() {
        "default".to_owned()
    } else {
        normalized
    }
}

fn sdk_resource_surface_name(request: &NormalizedSdkReferenceRequest, domain: &str) -> String {
    if matches!(request.sdk_type.as_ref(), Some(SdkType::Ai)) {
        openai_style_resource_name(domain)
    } else {
        domain.to_owned()
    }
}

fn openai_style_resource_name(raw_name: &str) -> String {
    match split_identifier(raw_name).join("-").as_str() {
        "assistant" => "assistants".to_owned(),
        "batch" => "batches".to_owned(),
        "embedding" => "embeddings".to_owned(),
        "file" => "files".to_owned(),
        "fine-tuning" => "fine-tuning".to_owned(),
        "image" => "images".to_owned(),
        "model" => "models".to_owned(),
        "moderation" => "moderations".to_owned(),
        "response" => "responses".to_owned(),
        "thread" => "threads".to_owned(),
        "upload" => "uploads".to_owned(),
        "vector-store" => "vector-stores".to_owned(),
        _ => raw_name.to_owned(),
    }
}

fn sdk_resource_path(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    fallback_root_segment: &str,
) -> Vec<String> {
    if let Some(path) = sdk_operation_id_resource_path(operation, fallback_root_segment) {
        return path;
    }
    sdk_path_resource_path(request, operation, fallback_root_segment)
}

fn sdk_operation_id_resource_path(
    operation: &SdkReferenceOperationDoc,
    fallback_root_segment: &str,
) -> Option<Vec<String>> {
    let operation_id = operation
        .operation
        .get("operationId")
        .and_then(Value::as_str)?;
    if !operation_id.contains('.') {
        return None;
    }
    let resource_parts = operation_id
        .split('.')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if resource_parts.len() < 2 {
        return None;
    }
    let resource_parts = resource_parts[..resource_parts.len() - 1]
        .iter()
        .map(|part| normalize_static_segment(part))
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if resource_parts.is_empty() {
        return None;
    }
    let root = normalize_static_segment(fallback_root_segment);
    if root.is_empty()
        || resource_parts
            .first()
            .is_some_and(|part| canonical_resource_part(part) == canonical_resource_part(&root))
    {
        Some(resource_parts)
    } else {
        Some(
            std::iter::once(root)
                .chain(resource_parts)
                .collect::<Vec<_>>(),
        )
    }
}

fn sdk_path_resource_path(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    fallback_root_segment: &str,
) -> Vec<String> {
    let relative_segments = relative_path_segments(request, &operation.path);
    let tag_parts = operation_tag(operation)
        .map(|tag| strip_generic_tag_suffix(split_identifier(&tag)))
        .unwrap_or_default();
    let resource_index = find_resource_segment_index(&relative_segments, &tag_parts)
        .or_else(|| {
            relative_segments
                .iter()
                .position(|segment| !is_path_parameter_segment(segment))
        })
        .unwrap_or(0);
    let mut resource_segments = relative_segments
        .into_iter()
        .skip(resource_index)
        .filter(|segment| !is_path_parameter_segment(segment))
        .map(|segment| normalize_static_segment(&segment))
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    if is_terminal_resource_action(&resource_segments) {
        resource_segments.pop();
    }
    if resource_segments.is_empty() {
        let root = normalize_static_segment(fallback_root_segment);
        if root.is_empty() {
            vec!["default".to_owned()]
        } else {
            vec![root]
        }
    } else {
        resource_segments
    }
}

fn sdk_resource_method_name(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    language: &str,
    resource_path: &[String],
) -> Option<String> {
    dotted_operation_action_name(operation, resource_path)
        .or_else(|| resource_action_name(request, operation, resource_path))
        .map(|name| format_property_name(&name, language))
}

fn dotted_operation_action_name(
    operation: &SdkReferenceOperationDoc,
    resource_path: &[String],
) -> Option<String> {
    let operation_id = operation
        .operation
        .get("operationId")
        .and_then(Value::as_str)?;
    if !operation_id.contains('.') {
        return None;
    }
    let parts = operation_id
        .split('.')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.len() < 2 {
        return None;
    }
    let resource_parts = parts[..parts.len() - 1]
        .iter()
        .map(|part| normalize_static_segment(part))
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    let canonical_resource_path = resource_path
        .iter()
        .skip(1)
        .map(|part| canonical_resource_part(part))
        .collect::<Vec<_>>();
    if !resource_parts.is_empty()
        && !same_canonical_parts(
            &resource_parts,
            &canonical_resource_path
                .into_iter()
                .rev()
                .take(resource_parts.len())
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect::<Vec<_>>(),
        )
    {
        return None;
    }
    parts.last().map(|part| (*part).to_owned())
}

fn resource_action_name(
    request: &NormalizedSdkReferenceRequest,
    operation: &SdkReferenceOperationDoc,
    resource_path: &[String],
) -> Option<String> {
    let relative_segments = relative_path_segments(request, &operation.path);
    let resource_index = find_resource_path_end_index(&relative_segments, resource_path)?;
    let suffix = relative_segments
        .into_iter()
        .skip(resource_index + 1)
        .collect::<Vec<_>>();
    let suffix_segments = suffix
        .iter()
        .filter(|segment| !is_path_parameter_segment(segment))
        .map(|segment| normalize_static_segment(segment))
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    let has_current_path_params = suffix
        .iter()
        .any(|segment| is_path_parameter_segment(segment));
    if suffix_segments.len() == 1 && is_action_segment(&suffix_segments[0]) {
        return Some(suffix_segments[0].clone());
    }
    let method = operation.method.as_str();
    if method == "get"
        && suffix_segments.len() == 1
        && is_terminal_collection_action(resource_path, &suffix_segments[0])
    {
        return Some(format!(
            "list{}",
            to_pascal_case(&split_identifier(&suffix_segments[0]))
        ));
    }
    if method == "get" && suffix_segments.is_empty() {
        return Some(
            if has_current_path_params {
                "retrieve"
            } else {
                "list"
            }
            .to_owned(),
        );
    }
    if method == "post" && suffix_segments.is_empty() {
        return Some(
            if has_current_path_params {
                "update"
            } else {
                "create"
            }
            .to_owned(),
        );
    }
    if (method == "put" || method == "patch") && suffix_segments.is_empty() {
        return Some("update".to_owned());
    }
    if method == "delete" && suffix_segments.is_empty() {
        return Some("delete".to_owned());
    }
    if !suffix_segments.is_empty() {
        let action = match method {
            "get" => {
                if has_current_path_params {
                    "retrieve"
                } else {
                    "list"
                }
            }
            "post" => "create",
            "put" | "patch" => "update",
            "delete" => "delete",
            _ => method,
        };
        let suffix_name = render_nested_suffix_name(&suffix_segments, action);
        return Some(format!("{action}{suffix_name}"));
    }
    None
}

fn render_nested_suffix_name(suffix_segments: &[String], action: &str) -> String {
    suffix_segments
        .iter()
        .enumerate()
        .map(|(index, segment)| {
            let normalized = normalize_static_segment(segment);
            let display_segment = if action == "create" && index + 1 == suffix_segments.len() {
                canonical_resource_part(&normalized)
            } else {
                normalized
            };
            to_pascal_case(&split_identifier(&display_segment))
        })
        .collect::<Vec<_>>()
        .join("")
}

fn operation_tag(operation: &SdkReferenceOperationDoc) -> Option<String> {
    operation
        .operation
        .get("tags")
        .and_then(Value::as_array)
        .and_then(|values| values.first())
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn relative_path_segments(request: &NormalizedSdkReferenceRequest, path: &str) -> Vec<String> {
    let path_segments = raw_path_segments(path);
    let prefix_segments = raw_path_segments(request.api_prefix.as_deref().unwrap_or_default());
    if !prefix_segments.is_empty()
        && starts_with_segments(
            &path_segments
                .iter()
                .map(|segment| normalize_static_segment(segment))
                .collect::<Vec<_>>(),
            &prefix_segments
                .iter()
                .map(|segment| normalize_static_segment(segment))
                .collect::<Vec<_>>(),
        )
    {
        return path_segments
            .into_iter()
            .skip(prefix_segments.len())
            .collect();
    }
    path_segments
}

fn raw_path_segments(path: &str) -> Vec<String> {
    path.split('/')
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(str::to_owned)
        .collect()
}

fn find_resource_segment_index(path_segments: &[String], tag_parts: &[String]) -> Option<usize> {
    if path_segments.is_empty() || tag_parts.is_empty() {
        return None;
    }
    let normalized_path = path_segments
        .iter()
        .map(|segment| normalize_static_segment(segment))
        .collect::<Vec<_>>();
    for length in (1..=tag_parts.len().min(normalized_path.len())).rev() {
        let tag_suffix = &tag_parts[tag_parts.len() - length..];
        for index in 0..=normalized_path.len() - length {
            if same_canonical_parts(&normalized_path[index..index + length], tag_suffix) {
                return Some(index + length - 1);
            }
        }
    }
    None
}

fn find_resource_path_end_index(
    path_segments: &[String],
    resource_path: &[String],
) -> Option<usize> {
    if path_segments.is_empty() || resource_path.is_empty() {
        return None;
    }
    let mut resource_index = 0usize;
    for (path_index, segment) in path_segments.iter().enumerate() {
        if is_path_parameter_segment(segment) {
            continue;
        }
        if canonical_resource_part(&normalize_static_segment(segment))
            != canonical_resource_part(&resource_path[resource_index])
        {
            continue;
        }
        resource_index += 1;
        if resource_index == resource_path.len() {
            return Some(path_index);
        }
    }
    None
}

fn starts_with_segments(path_segments: &[String], prefix_segments: &[String]) -> bool {
    path_segments.len() >= prefix_segments.len()
        && prefix_segments
            .iter()
            .enumerate()
            .all(|(index, segment)| path_segments.get(index) == Some(segment))
}

fn same_canonical_parts(left: &[String], right: &[String]) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .all(|(left, right)| canonical_resource_part(left) == canonical_resource_part(right))
}

fn canonical_resource_part(value: &str) -> String {
    let value = value.to_ascii_lowercase();
    if value.ends_with("ies") && value.len() > 3 {
        return format!("{}y", &value[..value.len() - 3]);
    }
    if value.len() > 3 && value.ends_with('s') && !value.ends_with("ss") {
        return value[..value.len() - 1].to_owned();
    }
    value
}

fn normalize_static_segment(value: &str) -> String {
    split_identifier(value).join("_")
}

fn strip_generic_tag_suffix(mut parts: Vec<String>) -> Vec<String> {
    while parts.len() > 1 {
        let removable = matches!(
            parts.last().map(String::as_str),
            Some("management" | "controller" | "module" | "service" | "api")
        );
        if !removable {
            break;
        }
        parts.pop();
    }
    parts
}

fn is_path_parameter_segment(value: &str) -> bool {
    value.starts_with('{') && value.ends_with('}')
}

fn is_terminal_resource_action(resource_segments: &[String]) -> bool {
    if resource_segments.len() <= 1 {
        return false;
    }

    let Some(terminal_segment) = resource_segments.last() else {
        return false;
    };
    is_action_segment(terminal_segment)
        || is_terminal_collection_action(
            &resource_segments[..resource_segments.len() - 1],
            terminal_segment,
        )
}

fn is_terminal_collection_action(parent_resource_path: &[String], segment: &str) -> bool {
    let normalized_segment = normalize_static_segment(segment);
    let rules: [(&[&str], &str); 2] = [
        (&["fine_tuning", "jobs"], "events"),
        (&["vector_stores", "file_batches"], "files"),
    ];
    rules.iter().any(|(parent, terminal)| {
        canonical_resource_part(terminal) == canonical_resource_part(&normalized_segment)
            && resource_path_matches(parent, parent_resource_path)
    })
}

fn resource_path_matches(rule_path: &[&str], resource_path: &[String]) -> bool {
    rule_path.len() == resource_path.len()
        && rule_path
            .iter()
            .zip(resource_path)
            .all(|(left, right)| canonical_resource_part(left) == canonical_resource_part(right))
}

fn is_action_segment(segment: &str) -> bool {
    matches!(
        normalize_static_segment(segment).as_str(),
        "cancel"
            | "compact"
            | "complete"
            | "content"
            | "pause"
            | "resume"
            | "search"
            | "submit_tool_outputs"
    )
}

fn is_reserved_tag_path_segment(segment: &str) -> bool {
    matches!(
        segment,
        "api"
            | "app"
            | "ai"
            | "backend"
            | "openapi"
            | "docs"
            | "swagger"
            | "v1"
            | "v2"
            | "v3"
            | "v4"
            | "v5"
    )
}

fn is_reserved_group_segment_after_prefix(segment: &str) -> bool {
    matches!(segment, "management" | "manage" | "admin" | "internal")
}

fn singularize(value: &str) -> String {
    let input = value.trim().to_ascii_lowercase();
    if input.is_empty()
        || input == "news"
        || input.ends_with("news")
        || input.ends_with("us")
        || input.ends_with("is")
    {
        return input;
    }
    if input.ends_with("ies") && input.len() > 3 {
        return format!("{}y", &input[..input.len() - 3]);
    }
    if input.len() > 4
        && (input.ends_with("sses")
            || input.ends_with("ches")
            || input.ends_with("shes")
            || input.ends_with("xes")
            || input.ends_with("zes"))
    {
        return input[..input.len() - 2].to_owned();
    }
    if input.len() > 3 && input.ends_with('s') && !input.ends_with("ss") {
        return input[..input.len() - 1].to_owned();
    }
    input
}

fn format_property_name(value: &str, language: &str) -> String {
    let words = split_identifier(value);
    if matches!(language, "python" | "ruby" | "rust") {
        if words.is_empty() {
            "default".to_owned()
        } else {
            words.join("_")
        }
    } else if matches!(language, "go" | "csharp") {
        to_pascal_case(&words)
    } else {
        to_lower_camel_case(&words)
    }
}

fn parameter_sdk_name(name: &str, language: &str) -> String {
    format_property_name(name, language)
}

fn sdk_signature(
    language: &str,
    method_name: &str,
    params_type: &str,
    body_type: &str,
    response_type: &str,
    has_query_params: bool,
    has_body: bool,
    params_required: bool,
    has_path_params: bool,
    path_parameters: &[SdkOperationParameter],
) -> String {
    let mut args = Vec::new();
    if has_path_params {
        args.extend(path_parameters.iter().map(|parameter| {
            sdk_signature_parameter(language, &parameter.sdk_name, &parameter.type_label)
        }));
    }
    if has_body {
        args.push(sdk_signature_parameter(
            language,
            sdk_body_variable_name(language),
            body_type,
        ));
    }
    if has_query_params {
        args.push(sdk_params_signature_parameter(
            language,
            params_type,
            params_required,
        ));
    }
    match language {
        "python" => format!("def {method_name}({}) -> {response_type}", args.join(", ")),
        "go" => format!(
            "func (c *Client) {method_name}(ctx context.Context{}) ({response_type}, error)",
            if args.is_empty() {
                String::new()
            } else {
                format!(", {}", args.join(", "))
            }
        ),
        "java" => format!("public {response_type} {method_name}({})", args.join(", ")),
        "ruby" => {
            if args.is_empty() {
                format!("def {method_name}")
            } else {
                format!("def {method_name}({})", args.join(", "))
            }
        }
        "php" => format!(
            "public function {method_name}({}): {response_type}",
            args.join(", ")
        ),
        "csharp" => format!(
            "Task<{response_type}> {method_name}Async({})",
            args.join(", ")
        ),
        "rust" => format!(
            "pub async fn {method_name}(&self{}) -> Result<{response_type}, Error>",
            if args.is_empty() {
                String::new()
            } else {
                format!(", {}", args.join(", "))
            }
        ),
        "swift" => format!(
            "func {method_name}({}) async throws -> {response_type}",
            args.join(", ")
        ),
        "kotlin" => format!(
            "suspend fun {method_name}({}): {response_type}",
            args.join(", ")
        ),
        "flutter" | "dart" => {
            format!("Future<{response_type}> {method_name}({})", args.join(", "))
        }
        _ => format!(
            "async {method_name}({}): Promise<{response_type}>",
            args.join(", ")
        ),
    }
}

fn sdk_signature_parameter(language: &str, name: &str, type_label: &str) -> String {
    match language {
        "go" => format!("{name} {type_label}"),
        "java" => format!("{type_label} {name}"),
        "ruby" => name.to_owned(),
        "php" => {
            if name == "body" {
                "array $body".to_owned()
            } else {
                format!("${name}")
            }
        }
        "csharp" => format!("{type_label} {name}"),
        "rust" => format!("{name}: {type_label}"),
        "swift" | "kotlin" => format!("{name}: {type_label}"),
        "flutter" | "dart" => format!("{type_label} {name}"),
        _ => format!("{name}: {type_label}"),
    }
}

fn sdk_params_signature_parameter(language: &str, params_type: &str, required: bool) -> String {
    match language {
        "python" => {
            if required {
                format!("params: {params_type}")
            } else {
                format!("params: {params_type} | None = None")
            }
        }
        "go" => format!("params {params_type}"),
        "java" => format!("{params_type} params"),
        "ruby" => {
            if required {
                "params".to_owned()
            } else {
                "params = {}".to_owned()
            }
        }
        "php" => {
            if required {
                "array $requestParams".to_owned()
            } else {
                "array $requestParams = []".to_owned()
            }
        }
        "csharp" => {
            if required {
                format!("{params_type} requestParams")
            } else {
                format!("{params_type}? requestParams = null")
            }
        }
        "rust" => {
            if required {
                format!("params: {params_type}")
            } else {
                format!("params: Option<{params_type}>")
            }
        }
        "swift" => {
            if required {
                format!("params: {params_type}")
            } else {
                format!("params: {params_type}? = nil")
            }
        }
        "kotlin" => {
            if required {
                format!("params: {params_type}")
            } else {
                format!("params: {params_type}? = null")
            }
        }
        "flutter" | "dart" => {
            if required {
                format!("{params_type} params")
            } else {
                format!("{params_type}? params")
            }
        }
        _ => {
            if required {
                format!("params: {params_type}")
            } else {
                format!("params?: {params_type}")
            }
        }
    }
}

fn sdk_method_name(operation: &SdkReferenceOperationDoc, language: &str) -> String {
    let base_name = operation
        .operation
        .get("operationId")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .unwrap_or_else(|| fallback_operation_id(operation));
    let words = split_identifier(&base_name);
    if matches!(language, "python" | "ruby" | "rust") {
        words.join("_")
    } else if matches!(language, "go" | "csharp") {
        to_pascal_case(&words)
    } else {
        to_lower_camel_case(&words)
    }
}

fn fallback_operation_id(operation: &SdkReferenceOperationDoc) -> String {
    let path_part = operation
        .path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .map(|segment| segment.trim_matches(['{', '}']))
        .collect::<Vec<_>>()
        .join("-");
    format!("{}-{path_part}", operation.method)
}

fn operation_description(operation: &SdkReferenceOperationDoc) -> String {
    operation
        .operation
        .get("summary")
        .or_else(|| operation.operation.get("description"))
        .and_then(Value::as_str)
        .unwrap_or("SDK operation")
        .trim()
        .to_owned()
}

fn split_identifier(value: &str) -> Vec<String> {
    let mut normalized = String::with_capacity(value.len() + 8);
    let mut previous_lower_or_digit = false;
    for character in value.chars() {
        if character.is_ascii_uppercase() && previous_lower_or_digit {
            normalized.push(' ');
        }
        if character.is_ascii_alphanumeric() {
            normalized.push(character.to_ascii_lowercase());
            previous_lower_or_digit = character.is_ascii_lowercase() || character.is_ascii_digit();
        } else {
            normalized.push(' ');
            previous_lower_or_digit = false;
        }
    }
    normalized
        .split_whitespace()
        .filter(|word| !word.is_empty())
        .map(str::to_owned)
        .collect()
}

fn to_lower_camel_case(words: &[String]) -> String {
    let Some((first, rest)) = words.split_first() else {
        return "default".to_owned();
    };
    format!(
        "{}{}",
        first,
        rest.iter()
            .map(|word| capitalize(word))
            .collect::<Vec<_>>()
            .join("")
    )
}

fn to_pascal_case(words: &[String]) -> String {
    if words.is_empty() {
        return "Default".to_owned();
    }
    words
        .iter()
        .map(|word| capitalize(word))
        .collect::<Vec<_>>()
        .join("")
}

fn swift_module_name(package_name: &str) -> String {
    let last_segment = package_name
        .rsplit(['/', ':'])
        .next()
        .unwrap_or(package_name);
    let words = split_identifier(last_segment);
    let module_name = to_pascal_case(&words);
    if module_name
        .chars()
        .next()
        .is_some_and(|character| character.is_ascii_digit())
    {
        format!("Sdk{module_name}")
    } else {
        module_name
    }
}

fn kotlin_package_name(package_name: &str) -> String {
    let mut segments = Vec::new();
    for raw_segment in package_name
        .trim_start_matches('@')
        .split(['/', '.', ':'])
        .filter(|segment| !segment.trim().is_empty())
    {
        let words = split_identifier(raw_segment);
        let mut segment = words.join("_");
        if segment
            .chars()
            .next()
            .is_none_or(|character| !character.is_ascii_alphabetic())
        {
            segment = format!("sdk_{segment}");
        }
        segments.push(segment);
    }
    if segments.is_empty() {
        "sdkwork.sdk".to_owned()
    } else {
        segments.join(".")
    }
}

fn capitalize(value: &str) -> String {
    let mut chars = value.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    format!("{}{}", first.to_ascii_uppercase(), chars.as_str())
}

fn fallback_object_type(language: &str) -> String {
    match language {
        "python" => "dict[str, object]".to_owned(),
        "go" => "map[string]any".to_owned(),
        "java" => "Map<String, Object>".to_owned(),
        "ruby" => "Hash".to_owned(),
        "php" => "array".to_owned(),
        "csharp" => "Dictionary<string, object?>".to_owned(),
        "rust" => "serde_json::Value".to_owned(),
        "swift" => "[String: Any]".to_owned(),
        "kotlin" => "Map<String, Any?>".to_owned(),
        "flutter" | "dart" => "Map<String, dynamic>".to_owned(),
        _ => "Record<string, unknown>".to_owned(),
    }
}

fn fallback_void_type(language: &str) -> String {
    match language {
        "python" => "None".to_owned(),
        "go" => "struct{}".to_owned(),
        "java" => "Void".to_owned(),
        "ruby" => "nil".to_owned(),
        "php" => "void".to_owned(),
        "csharp" => "Void".to_owned(),
        "rust" => "()".to_owned(),
        "swift" => "Void".to_owned(),
        "kotlin" => "Unit".to_owned(),
        "flutter" | "dart" => "void".to_owned(),
        _ => "void".to_owned(),
    }
}

fn is_identifier(value: &str) -> bool {
    let mut chars = value.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    (first.is_ascii_alphabetic() || first == '_')
        && chars.all(|character| character.is_ascii_alphanumeric() || character == '_')
}

fn install_command(language: &str, package_name: &str) -> String {
    match language {
        "typescript" | "javascript" => format!("npm install {package_name}"),
        "python" => format!("pip install {package_name}"),
        "go" => format!("go get {package_name}"),
        "java" => format!("// Add {package_name} to your Maven or Gradle dependencies"),
        "swift" => format!("// Add {package_name} to your Swift Package dependencies"),
        "kotlin" => format!("// Add {package_name} to your Gradle dependencies"),
        "ruby" => format!("gem install {package_name}"),
        "php" => format!("composer require {package_name}"),
        "csharp" => format!("dotnet add package {package_name}"),
        "rust" => format!("cargo add {package_name}"),
        "dart" | "flutter" => format!("dart pub add {package_name}"),
        _ => format!("Install {package_name} with the package manager for {language}"),
    }
}

fn quick_start_snippet(request: &NormalizedSdkReferenceRequest, package_name: &str) -> String {
    match request.language.as_str() {
        "typescript" | "javascript" => format!(
            "import {{ {name} }} from \"{package_name}\";\n\nconst client = new {name}({{\n  baseUrl: \"{base_url}\",\n  apiKey: process.env.SDKWORK_API_KEY,\n}});",
            name = request.name,
            base_url = request.base_url,
        ),
        "python" => format!(
            "from {module_name} import {name}\n\nclient = {name}(\n    base_url=\"{base_url}\",\n    api_key=\"YOUR_API_KEY\",\n)",
            module_name = package_name.replace('-', "_"),
            name = request.name,
            base_url = request.base_url,
        ),
        _ => format!(
            "Initialize {name} with base URL {base_url} and your SDKWORK_API_KEY.",
            name = request.name,
            base_url = request.base_url,
        ),
    }
}

fn usage_example_snippet(request: &NormalizedSdkReferenceRequest) -> String {
    match request.language.as_str() {
        "typescript" | "javascript" => {
            "const models = await client.ai.models.list();\nconsole.log(models);".to_owned()
        }
        "python" => "models = client.ai.models.list()\nprint(models)".to_owned(),
        _ => "Call the generated client methods that match the OpenAPI operation names.".to_owned(),
    }
}

fn code_fence_language(language: &str) -> &str {
    match language {
        "typescript" => "typescript",
        "javascript" => "javascript",
        "python" => "python",
        "go" => "go",
        "java" => "java",
        "swift" => "swift",
        "kotlin" => "kotlin",
        "ruby" => "ruby",
        "php" => "php",
        "csharp" => "csharp",
        "rust" => "rust",
        "dart" | "flutter" => "dart",
        _ => "text",
    }
}

fn extract_usage_examples(readme: &str) -> Option<String> {
    let section = section_after_heading(readme, "## Usage Examples")?;
    let blocks = code_blocks(section);
    (!blocks.is_empty()).then(|| blocks.join("\n\n"))
}

fn extract_first_code_block(readme: &str) -> Option<String> {
    code_blocks(readme).into_iter().next()
}

fn section_after_heading<'a>(readme: &'a str, heading: &str) -> Option<&'a str> {
    let start = readme.find(heading)?;
    let section = &readme[start + heading.len()..];
    let end = section.find("\n## ").unwrap_or(section.len());
    Some(&section[..end])
}

fn code_blocks(text: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let mut rest = text;
    while let Some(start) = rest.find("```") {
        let after_fence = &rest[start + 3..];
        let content_start = after_fence.find('\n').map(|index| index + 1).unwrap_or(0);
        let after_language = &after_fence[content_start..];
        let Some(end) = after_language.find("```") else {
            break;
        };
        let block = after_language[..end].trim();
        if !block.is_empty() {
            blocks.push(block.to_owned());
        }
        rest = &after_language[end + 3..];
    }
    blocks
}

fn extract_readme_from_zip(bytes: &[u8]) -> Option<String> {
    let mut index = 0usize;
    while index + 30 <= bytes.len() {
        if bytes.get(index..index + 4) != Some(&[0x50, 0x4b, 0x03, 0x04]) {
            index += 1;
            continue;
        }
        let compression = read_u16_le(bytes, index + 8)?;
        let compressed_size = read_u32_le(bytes, index + 18)? as usize;
        let uncompressed_size = read_u32_le(bytes, index + 22)? as usize;
        let file_name_len = read_u16_le(bytes, index + 26)? as usize;
        let extra_len = read_u16_le(bytes, index + 28)? as usize;
        let name_start = index + 30;
        let data_start = name_start
            .checked_add(file_name_len)?
            .checked_add(extra_len)?;
        let data_end = data_start.checked_add(compressed_size)?;
        if data_end > bytes.len() {
            return None;
        }
        let file_name =
            std::str::from_utf8(bytes.get(name_start..name_start + file_name_len)?).ok()?;
        if file_name
            .rsplit('/')
            .next()
            .is_some_and(|name| name.eq_ignore_ascii_case("README.md"))
            && compression == 0
            && uncompressed_size == compressed_size
        {
            return String::from_utf8(bytes[data_start..data_end].to_vec()).ok();
        }
        index = data_end;
    }
    None
}

fn read_u16_le(bytes: &[u8], index: usize) -> Option<u16> {
    Some(u16::from_le_bytes(
        bytes.get(index..index + 2)?.try_into().ok()?,
    ))
}

fn read_u32_le(bytes: &[u8], index: usize) -> Option<u32> {
    Some(u32::from_le_bytes(
        bytes.get(index..index + 4)?.try_into().ok()?,
    ))
}

fn bad_request(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(PlusApiResult::error("4001", message.into())),
    )
        .into_response()
}

fn generator_unavailable() -> Response {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(PlusApiResult::error(
            "5030",
            "SDK generator is not configured",
        )),
    )
        .into_response()
}

fn bad_gateway(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_GATEWAY,
        Json(PlusApiResult::error("5020", message.into())),
    )
        .into_response()
}

enum SdkReferenceConfigError {
    Unavailable,
    Invalid(String),
}
