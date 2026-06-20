-- SDKWork Documents baseline DDL (sqlite)
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

CREATE TABLE IF NOT EXISTS documents_revision (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id INTEGER NOT NULL,
  document_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_revision_tenant ON documents_revision (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_revision_document ON documents_revision (document_id);

CREATE TABLE IF NOT EXISTS documents_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id INTEGER NOT NULL,
  document_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_tenant ON documents_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_document ON documents_audit_log (document_id);
