-- compliance_export_jobs — async export lifecycle
CREATE TABLE IF NOT EXISTS compliance_export_jobs (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  scope_type    TEXT NOT NULL,
  format        TEXT NOT NULL CHECK (format IN ('csv','xlsx','pdf','json')),
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  query         JSONB NOT NULL,
  result_url    TEXT,
  error_code    TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_compliance_export_jobs_tenant
  ON compliance_export_jobs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_compliance_export_jobs_status
  ON compliance_export_jobs (status, updated_at DESC);
