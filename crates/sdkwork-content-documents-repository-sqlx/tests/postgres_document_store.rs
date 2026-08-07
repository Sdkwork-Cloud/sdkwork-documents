use sdkwork_content_documents_repository_sqlx::{
    connect_postgres_and_install_schema, DocumentsSqlxRepository,
};
use sdkwork_documents_contract::{
    Document, DocumentUpdateRequest, DocumentsRepository, DocumentsServiceError,
};

#[tokio::test]
async fn postgres_document_repository_supports_crud_and_tenant_isolation() {
    let Some(database_url) = std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .filter(|value| value.starts_with("postgres"))
    else {
        eprintln!("skip postgres_document_repository_supports_crud_and_tenant_isolation: set SDKWORK_DATABASE_URL to an isolated sdkwork_ai_test database");
        return;
    };

    let pool = connect_postgres_and_install_schema(&database_url)
        .await
        .expect("connect postgres pool");
    run_document_repository_crud_suite(DocumentsSqlxRepository::new(pool)).await;
}


async fn run_document_repository_crud_suite(repository: DocumentsSqlxRepository) {
    let tenant_a = 2001_i64;
    let tenant_b = 2002_i64;
    let document_id = "660e8400-e29b-41d4-a716-446655440001";

    repository
        .insert(
            tenant_a,
            Document {
                id: document_id.to_string(),
                title: "Tenant A Doc".to_string(),
                body: "hello".to_string(),
                status: "draft".to_string(),
            },
        )
        .await
        .expect("insert tenant A document");

    let listed = repository
        .list_by_tenant(tenant_a)
        .await
        .expect("list tenant A documents");
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].title, "Tenant A Doc");

    let missing = repository
        .find_by_id(tenant_b, document_id)
        .await
        .expect("tenant B lookup");
    assert!(missing.is_none());

    let updated = repository
        .update(
            tenant_a,
            document_id,
            DocumentUpdateRequest {
                title: Some("Updated Title".to_string()),
                body: None,
                status: Some("published".to_string()),
            },
        )
        .await
        .expect("update document");
    assert_eq!(updated.title, "Updated Title");
    assert_eq!(updated.status, "published");

    repository
        .delete(tenant_a, document_id)
        .await
        .expect("delete document");

    let deleted = repository
        .find_by_id(tenant_a, document_id)
        .await
        .expect("post-delete lookup");
    assert!(deleted.is_none());

    let not_found = repository.delete(tenant_a, document_id).await;
    assert!(matches!(not_found, Err(DocumentsServiceError::NotFound(_))));
}
