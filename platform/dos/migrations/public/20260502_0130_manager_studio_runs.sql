-- dos:draft
-- =====================================================================
-- UI-OS — §20 UI Manager Studio — validation runs, preview sessions, import/export jobs  (20260502_0130)
--
-- Tables (4) — DKNF via dos.ui_job_status_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_manager_validation_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  project_id    UUID NOT NULL,
  kind          VARCHAR(60) NOT NULL,
  passed        BOOLEAN NOT NULL,
  findings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  validator_version VARCHAR(40),
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_validation_runs_project_fk
    FOREIGN KEY (project_id) REFERENCES dos.ui_manager_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_validation_runs_project
  ON dos.ui_manager_validation_runs (project_id, ran_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_manager_preview_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  project_id          UUID NOT NULL,
  token               VARCHAR(80) NOT NULL,
  created_by_user_id  VARCHAR(64) NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_preview_sessions_project_fk
    FOREIGN KEY (project_id) REFERENCES dos.ui_manager_projects(id) ON DELETE CASCADE,
  CONSTRAINT ui_manager_preview_sessions_token_uk UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_preview_sessions_project
  ON dos.ui_manager_preview_sessions (project_id);

CREATE INDEX IF NOT EXISTS ix_ui_manager_preview_sessions_active
  ON dos.ui_manager_preview_sessions (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.ui_manager_import_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  project_id    UUID,
  kind          VARCHAR(60) NOT NULL,
  source_url    TEXT,
  status        dos.ui_job_status_t NOT NULL DEFAULT 'queued',
  progress      INTEGER NOT NULL DEFAULT 0,
  error         JSONB,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_import_jobs_project_fk
    FOREIGN KEY (project_id) REFERENCES dos.ui_manager_projects(id) ON DELETE SET NULL,
  CONSTRAINT ui_manager_import_jobs_progress_chk
    CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_import_jobs_status
  ON dos.ui_manager_import_jobs (tenant_id, status) WHERE status IN ('queued','running');

CREATE TABLE IF NOT EXISTS dos.ui_manager_export_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  project_id    UUID,
  kind          VARCHAR(60) NOT NULL,
  target_format VARCHAR(20) NOT NULL,
  download_url  TEXT,
  status        dos.ui_job_status_t NOT NULL DEFAULT 'queued',
  progress      INTEGER NOT NULL DEFAULT 0,
  error         JSONB,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_export_jobs_project_fk
    FOREIGN KEY (project_id) REFERENCES dos.ui_manager_projects(id) ON DELETE SET NULL,
  CONSTRAINT ui_manager_export_jobs_progress_chk
    CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_export_jobs_status
  ON dos.ui_manager_export_jobs (tenant_id, status) WHERE status IN ('queued','running');

COMMIT;
