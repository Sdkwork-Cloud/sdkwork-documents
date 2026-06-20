use sdkwork_content_documents_repository_sqlx::{
    connect_sqlite_and_install_schema, DocumentsSqlxRepository,
};
use sdkwork_documents_contract::{
    Document, DocumentUpdateRequest, DocumentsRepository, DocumentsServiceError,
};

#[tokio::test]
async fn sqlite_document_repository_supports_crud_and_tenant_isolation() {
    let pool = connect_sqlite_and_install_schema("sqlite::memory:")
        .await
        .expect("connect sqlite pool");
    let repository = DocumentsSqlxRepository::new(pool);
    let tenant_a = 1001_i64;
    let tenant_b = 1002_i64;
    let document_id = "550e8400-e29b-41d4-a716-446655440000";

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
