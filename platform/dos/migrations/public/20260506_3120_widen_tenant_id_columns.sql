-- =============================================================================
-- Migration: 20260506_3120_widen_tenant_id_columns
-- Purpose:   Closure-plan Section C — widen legacy varchar(16) tenant_id
--            columns to varchar(64) so that hex-UUID-form tenant identifiers
--            and human-readable test tenant ids both fit. UPGRADE ONLY —
--            never narrows.
--
-- Tables widened:
--   dos.tenants.tenant_id
--   dos.tenant_product_activation.tenant_id
--   dos.tenant_migrations.tenant_id            (if exists)
--   dos.tenant_schema_allowlist.schema_name    (already 64; verify only)
--
-- Idempotent: YES.
-- =============================================================================

BEGIN;

-- Drop dependent RLS policies (recreated identically below) -----------------
DROP POLICY IF EXISTS tenant_isolation ON dos.tenants;
DROP POLICY IF EXISTS tenant_isolation ON dos.tenant_product_activation;
DROP POLICY IF EXISTS tenant_isolation ON dos.tenant_migrations;
DROP POLICY IF EXISTS tenant_isolation ON platform_dauth.user_role_assignments;

DO $$
DECLARE
  _len int;
BEGIN
  SELECT character_maximum_length INTO _len FROM information_schema.columns
   WHERE table_schema='dos' AND table_name='tenants' AND column_name='tenant_id';
  IF _len IS NOT NULL AND _len < 64 THEN
    EXECUTE 'ALTER TABLE dos.tenants ALTER COLUMN tenant_id TYPE varchar(64)';
  END IF;

  SELECT character_maximum_length INTO _len FROM information_schema.columns
   WHERE table_schema='dos' AND table_name='tenant_product_activation' AND column_name='tenant_id';
  IF _len IS NOT NULL AND _len < 64 THEN
    EXECUTE 'ALTER TABLE dos.tenant_product_activation ALTER COLUMN tenant_id TYPE varchar(64)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='dos' AND table_name='tenant_migrations') THEN
    SELECT character_maximum_length INTO _len FROM information_schema.columns
     WHERE table_schema='dos' AND table_name='tenant_migrations' AND column_name='tenant_id';
    IF _len IS NOT NULL AND _len < 64 THEN
      EXECUTE 'ALTER TABLE dos.tenant_migrations ALTER COLUMN tenant_id TYPE varchar(64)';
    END IF;
  END IF;

  SELECT character_maximum_length INTO _len FROM information_schema.columns
   WHERE table_schema='platform_dauth' AND table_name='user_role_assignments' AND column_name='tenant_id';
  IF _len IS NOT NULL AND _len < 64 THEN
    EXECUTE 'ALTER TABLE platform_dauth.user_role_assignments ALTER COLUMN tenant_id TYPE varchar(64)';
  END IF;
END $$;

-- Recreate identical RLS policies -------------------------------------------
CREATE POLICY tenant_isolation ON dos.tenants
  USING (dos.current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id::text = dos.current_tenant_id());
CREATE POLICY tenant_isolation ON dos.tenant_product_activation
  USING (dos.current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id::text = dos.current_tenant_id());
CREATE POLICY tenant_isolation ON dos.tenant_migrations
  USING (dos.current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id = dos.current_tenant_id());
CREATE POLICY tenant_isolation ON platform_dauth.user_role_assignments
  USING (app_current_tenant_id() IS NULL OR tenant_id::text = app_current_tenant_id());

-- Self-assertion ------------------------------------------------------------
DO $$
DECLARE
  bad int;
BEGIN
  SELECT count(*) INTO bad
    FROM information_schema.columns
   WHERE column_name='tenant_id'
     AND table_schema IN ('dos','platform_dauth')
     AND table_name IN ('tenants','tenant_product_activation','tenant_migrations','user_role_assignments')
     AND character_maximum_length IS NOT NULL
     AND character_maximum_length < 64;
  IF bad > 0 THEN
    RAISE EXCEPTION 'tenant_id widening incomplete: % columns still under 64', bad;
  END IF;
END $$;

COMMIT;
