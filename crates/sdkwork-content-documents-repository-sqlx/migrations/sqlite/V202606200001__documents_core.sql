-- SDKWork Documents core schema
CREATE TABLE IF NOT EXISTS documents_document (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_document_tenant ON documents_document (tenant_id);
