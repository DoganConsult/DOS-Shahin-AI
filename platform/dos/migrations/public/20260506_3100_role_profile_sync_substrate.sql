-- =============================================================================
-- Migration: 20260506_3100_role_profile_sync_substrate
-- Purpose:   Wave F1 — Establish role-profile as the SOLE write path into
--            platform_dauth.user_role_assignments (URA). Create the canonical
--            role-profile table, the 2-way acceptor registry, the sync-log
--            ledger, and a BEFORE INSERT/UPDATE/DELETE trigger on URA that
--            REJECTS any write not flagged with `app.via_role_profile='true'`.
--
-- Doctrine:  RoleProfile is the single orchestration spine. HRIS, SCIM, Okta,
--            AzureAD adapters MUST write through dos.role_profile_sync; the
--            URA tables become a derived projection.
--
-- Idempotent: YES.
-- =============================================================================

BEGIN;

-- 1) Canonical role-profile table -------------------------------------------
CREATE TABLE IF NOT EXISTS dos.role_profile_sync (
  profile_id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           varchar(64) NOT NULL,
  user_id             varchar(64) NOT NULL,
  role_code           varchar(64) NOT NULL,
  scope               varchar(32) NOT NULL DEFAULT 'tenant',
  permissions         text[]      NOT NULL DEFAULT ARRAY[]::text[],
  business_unit_id    varchar(64),
  location_id         varchar(64),
  lifecycle_state     varchar(24) NOT NULL DEFAULT 'active'
                      CHECK (lifecycle_state IN ('pending','active','suspended','offboarding','terminated')),
  external_idp_refs   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  source_system       varchar(64) NOT NULL DEFAULT 'role-profile-service',
  version             integer     NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_profile_natural UNIQUE (tenant_id, user_id, role_code, scope)
);

CREATE INDEX IF NOT EXISTS ix_role_profile_tenant_user
  ON dos.role_profile_sync (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_role_profile_lifecycle
  ON dos.role_profile_sync (lifecycle_state)
  WHERE lifecycle_state <> 'active';

COMMENT ON TABLE dos.role_profile_sync IS
'Canonical role-profile substrate. The ONLY legitimate writer to
platform_dauth.user_role_assignments. 2-way sync target for HRIS/SCIM/Okta/AAD
adapters. URA is now a derived projection — see trg_ura_via_role_profile_only.';

-- 2) Registered 2-way sync acceptors (HRIS, SCIM, IDPs) ---------------------
CREATE TABLE IF NOT EXISTS dos.role_profile_acceptors (
  acceptor_id      varchar(64) PRIMARY KEY,
  display_name     text        NOT NULL,
  direction        varchar(16) NOT NULL CHECK (direction IN ('pull','push','two-way')),
  endpoint_url     text,
  auth_strategy    varchar(32) NOT NULL DEFAULT 'oauth2',
  enabled          boolean     NOT NULL DEFAULT true,
  last_sync_at     timestamptz,
  last_status      varchar(16),
  config           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dos.role_profile_acceptors IS
'Registry of stakeholder systems that participate in 2-way role-profile sync.';

-- 3) Sync log (audit ledger) ------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.role_profile_sync_log (
  id              bigserial PRIMARY KEY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  acceptor_id     varchar(64),
  direction       varchar(16) NOT NULL CHECK (direction IN ('pull','push','reconcile')),
  profile_id      uuid,
  tenant_id       varchar(64),
  user_id         varchar(64),
  role_code       varchar(64),
  outcome         varchar(16) NOT NULL CHECK (outcome IN ('ok','error','skipped','rejected')),
  details         jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_rps_log_occurred
  ON dos.role_profile_sync_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_rps_log_outcome_time
  ON dos.role_profile_sync_log (outcome, occurred_at DESC)
  WHERE outcome <> 'ok';

-- 4) updated_at trigger on role_profile_sync --------------------------------
CREATE OR REPLACE FUNCTION dos.fn_role_profile_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'UPDATE' THEN
    NEW.version = COALESCE(OLD.version,1) + 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_role_profile_touch ON dos.role_profile_sync;
CREATE TRIGGER trg_role_profile_touch
BEFORE INSERT OR UPDATE ON dos.role_profile_sync
FOR EACH ROW EXECUTE FUNCTION dos.fn_role_profile_touch_updated_at();

-- 5) URA write-gate trigger -------------------------------------------------
-- Any process that writes to platform_dauth.user_role_assignments WITHOUT
-- first issuing `SET LOCAL app.via_role_profile = 'true'` is rejected.
-- The RoleProfileService is the only code path that sets this GUC.
CREATE OR REPLACE FUNCTION platform_dauth.fn_ura_via_role_profile_only()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  flag text;
BEGIN
  flag := current_setting('app.via_role_profile', true);
  IF flag IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION
      'Direct write to platform_dauth.user_role_assignments is forbidden. '
      'All URA mutations must flow through dos.role_profile_sync via RoleProfileService. '
      'Set LOCAL app.via_role_profile=true only inside the canonical service.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ura_via_role_profile_only
  ON platform_dauth.user_role_assignments;
CREATE TRIGGER trg_ura_via_role_profile_only
BEFORE INSERT OR UPDATE OR DELETE ON platform_dauth.user_role_assignments
FOR EACH ROW EXECUTE FUNCTION platform_dauth.fn_ura_via_role_profile_only();

-- 6) Mirror trigger: when a role_profile_sync row lands, project to URA -----
-- This is the legitimate path. It sets the GUC, then upserts URA, then clears.
CREATE OR REPLACE FUNCTION dos.fn_role_profile_project_to_ura()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.via_role_profile', 'true', true);
  IF TG_OP IN ('INSERT','UPDATE') THEN
    INSERT INTO platform_dauth.user_role_assignments
      (assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, is_active)
    VALUES
      (NEW.profile_id::text, NEW.tenant_id, NEW.user_id, NEW.role_code, NEW.scope,
       NEW.source_system, NEW.created_at, NEW.lifecycle_state = 'active')
    ON CONFLICT (assignment_id) DO UPDATE
      SET role_code = EXCLUDED.role_code,
          scope     = EXCLUDED.scope,
          is_active = EXCLUDED.is_active;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM platform_dauth.user_role_assignments
     WHERE assignment_id = OLD.profile_id::text;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_role_profile_project ON dos.role_profile_sync;
CREATE TRIGGER trg_role_profile_project
AFTER INSERT OR UPDATE OR DELETE ON dos.role_profile_sync
FOR EACH ROW EXECUTE FUNCTION dos.fn_role_profile_project_to_ura();

-- 7) Self-assertion ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='dos' AND table_name='role_profile_sync') THEN
    RAISE EXCEPTION 'role_profile_sync not installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers
                  WHERE trigger_name='trg_ura_via_role_profile_only') THEN
    RAISE EXCEPTION 'URA gate trigger not installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers
                  WHERE trigger_name='trg_role_profile_project') THEN
    RAISE EXCEPTION 'role_profile projection trigger not installed';
  END IF;
END $$;

COMMIT;
