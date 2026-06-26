use axum::Extension;
use sdkwork_documents_contract::{DocumentsApiProblem, DocumentsOpenApiRequestContext};

use crate::ApiProblem;

pub fn require_open_context(
    context: Option<Extension<DocumentsOpenApiRequestContext>>,
) -> Result<DocumentsOpenApiRequestContext, ApiProblem> {
    context.map(|Extension(context)| context).ok_or_else(|| {
        DocumentsApiProblem::unauthorized(
            "missing_open_api_request_context",
            "authenticated open API credential context is required",
        )
    })
}
