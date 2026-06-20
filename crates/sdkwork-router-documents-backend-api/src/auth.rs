use axum::Extension;
use sdkwork_documents_contract::{DocumentsApiProblem, DocumentsBackendRequestContext};

use crate::ApiProblem;

pub fn require_backend_context(
    context: Option<Extension<DocumentsBackendRequestContext>>,
) -> Result<DocumentsBackendRequestContext, ApiProblem> {
    context.map(|Extension(context)| context).ok_or_else(|| {
        DocumentsApiProblem::unauthorized(
            "missing_backend_api_request_context",
            "authenticated backend API operator context is required",
        )
    })
}
