use axum::Extension;
use sdkwork_documents_contract::{DocumentsApiProblem, DocumentsAppRequestContext};

use crate::ApiProblem;

pub fn require_app_context(
    context: Option<Extension<DocumentsAppRequestContext>>,
) -> Result<DocumentsAppRequestContext, ApiProblem> {
    context.map(|Extension(context)| context).ok_or_else(|| {
        DocumentsApiProblem::unauthorized(
            "missing_app_api_request_context",
            "authenticated app API session context is required",
        )
    })
}
