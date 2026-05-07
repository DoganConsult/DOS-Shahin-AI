-- =====================================================================
-- Foundation missing tables (20260502_0100)
--
-- Creates DDL that was referenced in services but had no CREATE TABLE:
--   • dos.committee_meetings      — meeting schedule + minutes for committees
--   • dos.user_roles              — user's active functional role assignment (light)
--   • dos.user_role_assignments   — role assignment ledger (SoD service uses this)
--   • dos.role_assignments        — durable role binding with soft-delete
--   • dos.module_sla_defaults     — per-module approval SLA thresholds
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

SET search_path = public;

-- ------------------------------------------------------------------ --
-- 1. Access-review lineage is canonical in DOS public migration       --
--    20260425_0005_access_review_tables.sql.                          --
--    Foundation migration must assert-only (no duplicate CREATE TABLE).--
-- ------------------------------------------------------------------ --
DO $$
BEGIN
  IF to_regclass('dos.access_reviews') IS NULL THEN
    RAISE EXCEPTION 'missing canonical table dos.access_reviews (expected from dos public migration)';
  END IF;
  IF to_regclass('dos.access_review_items') IS NULL THEN
    RAISE EXCEPTION 'missing canonical table dos.access_review_items (expected from dos public migration)';
  END IF;
END $$;

-- ------------------------------------------------------------------ --
-- 2. dos.committee_meetings                                           --
-- ------------------------------------------------------------------ --
CREATE TABLE IF NOT EXISTS dos.committee_meetings (
  meeting_id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id  UUID          NOT NULL,
  tenant_id     VARCHAR(64)   NOT NULL,
  title         VARCHAR(255)  NOT NULL,
  agenda        TEXT,
  scheduled_at  TIMESTAMPTZ   NOT NULL,
  location      VARCHAR(255),
  status        VARCHAR(30)   NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  minutes       TEXT,
  created_by    VARCHAR(64),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dos_committee_meetings_committee
  ON dos.committee_meetings(committee_id, tenant_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ --
-- 3. dos.user_roles                                                   --
--    Light snapshot: user's current primary functional role.          --
--    Used by access-snapshot service for fallback role lookup.        --
-- ------------------------------------------------------------------ --
CREATE TABLE IF NOT EXISTS dos.user_roles (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64)   NOT NULL,
  user_id       VARCHAR(64)   NOT NULL,
  role_code     VARCHAR(100)  NOT NULL,
  assigned_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  assigned_by   VARCHAR(64),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- Pre-existing live deploys may already have dos.user_roles in a slimmer
-- canonical shape; ensure 'ended_at' is present before referencing it.
ALTER TABLE dos.user_roles ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dos_user_roles_user
  ON dos.user_roles(tenant_id, user_id) WHERE ended_at IS NULL;

-- ------------------------------------------------------------------ --
-- 4. dos.user_role_assignments                                        --
--    Role assignment ledger used by SoD-check service.               --
-- ------------------------------------------------------------------ --
-- Pre-existing live deploys may already expose dos.user_role_assignments as a
-- VIEW over platform_dauth.user_role_assignments. Skip table/index creation
-- when relation already exists as a view (canonical-by-view doctrine).
DO $$
DECLARE r_kind CHAR;
BEGIN
  SELECT c.relkind INTO r_kind FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'dos' AND c.relname = 'user_role_assignments';
  IF r_kind IS NULL OR r_kind = 'r' THEN
    CREATE TABLE IF NOT EXISTS dos.user_role_assignments (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id     VARCHAR(64)   NOT NULL,
      user_id       VARCHAR(64)   NOT NULL,
      role_code     VARCHAR(100)  NOT NULL,
      granted_by    VARCHAR(64),
      granted_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      revoked_at    TIMESTAMPTZ,
      revoked_by    VARCHAR(64),
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dos_user_role_assignments_user
      ON dos.user_role_assignments(tenant_id, user_id) WHERE revoked_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_dos_user_role_assignments_active
      ON dos.user_role_assignments(tenant_id, user_id, role_code) WHERE revoked_at IS NULL;
  END IF;
END$$;

-- ------------------------------------------------------------------ --
-- 5. dos.role_assignments                                             --
--    Durable role-binding used by user-lifecycle offboarding.        --
-- ------------------------------------------------------------------ --
CREATE TABLE IF NOT EXISTS dos.role_assignments (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64)   NOT NULL,
  user_id       VARCHAR(64)   NOT NULL,
  role_code     VARCHAR(100)  NOT NULL,
  scope_type    VARCHAR(50),
  scope_id      VARCHAR(64),
  assigned_by   VARCHAR(64),
  assigned_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dos_role_assignments_user
  ON dos.role_assignments(tenant_id, user_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ --
-- 6. dos.module_sla_defaults                                          --
--    Per-module SLA thresholds for approval breach detection.        --
-- ------------------------------------------------------------------ --
CREATE TABLE IF NOT EXISTS dos.module_sla_defaults (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code    VARCHAR(100)  NOT NULL,
  sla_type       VARCHAR(50)   NOT NULL DEFAULT 'approval',
  threshold_hours INT          NOT NULL DEFAULT 24,
  description    TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- Pre-existing live deploys may have a slimmer module_sla_defaults; ensure
-- columns referenced below are present (additive, idempotent).
ALTER TABLE dos.module_sla_defaults ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dos.module_sla_defaults ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_dos_module_sla_defaults_module_type
  ON dos.module_sla_defaults(module_code, sla_type);

-- Seed standard foundation module SLA defaults
INSERT INTO dos.module_sla_defaults (module_code, sla_type, threshold_hours, description)
VALUES
  ('foundation', 'approval',        24, 'Foundation module approval SLA'),
  ('risk',        'approval',        48, 'Risk module approval SLA'),
  ('compliance',  'approval',        72, 'Compliance module approval SLA'),
  ('audit',       'approval',        48, 'Audit module approval SLA'),
  ('controls',    'approval',        48, 'Controls module approval SLA'),
  ('vendor',      'approval',        72, 'Vendor module approval SLA'),
  ('incident',    'approval',        24, 'Incident module approval SLA')
ON CONFLICT (module_code, sla_type) DO NOTHING;

COMMIT;
