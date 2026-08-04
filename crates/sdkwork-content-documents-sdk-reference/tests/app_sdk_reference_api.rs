#![allow(clippy::await_holding_lock)]

use std::sync::{Arc, Mutex, OnceLock};

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{header, HeaderMap, Request, StatusCode};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn app_sdk_reference_archives_generate_with_rust_sdk_generator_client() {
    let _guard = env_guard().lock().unwrap();
    let fake_generator = spawn_fake_sdk_generator().await;
    set_generator_env(&fake_generator.base_url);

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/archives")
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(
        "sdkwork-example-app-sdk-typescript-0.1.0.zip",
        payload["data"]["fileName"]
    );
    assert_eq!("application/zip", payload["data"]["contentType"]);
    assert_eq!("typescript", payload["data"]["language"]);
    assert!(payload["data"]["contentBase64"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
    let uploads = fake_generator.uploads.lock().unwrap();
    assert_eq!(1, uploads.len());
    assert_eq!(None, uploads[0].authorization);
    let upload_text = String::from_utf8_lossy(&uploads[0].body);
    assert!(upload_text.contains("typescript"));
    assert!(upload_text.contains("app"));
    assert!(upload_text.contains("https://api.sdkwork.com"));
    assert!(upload_text.contains("/app/v3/api"));
    assert!(upload_text.contains("@sdkwork/example-app-sdk"));

    clear_generator_env();
}

#[tokio::test]
async fn app_sdk_reference_documentation_generates_docs_after_generator_success() {
    let _guard = env_guard().lock().unwrap();
    let fake_generator = spawn_fake_sdk_generator().await;
    set_generator_env(&fake_generator.base_url);

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("typescript", payload["data"]["language"]);
    assert_eq!(true, payload["data"]["generated"]);
    let readme = payload["data"]["readme"].as_str().unwrap();
    assert!(readme.contains("## Installation"));
    assert!(readme.contains("## Quick Start"));
    assert!(readme.contains("## Usage Examples"));
    assert_eq!(1, fake_generator.uploads.lock().unwrap().len());

    clear_generator_env();
}

#[tokio::test]
async fn app_sdk_reference_documentation_defaults_blank_gateway_api_prefix() {
    let _guard = env_guard().lock().unwrap();
    let fake_generator = spawn_fake_sdk_generator().await;
    set_generator_env(&fake_generator.base_url);

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(
                    gateway_sdk_reference_request_body_with_blank_api_prefix(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("typescript", payload["data"]["language"]);
    let uploads = fake_generator.uploads.lock().unwrap();
    assert_eq!(1, uploads.len());
    let upload_text = String::from_utf8_lossy(&uploads[0].body);
    assert!(upload_text.contains("name=\"sdkType\""));
    assert!(upload_text.contains("ai"));
    assert!(upload_text.contains("name=\"apiPrefix\""));
    assert!(upload_text.contains("/v1"));

    clear_generator_env();
}

#[tokio::test]
async fn app_sdk_reference_documentation_defaults_missing_app_api_prefix() {
    let _guard = env_guard().lock().unwrap();
    let fake_generator = spawn_fake_sdk_generator().await;
    set_generator_env(&fake_generator.base_url);

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body_without_api_prefix()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    let uploads = fake_generator.uploads.lock().unwrap();
    assert_eq!(1, uploads.len());
    let upload_text = String::from_utf8_lossy(&uploads[0].body);
    assert!(upload_text.contains("name=\"apiPrefix\""));
    assert!(upload_text.contains("/app/v3/api"));

    clear_generator_env();
}

#[tokio::test]
async fn app_sdk_reference_documentation_infers_app_defaults_when_config_is_missing() {
    let _guard = env_guard().lock().unwrap();
    let fake_generator = spawn_fake_sdk_generator().await;
    set_generator_env(&fake_generator.base_url);

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body_without_config()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    let uploads = fake_generator.uploads.lock().unwrap();
    assert_eq!(1, uploads.len());
    let upload_text = String::from_utf8_lossy(&uploads[0].body);
    assert!(upload_text.contains("name=\"sdkType\""));
    assert!(upload_text.contains("app"));
    assert!(upload_text.contains("name=\"apiPrefix\""));
    assert!(upload_text.contains("/app/v3/api"));

    clear_generator_env();
}

#[tokio::test]
async fn app_sdk_reference_documentation_returns_local_fallback_when_generator_is_not_configured() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("typescript", payload["data"]["language"]);
    assert_eq!(false, payload["data"]["generated"]);
    let readme = payload["data"]["readme"].as_str().unwrap();
    assert!(readme.contains("# SdkworkExampleAppClient"));
    assert!(readme.contains("@sdkwork/example-app-sdk"));
    assert!(readme.contains("## Installation"));
    assert!(readme.contains("## Quick Start"));
    assert!(readme.contains("## Usage Examples"));
    let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
    let usage_example = payload["data"]["usageExample"].as_str().unwrap();
    assert!(method_definition.contains("async list("));
    assert!(method_definition.contains("AiModelsListParams"));
    assert!(method_definition.contains("ModelsListResult"));
    assert!(method_definition.contains("billing_meter"));
    assert!(usage_example.contains("client.ai.models.list({"));
    assert!(usage_example.contains("billingMeter"));
    assert!(!method_definition.contains("npm install"));
}

#[tokio::test]
async fn app_sdk_reference_documentation_uses_selected_gateway_operation_for_sdk_examples() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(
                    gateway_sdk_reference_request_body_with_selected_chat_operation(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("typescript", payload["data"]["language"]);
    assert_eq!(false, payload["data"]["generated"]);
    let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
    let usage_example = payload["data"]["usageExample"].as_str().unwrap();
    assert!(method_definition.contains("async create("));
    assert!(method_definition.contains("OpenAiChatCompletionRequest"));
    assert!(method_definition.contains("OpenAiChatCompletion"));
    assert!(usage_example.contains("client.chat.completions.create({"));
    assert!(usage_example.contains("model"));
    assert!(usage_example.contains("messages"));
    assert!(!usage_example.contains("client.ai.models.list"));
}

#[tokio::test]
async fn app_sdk_reference_documentation_uses_generated_sdk_path_arguments() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(
                    gateway_sdk_reference_request_body_with_selected_anthropic_file_content_operation(
                    ),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(false, payload["data"]["generated"]);
    let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
    let usage_example = payload["data"]["usageExample"].as_str().unwrap();
    assert!(method_definition.contains("async content(fileId: string): Promise<Blob>"));
    assert!(method_definition.contains("@param fileId"));
    assert!(usage_example.contains("client.filesAnthropic.v1.files.content(\"file_id\")"));
    assert!(!usage_example.contains("content({"));
    assert!(!method_definition.contains("FilesAnthropicV1FilesContentParams"));
}

#[tokio::test]
async fn app_sdk_reference_documentation_uses_openai_prefix_resource_grouping() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(
                    gateway_sdk_reference_request_body_with_selected_conversation_list_operation(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(false, payload["data"]["generated"]);
    let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
    let usage_example = payload["data"]["usageExample"].as_str().unwrap();
    assert!(method_definition
        .contains("async list(params?: ConversationListParams): Promise<OpenAiConversationList>"));
    assert!(usage_example.contains("client.conversation.list({"));
    assert!(!usage_example.contains("client.conversations.list"));
}

#[tokio::test]
async fn app_sdk_reference_documentation_uses_top_level_language_when_config_language_is_stale() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(
                    gateway_sdk_reference_request_body_with_stale_config_language(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("python", payload["data"]["language"]);
    assert_eq!(false, payload["data"]["generated"]);
    let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
    let usage_example = payload["data"]["usageExample"].as_str().unwrap();
    assert!(method_definition.contains(
        "def list(params: ConversationListParams | None = None) -> OpenAiConversationList"
    ));
    assert!(usage_example.contains("client.conversation.list({"));
    assert!(usage_example.contains("\"limit\": 0"));
}

#[tokio::test]
async fn app_sdk_reference_documentation_renders_selected_operation_for_each_sdk_language() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let cases = [
        (
            "go",
            "func (c *Client) List(ctx context.Context, params ConversationListParams) (OpenAiConversationList, error)",
            "client.Conversation.List(context.Background(), params)",
        ),
        (
            "java",
            "public OpenAiConversationList list(ConversationListParams params)",
            "client.conversation().list(params)",
        ),
        (
            "ruby",
            "def list(params = {})",
            "client.conversation.list(params)",
        ),
        (
            "php",
            "public function list(array $requestParams = []): OpenAiConversationList",
            "$client->conversation()->list($requestParams)",
        ),
        (
            "csharp",
            "Task<OpenAiConversationList> ListAsync(ConversationListParams? requestParams = null)",
            "client.Conversation.ListAsync(requestParams)",
        ),
        (
            "rust",
            "pub async fn list(&self, params: Option<ConversationListParams>) -> Result<OpenAiConversationList, Error>",
            "client.conversation().list(params).await?",
        ),
        (
            "dart",
            "Future<OpenAiConversationList> list(ConversationListParams? params)",
            "client.conversation.list(params)",
        ),
        (
            "flutter",
            "Future<OpenAiConversationList> list(ConversationListParams? params)",
            "client.conversation.list(params)",
        ),
        (
            "swift",
            "func list(params: ConversationListParams? = nil) async throws -> OpenAiConversationList",
            "client.conversation.list(params)",
        ),
        (
            "kotlin",
            "suspend fun list(params: ConversationListParams? = null): OpenAiConversationList",
            "client.conversation.list(params)",
        ),
    ];

    for (language, expected_signature, expected_call) in cases {
        let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
        let response = router
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/app/v3/api/sdk_reference/documentation")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        gateway_sdk_reference_request_body_with_language(language),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::OK, response.status(), "language {language}");
        let payload = response_json(response).await;
        assert_eq!("2000", payload["code"], "language {language}");
        assert_eq!(language, payload["data"]["language"], "language {language}");
        let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
        let usage_example = payload["data"]["usageExample"].as_str().unwrap();
        assert!(
            method_definition.contains(expected_signature),
            "language {language} method definition:\n{method_definition}"
        );
        assert!(
            usage_example.contains(expected_call),
            "language {language} usage example:\n{usage_example}"
        );
        assert!(
            !method_definition.contains("async list(params?: ConversationListParams): Promise"),
            "language {language} should not render TypeScript method definitions"
        );
        assert!(
            !usage_example.contains("import { SdkworkAiClient }"),
            "language {language} should not render TypeScript usage examples"
        );
    }
}

#[tokio::test]
async fn app_sdk_reference_documentation_uses_terminal_collection_action_methods() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(
                    gateway_sdk_reference_request_body_with_selected_fine_tuning_events_operation(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(false, payload["data"]["generated"]);
    let method_definition = payload["data"]["methodDefinition"].as_str().unwrap();
    let usage_example = payload["data"]["usageExample"].as_str().unwrap();
    assert!(method_definition.contains(
        "async listEvents(fineTuningJobId: string, params?: FineTuningJobsListEventsParams): Promise<OpenAiFineTuningJobEventList>"
    ));
    assert!(usage_example.contains("client.fineTuning.jobs.listEvents(\"fine_tuning_job_id\", {"));
    assert!(!usage_example.contains("client.fineTuning.jobs.events.list"));
}

#[tokio::test]
async fn app_sdk_reference_documentation_accepts_large_openapi_documents() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router = sdkwork_content_documents_sdk_reference::app_sdk_reference_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(large_sdk_reference_request_body()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(false, payload["data"]["generated"]);
    assert!(payload["data"]["readme"]
        .as_str()
        .is_some_and(|value| value.contains("Example App API")));
}

#[derive(Clone)]
struct FakeSdkGenerator {
    base_url: String,
    uploads: Arc<Mutex<Vec<CapturedUpload>>>,
}

#[derive(Debug)]
struct CapturedUpload {
    authorization: Option<String>,
    body: Vec<u8>,
}

async fn spawn_fake_sdk_generator() -> FakeSdkGenerator {
    let uploads = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .route("/v1/sdk-generator/generations:upload", post(fake_upload))
        .route("/v1/sdk-generator/jobs/{job_id}", get(fake_job))
        .route(
            "/v1/sdk-generator/jobs/{job_id}/download",
            get(fake_download),
        )
        .with_state(Arc::clone(&uploads));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    FakeSdkGenerator {
        base_url: format!("http://{addr}"),
        uploads,
    }
}

async fn fake_upload(
    State(uploads): State<Arc<Mutex<Vec<CapturedUpload>>>>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> impl IntoResponse {
    uploads.lock().unwrap().push(CapturedUpload {
        authorization: headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body: body.to_vec(),
    });
    Json(json!({
        "jobId": "job-123",
        "status": "completed",
        "downloadUrl": "/v1/sdk-generator/jobs/job-123/download"
    }))
}

async fn fake_job(Path(job_id): Path<String>) -> impl IntoResponse {
    Json(json!({
        "jobId": job_id,
        "status": "completed"
    }))
}

async fn fake_download(Path(job_id): Path<String>) -> impl IntoResponse {
    let bytes = format!("PK\x03\x04 fake zip for {job_id}").into_bytes();
    (
        [
            (header::CONTENT_TYPE, "application/zip"),
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"sdkwork-example-app-sdk-typescript-0.1.0.zip\"",
            ),
        ],
        bytes,
    )
}

fn sdk_reference_request_body() -> String {
    json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Example App API",
                "version": "0.1.0"
            },
            "paths": {
                "/app/v3/api/ai/models": {
                    "get": {
                        "operationId": "models.list",
                        "summary": "List models",
                        "tags": ["ai"],
                        "parameters": [
                            {
                                "description": "Billing meter query parameter.",
                                "in": "query",
                                "name": "billing_meter",
                                "required": false,
                                "schema": {
                                    "type": "string"
                                }
                            },
                            {
                                "description": "Limit query parameter.",
                                "in": "query",
                                "name": "limit",
                                "required": false,
                                "schema": {
                                    "type": "integer"
                                }
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/ModelsListResult"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "ModelsListResult": {
                        "type": "object",
                        "properties": {
                            "data": {
                                "type": "array",
                                "items": {
                                    "type": "object"
                                }
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkExampleAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "app",
            "outputPath": "./sdk",
            "apiSpecPath": "/app/v3/api/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "/app/v3/api",
            "packageName": "@sdkwork/example-app-sdk",
            "author": "SDKWork",
            "license": "MIT",
            "description": "Example App SDK"
        }
    })
    .to_string()
}

fn sdk_reference_request_body_without_api_prefix() -> String {
    let mut payload: Value = serde_json::from_str(&sdk_reference_request_body()).unwrap();
    payload["config"]
        .as_object_mut()
        .unwrap()
        .remove("apiPrefix");
    payload.to_string()
}

fn sdk_reference_request_body_without_config() -> String {
    let mut payload: Value = serde_json::from_str(&sdk_reference_request_body()).unwrap();
    payload.as_object_mut().unwrap().remove("config");
    payload.to_string()
}

fn gateway_sdk_reference_request_body_with_blank_api_prefix() -> String {
    json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Example Open API",
                "version": "0.1.0"
            },
            "paths": {
                "/v1/chat/completions": {
                    "post": {
                        "operationId": "chat.completions.create",
                        "responses": {
                            "200": {
                                "description": "ok"
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAiClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "ai",
            "outputPath": "./sdk",
            "apiSpecPath": "/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "",
            "packageName": "@sdkwork/example-open-sdk",
            "author": "SDKWork",
            "license": "MIT",
            "description": "Example Open API SDK"
        }
    })
    .to_string()
}

fn gateway_sdk_reference_request_body_with_selected_chat_operation() -> String {
    json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Example Open API",
                "version": "0.1.0"
            },
            "paths": {
                "/v1/chat/completions": {
                    "post": {
                        "operationId": "createChatCompletion",
                        "tags": ["Chat"],
                        "summary": "Create chat completion",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/OpenAiChatCompletionRequest"
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/OpenAiChatCompletion"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/v1/images/generations": {
                    "post": {
                        "operationId": "createImage",
                        "tags": ["Images"],
                        "responses": {
                            "200": {
                                "description": "ok"
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "OpenAiChatCompletionRequest": {
                        "type": "object",
                        "required": ["model", "messages"],
                        "properties": {
                            "model": {
                                "type": "string",
                                "description": "Model id."
                            },
                            "messages": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["role", "content"],
                                    "properties": {
                                        "role": {
                                            "type": "string",
                                            "enum": ["user"]
                                        },
                                        "content": {
                                            "type": "string"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "OpenAiChatCompletion": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string"
                            },
                            "model": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAiClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "ai",
            "outputPath": "./sdk",
            "apiSpecPath": "/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "",
            "endpointPath": "/v1/chat/completions",
            "endpointMethod": "POST",
            "operationId": "createChatCompletion",
            "packageName": "@sdkwork/example-open-sdk",
            "author": "SDKWork",
            "license": "MIT",
            "description": "Example Open API SDK"
        }
    })
    .to_string()
}

fn gateway_sdk_reference_request_body_with_selected_anthropic_file_content_operation() -> String {
    json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Example Open API",
                "version": "0.1.0"
            },
            "paths": {
                "/anthropic/v1/files/{file_id}/content": {
                    "get": {
                        "operationId": "anthropicRetrieveFileContent",
                        "tags": ["Files/anthropic"],
                        "summary": "Anthropic retrieve file content",
                        "parameters": [
                            {
                                "description": "Anthropic file identifier.",
                                "in": "path",
                                "name": "file_id",
                                "required": true,
                                "schema": {
                                    "type": "string"
                                }
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/octet-stream": {
                                        "schema": {
                                            "type": "string",
                                            "format": "binary"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAiClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "ai",
            "outputPath": "./sdk",
            "apiSpecPath": "/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "",
            "endpointPath": "/anthropic/v1/files/{file_id}/content",
            "endpointMethod": "GET",
            "operationId": "anthropicRetrieveFileContent",
            "packageName": "@sdkwork/example-open-sdk",
            "author": "SDKWork",
            "license": "MIT",
            "description": "Example Open API SDK"
        }
    })
    .to_string()
}

fn gateway_sdk_reference_request_body_with_selected_conversation_list_operation() -> String {
    json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Example Open API",
                "version": "0.1.0"
            },
            "paths": {
                "/v1/conversations": {
                    "get": {
                        "operationId": "listConversations",
                        "tags": ["Conversations"],
                        "summary": "List conversations",
                        "parameters": [
                            {
                                "description": "Maximum number of objects to return.",
                                "in": "query",
                                "name": "limit",
                                "required": false,
                                "schema": {
                                    "type": "integer"
                                }
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/OpenAiConversationList"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "OpenAiConversationList": {
                        "type": "object",
                        "properties": {
                            "data": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/OpenAiConversation"
                                }
                            }
                        }
                    },
                    "OpenAiConversation": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAiClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "ai",
            "outputPath": "./sdk",
            "apiSpecPath": "/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "",
            "endpointPath": "/v1/conversations",
            "endpointMethod": "GET",
            "operationId": "listConversations",
            "packageName": "@sdkwork/example-open-sdk",
            "author": "SDKWork",
            "license": "MIT",
            "description": "Example Open API SDK"
        }
    })
    .to_string()
}

fn gateway_sdk_reference_request_body_with_stale_config_language() -> String {
    let mut payload: Value = serde_json::from_str(
        &gateway_sdk_reference_request_body_with_selected_conversation_list_operation(),
    )
    .unwrap();
    payload["language"] = Value::String("python".to_owned());
    payload["config"]["language"] = Value::String("typescript".to_owned());
    payload.to_string()
}

fn gateway_sdk_reference_request_body_with_language(language: &str) -> String {
    let mut payload: Value = serde_json::from_str(
        &gateway_sdk_reference_request_body_with_selected_conversation_list_operation(),
    )
    .unwrap();
    payload["language"] = Value::String(language.to_owned());
    payload["config"]["language"] = Value::String(language.to_owned());
    payload.to_string()
}

fn gateway_sdk_reference_request_body_with_selected_fine_tuning_events_operation() -> String {
    json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Example Open API",
                "version": "0.1.0"
            },
            "paths": {
                "/v1/fine_tuning/jobs/{fine_tuning_job_id}/events": {
                    "get": {
                        "operationId": "listFineTuningEvents",
                        "tags": ["Fine Tuning"],
                        "summary": "List fine tuning events",
                        "parameters": [
                            {
                                "description": "Fine tuning job identifier.",
                                "in": "path",
                                "name": "fine_tuning_job_id",
                                "required": true,
                                "schema": {
                                    "type": "string"
                                }
                            },
                            {
                                "description": "Maximum number of objects to return.",
                                "in": "query",
                                "name": "limit",
                                "required": false,
                                "schema": {
                                    "type": "integer"
                                }
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/OpenAiFineTuningJobEventList"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "OpenAiFineTuningJobEventList": {
                        "type": "object",
                        "properties": {
                            "data": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/OpenAiFineTuningJobEvent"
                                }
                            }
                        }
                    },
                    "OpenAiFineTuningJobEvent": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAiClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "ai",
            "outputPath": "./sdk",
            "apiSpecPath": "/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "",
            "endpointPath": "/v1/fine_tuning/jobs/{fine_tuning_job_id}/events",
            "endpointMethod": "GET",
            "operationId": "listFineTuningEvents",
            "packageName": "@sdkwork/example-open-sdk",
            "author": "SDKWork",
            "license": "MIT",
            "description": "Example Open API SDK"
        }
    })
    .to_string()
}

fn large_sdk_reference_request_body() -> String {
    let mut payload: Value = serde_json::from_str(&sdk_reference_request_body()).unwrap();
    payload["spec"]["info"]["description"] = Value::String("x".repeat(2 * 1024 * 1024));
    payload.to_string()
}

async fn response_json(response: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

fn set_generator_env(base_url: &str) {
    clear_generator_env();
    std::env::set_var("SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL", base_url);
}

fn clear_generator_env() {
    for name in [
        "SDKWORK_DOCUMENTS_SDK_GENERATOR_BASE_URL",
        "SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY",
        "SDKWORK_DOCUMENTS_SDK_GENERATOR_API_KEY_FILE",
        "SDKWORK_CLOUDROUTER_SDK_GENERATOR_BASE_URL",
        "SDKWORK_CLOUDROUTER_SDK_GENERATOR_API_KEY",
        "SDKWORK_CLOUDROUTER_SDK_GENERATOR_API_KEY_FILE",
        "PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL",
        "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY",
        "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE",
    ] {
        std::env::remove_var(name);
    }
}

fn env_guard() -> &'static Mutex<()> {
    static ENV_GUARD: OnceLock<Mutex<()>> = OnceLock::new();
    ENV_GUARD.get_or_init(|| Mutex::new(()))
}
