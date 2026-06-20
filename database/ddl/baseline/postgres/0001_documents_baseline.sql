-- SDKWork Documents baseline DDL
CREATE TABLE IF NOT EXISTS documents_document (
  id UUID PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_document_tenant ON documents_document (tenant_id);

CREATE TABLE IF NOT EXISTS documents_revision (
  id UUID PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  document_id UUID NOT NULL,
  revision_number BIGINT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_revision_tenant ON documents_revision (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_revision_document ON documents_revision (document_id);

CREATE TABLE IF NOT EXISTS documents_audit_log (
  id UUID PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  document_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id BIGINT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_tenant ON documents_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_audit_log_document ON documents_audit_log (document_id);
