use axum::{
    extract::{Path, State},
    response::Response,
    Extension, Json,
};
use sdkwork_documents_contract::{DocumentCreateRequest, DocumentUpdateRequest};

use crate::{
    auth,
    ports::DocumentsAppRequestContext,
    response::{created_json, ok_json, ApiProblem},
    routes::AppState,
};

pub(crate) async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "service": "sdkwork-documents-app-api" }))
}

pub(crate) async fn list_documents(
    State(state): State<AppState>,
    context: Option<Extension<DocumentsAppRequestContext>>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_app_context(context)?;
    Ok(ok_json(state.api.list_documents(context).await))
}

pub(crate) async fn create_document(
    State(state): State<AppState>,
    context: Option<Extension<DocumentsAppRequestContext>>,
    Json(request): Json<DocumentCreateRequest>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_app_context(context)?;
    Ok(created_json(
        state.api.create_document(context, request).await,
    ))
}

pub(crate) async fn retrieve_document(
    State(state): State<AppState>,
    context: Option<Extension<DocumentsAppRequestContext>>,
    Path(document_id): Path<String>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_app_context(context)?;
    Ok(ok_json(
        state.api.retrieve_document(context, document_id).await,
    ))
}

pub(crate) async fn update_document(
    State(state): State<AppState>,
    context: Option<Extension<DocumentsAppRequestContext>>,
    Path(document_id): Path<String>,
    Json(request): Json<DocumentUpdateRequest>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_app_context(context)?;
    Ok(ok_json(
        state
            .api
            .update_document(context, document_id, request)
            .await,
    ))
}
