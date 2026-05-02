-- =====================================================================
-- UI-OS — drift reconciliation: admin publishing tables  (20260502_0131)
--
-- Resolves the one-source drift between the deprecated 0307 (Wave 9
-- skeleton, bare TEXT) and the canonical 0123/0124 (Wave 11l §16,
-- DKNF/ENUM) schemas for:
--   ui_draft_versions, ui_published_versions, ui_rollback_points,
--   ui_admin_activity_log
--
-- Strategy: detect legacy column shape; if present, DROP the legacy
-- tables so the canonical 0123/0124 migrations recreate them with
-- the §16 schema on next replay. Tables are admin-publishing scaffolds
-- that were never wired to a Wave 9 manager (the §16 manager is the
-- only consumer), so dropping is safe.
--
-- Idempotent: safe to re-run; safe on fresh DBs where 0123/0124 ran
-- first (legacy columns will not be present → no-op).
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

DO $$
DECLARE
  legacy_draft   BOOLEAN;
  legacy_pub     BOOLEAN;
  legacy_rb      BOOLEAN;
  legacy_log     BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='dos' AND table_name='ui_draft_versions'
       AND column_name='target_type'
  ) INTO legacy_draft;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='dos' AND table_name='ui_published_versions'
       AND column_name='target_type'
  ) INTO legacy_pub;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='dos' AND table_name='ui_rollback_points'
       AND column_name='version_id'
  ) INTO legacy_rb;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='dos' AND table_name='ui_admin_activity_log'
       AND column_name='actor'
  ) INTO legacy_log;

  IF legacy_rb THEN
    EXECUTE 'DROP TABLE IF EXISTS dos.ui_rollback_points CASCADE';
  END IF;
  IF legacy_pub THEN
    EXECUTE 'DROP TABLE IF EXISTS dos.ui_published_versions CASCADE';
  END IF;
  IF legacy_draft THEN
    EXECUTE 'DROP TABLE IF EXISTS dos.ui_draft_versions CASCADE';
  END IF;
  IF legacy_log THEN
    EXECUTE 'DROP TABLE IF EXISTS dos.ui_admin_activity_log CASCADE';
  END IF;
END $$;

-- Re-apply canonical §16 schemas (idempotent — match 0123/0124 exactly).
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

CREATE TABLE IF NOT EXISTS dos.ui_draft_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  author_id     VARCHAR(64) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_draft_versions_uk
    UNIQUE (tenant_id, target_kind, target_id, version)
);

CREATE TABLE IF NOT EXISTS dos.ui_rollback_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason        TEXT,
  created_by    VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_rollback_points_uk
    UNIQUE (tenant_id, target_kind, target_id, version)
);

CREATE TABLE IF NOT EXISTS dos.ui_admin_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  actor_id      VARCHAR(64) NOT NULL,
  action_code   VARCHAR(150) NOT NULL,
  target_kind   dos.ui_target_kind_t,
  target_id     VARCHAR(150),
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_published_versions_current
  ON dos.ui_published_versions (tenant_id, target_kind, target_id) WHERE is_current=TRUE;
CREATE INDEX IF NOT EXISTS ix_ui_draft_versions_active
  ON dos.ui_draft_versions (tenant_id, target_kind, target_id) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS ix_ui_rollback_points_target
  ON dos.ui_rollback_points (tenant_id, target_kind, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ui_admin_activity_log_actor
  ON dos.ui_admin_activity_log (tenant_id, actor_id, occurred_at DESC);

-- Annotate the canonical §16 publish/governance surface.
COMMENT ON TABLE dos.ui_published_versions   IS 'UI-OS §16 — current/historical published payloads per (target_kind,target_id,version). DKNF via dos.ui_target_kind_t.';
COMMENT ON TABLE dos.ui_draft_versions       IS 'UI-OS §16 — author-owned drafts pending publish; multiple drafts per target via version key.';
COMMENT ON TABLE dos.ui_rollback_points      IS 'UI-OS §16 — explicit restore-points captured before risky publishes; supports rollback flows.';
COMMENT ON TABLE dos.ui_admin_activity_log   IS 'UI-OS §16 — append-only admin action audit (actor_id, action_code, target).';

COMMIT;
