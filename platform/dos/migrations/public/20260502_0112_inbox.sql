-- dos:draft
-- =====================================================================
-- UI-OS — §9 Inbox — views, rules, snoozes, assignments  (20260502_0112)
--
-- Tables (4) — 1NF: rules use JSONB (document shape) for match/action;
-- 4NF: snoozes and assignments are separate tables (independent relationships).
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_inbox_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64) NOT NULL,
  user_id      VARCHAR(64) NOT NULL,
  view_key     VARCHAR(150) NOT NULL,
  name_key     VARCHAR(150),
  filters      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_inbox_views_uk
    UNIQUE (tenant_id, user_id, view_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_inbox_views_user
  ON dos.ui_inbox_views (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_inbox_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64),
  rule_key          VARCHAR(150) NOT NULL,
  match_expression  JSONB NOT NULL DEFAULT '{}'::jsonb,
  action            JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority          INTEGER NOT NULL DEFAULT 100,
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        VARCHAR(64),
  updated_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_inbox_rules_uk
    UNIQUE NULLS NOT DISTINCT (tenant_id, user_id, rule_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_inbox_rules_tenant_user
  ON dos.ui_inbox_rules (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_inbox_snoozes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  notification_id UUID NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  snooze_until    TIMESTAMPTZ NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_inbox_snoozes_notif_fk
    FOREIGN KEY (notification_id) REFERENCES dos.ui_notification_center_items(id) ON DELETE CASCADE,
  CONSTRAINT ui_inbox_snoozes_uk
    UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_inbox_snoozes_user
  ON dos.ui_inbox_snoozes (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS ix_ui_inbox_snoozes_until
  ON dos.ui_inbox_snoozes (snooze_until);

CREATE TABLE IF NOT EXISTS dos.ui_inbox_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  notification_id   UUID NOT NULL,
  assigner_user_id  VARCHAR(64) NOT NULL,
  assignee_user_id  VARCHAR(64) NOT NULL,
  note              TEXT,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at   TIMESTAMPTZ,
  CONSTRAINT ui_inbox_assignments_notif_fk
    FOREIGN KEY (notification_id) REFERENCES dos.ui_notification_center_items(id) ON DELETE CASCADE,
  CONSTRAINT ui_inbox_assignments_uk
    UNIQUE (notification_id, assignee_user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_inbox_assignments_assignee
  ON dos.ui_inbox_assignments (tenant_id, assignee_user_id);

COMMIT;
