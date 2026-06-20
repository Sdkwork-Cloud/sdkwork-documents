use axum::{
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};

use crate::{DocumentsServiceError, ProblemDetails};

pub type ApiResult<T> = Result<T, DocumentsServiceError>;
pub type ApiProblem = Box<DocumentsApiProblem>;

#[derive(Debug, Clone)]
pub struct DocumentsApiProblem {
    status: StatusCode,
    problem: ProblemDetails,
}

impl DocumentsApiProblem {
    pub fn unauthorized(code: &str, detail: impl Into<String>) -> ApiProblem {
        Box::new(Self {
            status: StatusCode::UNAUTHORIZED,
            problem: ProblemDetails {
                problem_type: "about:blank".to_owned(),
                title: "Unauthorized".to_owned(),
                status: StatusCode::UNAUTHORIZED.as_u16(),
                detail: Some(detail.into()),
                instance: None,
                code: Some(code.to_owned()),
            },
        })
    }

    pub fn from_service_error(error: DocumentsServiceError) -> ApiProblem {
        let (status, title, code) = match &error {
            DocumentsServiceError::Validation(_) => {
                (StatusCode::BAD_REQUEST, "Bad Request", "validation_failed")
            }
            DocumentsServiceError::NotFound(_) => (StatusCode::NOT_FOUND, "Not Found", "not_found"),
            DocumentsServiceError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "internal_error",
            ),
        };
        Box::new(Self {
            status,
            problem: ProblemDetails {
                problem_type: "about:blank".to_owned(),
                title: title.to_owned(),
                status: status.as_u16(),
                detail: Some(error.to_string()),
                instance: None,
                code: Some(code.to_owned()),
            },
        })
    }
}

impl IntoResponse for ApiProblem {
    fn into_response(self) -> Response {
        (*self).into_response()
    }
}

impl IntoResponse for DocumentsApiProblem {
    fn into_response(self) -> Response {
        let mut response = (self.status, Json(self.problem)).into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/problem+json"),
        );
        response
    }
}

pub fn ok_json<T>(result: ApiResult<T>) -> Response
where
    T: serde::Serialize,
{
    match result {
        Ok(value) => Json(value).into_response(),
        Err(error) => DocumentsApiProblem::from_service_error(error).into_response(),
    }
}

pub fn created_json<T>(result: ApiResult<T>) -> Response
where
    T: serde::Serialize,
{
    match result {
        Ok(value) => (StatusCode::CREATED, Json(value)).into_response(),
        Err(error) => DocumentsApiProblem::from_service_error(error).into_response(),
    }
}

pub fn no_content(result: ApiResult<()>) -> Response {
    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => DocumentsApiProblem::from_service_error(error).into_response(),
    }
}
