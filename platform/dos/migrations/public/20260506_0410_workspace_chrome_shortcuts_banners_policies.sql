-- ZERO-LEGACY UI-OS cutover (Phase 1a).
-- Creates the four UI-OS runtime envelope tables needed by
-- /api/ui-os/workspace-runtime: chrome, shortcuts, banners, policies.
--
-- All tables are tenant-scoped, idempotent, additive, and fail-closed
-- (no defaults, no synthesis). UI-OS resolver emits empty arrays/objects
-- when no rows exist for a tenant — frontend renders nothing.
--
-- DOS Master controlled DDL:
--   These tables are NOT in the DOS Master controlled set
--   (dos_master_only trigger attaches to specific tables per the
--   2026-05-04 ledger). Plain DDL is correct.
--
-- Test-DB note: snapshot taken via row-count baseline above this
-- migration; no destructive ops.

BEGIN;

-- ─── Chrome (tenant scalar/object KV) ─────────────────────────────────
-- Holds labels, routes, titleTemplate, accountMenu, brand assets.
-- Read by resolver as `chrome[key] = valueJson`.
CREATE TABLE IF NOT EXISTS dos.ui_workspace_chrome (
  tenant_id   varchar(64) NOT NULL,
  chrome_key  text        NOT NULL,
  value_json  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  enabled     boolean     NOT NULL DEFAULT true,
  version     integer     NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, chrome_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_chrome_tenant
  ON dos.ui_workspace_chrome (tenant_id) WHERE enabled = true;

-- ─── Shortcuts (tenant rows) ──────────────────────────────────────────
-- Each row is one keyboard shortcut bound to a typed ShellAction.
CREATE TABLE IF NOT EXISTS dos.ui_workspace_shortcut (
  tenant_id    varchar(64) NOT NULL,
  shortcut_id  text        NOT NULL,
  combo        text        NOT NULL,
  action_json  jsonb       NOT NULL,
  when_clause  text,
  sort_order   integer     NOT NULL DEFAULT 0,
  enabled      boolean     NOT NULL DEFAULT true,
  version      integer     NOT NULL DEFAULT 1,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, shortcut_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_shortcut_tenant
  ON dos.ui_workspace_shortcut (tenant_id, sort_order) WHERE enabled = true;

-- ─── Banners (tenant rows) ────────────────────────────────────────────
-- Each row is one banner template; gate selects which lifecycle event
-- triggers it (trial-expired, offline, session-expiry, etc.).
CREATE TABLE IF NOT EXISTS dos.ui_workspace_banner (
  tenant_id        varchar(64) NOT NULL,
  banner_id        text        NOT NULL,
  gate             text        NOT NULL DEFAULT 'always',
  kind             text        NOT NULL DEFAULT 'info',
  title_key        text,
  title_fallback   text,
  message_key      text,
  message_fallback text,
  action_label_key text,
  action_json      jsonb,
  dismissible      boolean     NOT NULL DEFAULT true,
  sort_order       integer     NOT NULL DEFAULT 0,
  enabled          boolean     NOT NULL DEFAULT true,
  version          integer     NOT NULL DEFAULT 1,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, banner_id),
  CHECK (kind IN ('info','warning','error','success','danger'))
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_banner_tenant
  ON dos.ui_workspace_banner (tenant_id, sort_order) WHERE enabled = true;

-- ─── Policies (tenant scalar/object KV) ───────────────────────────────
-- Holds sessionExpiry, layout breakpoints, RBAC fail-closed flags, etc.
-- Read by resolver as `policies[key] = valueJson`.
CREATE TABLE IF NOT EXISTS dos.ui_workspace_policy (
  tenant_id   varchar(64) NOT NULL,
  policy_key  text        NOT NULL,
  value_json  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  enabled     boolean     NOT NULL DEFAULT true,
  version     integer     NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, policy_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_policy_tenant
  ON dos.ui_workspace_policy (tenant_id) WHERE enabled = true;

-- ─── Self-assertions ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='dos' AND table_name='ui_workspace_chrome'
  ) THEN RAISE EXCEPTION 'ui_workspace_chrome not created'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='dos' AND table_name='ui_workspace_shortcut'
  ) THEN RAISE EXCEPTION 'ui_workspace_shortcut not created'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='dos' AND table_name='ui_workspace_banner'
  ) THEN RAISE EXCEPTION 'ui_workspace_banner not created'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='dos' AND table_name='ui_workspace_policy'
  ) THEN RAISE EXCEPTION 'ui_workspace_policy not created'; END IF;
END$$;

COMMIT;
