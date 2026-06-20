use axum::{
    extract::{Path, State},
    response::Response,
    Extension, Json,
};

use crate::{
    auth,
    ports::DocumentsOpenApiRequestContext,
    response::{ok_json, ApiProblem},
    routes::OpenState,
};

pub(crate) async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "service": "sdkwork-documents-open-api" }))
}

pub(crate) async fn retrieve_capabilities(
    State(state): State<OpenState>,
    context: Option<Extension<DocumentsOpenApiRequestContext>>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_open_context(context)?;
    Ok(ok_json(state.api.retrieve_capabilities(context).await))
}

pub(crate) async fn list_documents(
    State(state): State<OpenState>,
    context: Option<Extension<DocumentsOpenApiRequestContext>>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_open_context(context)?;
    Ok(ok_json(state.api.list_documents(context).await))
}

pub(crate) async fn retrieve_document(
    State(state): State<OpenState>,
    context: Option<Extension<DocumentsOpenApiRequestContext>>,
    Path(document_id): Path<String>,
) -> Result<Response, ApiProblem> {
    let context = auth::require_open_context(context)?;
    Ok(ok_json(
        state.api.retrieve_document(context, document_id).await,
    ))
}
