-- dos:draft
-- =====================================================================
-- UI-OS — §6 Grids — bulk jobs, inline edit sessions, validation errors  (20260502_0105)
--
-- Tables created (3) — DKNF via dos.ui_job_status_t:
--   1. dos.ui_data_grid_bulk_jobs
--   2. dos.ui_data_grid_inline_edit_sessions
--   3. dos.ui_data_grid_validation_errors
--
-- Normalization:
--   - DKNF: status uses dos.ui_job_status_t.
--   - 4NF: validation_errors is its own table (one error per cell), not an
--          array column on inline_edit_sessions.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_data_grid_bulk_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  grid_key        VARCHAR(150) NOT NULL,
  action_kind     VARCHAR(40) NOT NULL,
  targets         JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          dos.ui_job_status_t NOT NULL DEFAULT 'queued',
  progress        INTEGER NOT NULL DEFAULT 0,
  error           JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_bulk_jobs_progress_chk
    CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_bulk_jobs_tenant_user
  ON dos.ui_data_grid_bulk_jobs (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_bulk_jobs_status
  ON dos.ui_data_grid_bulk_jobs (tenant_id, status) WHERE status IN ('queued','running');

CREATE TABLE IF NOT EXISTS dos.ui_data_grid_inline_edit_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  session_key     VARCHAR(64) NOT NULL,
  grid_key        VARCHAR(150) NOT NULL,
  row_pk          JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at      TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_inline_edit_session_uk
    UNIQUE (tenant_id, session_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_inline_edit_sessions_user
  ON dos.ui_data_grid_inline_edit_sessions (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_inline_edit_sessions_expires
  ON dos.ui_data_grid_inline_edit_sessions (expires_at) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS dos.ui_data_grid_validation_errors (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(64) NOT NULL,
  inline_edit_session_id   UUID NOT NULL,
  column_key               VARCHAR(100) NOT NULL,
  error_code               VARCHAR(100) NOT NULL,
  message_key              VARCHAR(150),
  details                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_validation_errors_session_fk
    FOREIGN KEY (inline_edit_session_id) REFERENCES dos.ui_data_grid_inline_edit_sessions(id) ON DELETE CASCADE,
  CONSTRAINT ui_data_grid_validation_errors_uk
    UNIQUE (inline_edit_session_id, column_key, error_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_validation_errors_session
  ON dos.ui_data_grid_validation_errors (inline_edit_session_id);

COMMIT;
