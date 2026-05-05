-- =====================================================================
-- UI-OS — §16 Governance — change log + publish flow + approvals + versions  (20260502_0123)
--
-- Tables (4) — DKNF via dos.ui_target_kind_t / dos.ui_change_kind_t /
--                            dos.ui_publish_status_t / dos.ui_form_decision_t.
-- 4NF: approvals are children of publish_requests (independent).
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_change_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  actor_id      VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  change_kind   dos.ui_change_kind_t NOT NULL,
  before_state  JSONB,
  after_state   JSONB,
  reason        TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_change_log_target
  ON dos.ui_change_log (tenant_id, target_kind, target_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_change_log_actor
  ON dos.ui_change_log (tenant_id, actor_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_publish_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  draft_version_id UUID,
  requester_id  VARCHAR(64) NOT NULL,
  summary       TEXT,
  status        dos.ui_publish_status_t NOT NULL DEFAULT 'pending',
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_publish_requests_status
  ON dos.ui_publish_requests (tenant_id, status, requested_at DESC) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS dos.ui_publish_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  publish_request_id  UUID NOT NULL,
  approver_id         VARCHAR(64) NOT NULL,
  decision            dos.ui_form_decision_t NOT NULL DEFAULT 'pending',
  note                TEXT,
  decided_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_publish_approvals_request_fk
    FOREIGN KEY (publish_request_id) REFERENCES dos.ui_publish_requests(id) ON DELETE CASCADE,
  CONSTRAINT ui_publish_approvals_uk
    UNIQUE (publish_request_id, approver_id)
);

-- If a legacy Wave 9 skeleton ui_published_versions exists (target_type),
-- CREATE TABLE IF NOT EXISTS would no-op and indexes below would fail.
-- Drop dependents first, then the legacy table (matches 0131 partial logic).
DO $$
DECLARE
  legacy_pub BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos'
       AND table_name = 'ui_published_versions'
       AND column_name = 'target_type'
  ) INTO legacy_pub;

  IF legacy_pub THEN
    EXECUTE 'DROP TABLE IF EXISTS dos.ui_rollback_points CASCADE';
    EXECUTE 'DROP TABLE IF EXISTS dos.ui_published_versions CASCADE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS dos.ui_published_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_by  VARCHAR(64) NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current    BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ui_published_versions_uk
    UNIQUE (tenant_id, target_kind, target_id, version)
);

CREATE INDEX IF NOT EXISTS ix_ui_published_versions_current
  ON dos.ui_published_versions (tenant_id, target_kind, target_id) WHERE is_current = TRUE;

COMMIT;
