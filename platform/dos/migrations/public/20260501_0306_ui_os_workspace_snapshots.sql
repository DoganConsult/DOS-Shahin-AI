-- =====================================================================
-- UI-OS workspace snapshots (20260501_0306)
--
-- Wave 4 — Workspace vertical slice. Persists named snapshots of a
-- user's workspace (open apps / panels / layout) so they can be
-- restored later via POST /api/ui-os/workspace-state/restore/:id.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_workspace_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,
  workspace_key       VARCHAR(120) NOT NULL DEFAULT 'default',
  snapshot_key        VARCHAR(150) NOT NULL,

  product_code        VARCHAR(100),
  active_module_code  VARCHAR(100),
  active_route        VARCHAR(300),
  open_apps           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  panels              JSONB        NOT NULL DEFAULT '{}'::jsonb,
  layout_snapshot     JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, workspace_key, snapshot_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_snapshots_user
  ON dos.ui_workspace_snapshots (tenant_id, user_id, created_at DESC);

COMMIT;
