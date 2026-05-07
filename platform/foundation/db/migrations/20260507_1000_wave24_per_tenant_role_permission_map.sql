-- =====================================================================
-- Wave 24 — per-tenant role_permission_map projection
--
-- Root cause:
--   dauth.evaluateAccess step 8 (role_grants_permission) reads:
--     SELECT role_code, permission_code
--       FROM "<tenant_schema>".role_permission_map
--      WHERE tenant_id = $1
--   The canonical permission catalog lives in
--     platform_dauth.functional_roles.permissions (text[])
--   but each per-tenant schema must materialize the (role, permission)
--   pairs locally for dauth's tenant-scoped read. Self-registered tenant
--   schemas were created empty, so every dauth check denies with
--   DAUTH_DENY_PERMISSION_MISSING.
--
-- Doctrine fix (DB only):
--   1) Helper fn_ensure_tenant_role_permission_map(tenant_id) that
--      creates the per-tenant role_permission_map table if missing and
--      seeds it from the canonical platform_dauth.functional_roles.
--   2) Backfill: run helper for every existing tenant.
--   3) Trigger on dos.tenants AFTER INSERT chains schema provisioning.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION dos.fn_ensure_tenant_role_permission_map(p_tenant_id text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_schema text := 'tenant_' || regexp_replace(p_tenant_id, '[^a-zA-Z0-9_]', '', 'g');
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema);

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS %I.role_permission_map (
      tenant_id        text NOT NULL,
      role_code        text NOT NULL,
      permission_code  text NOT NULL,
      source           text NOT NULL DEFAULT 'platform_dna',
      created_at       timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, role_code, permission_code)
    )
  $f$, v_schema);

  EXECUTE format($f$
    INSERT INTO %I.role_permission_map (tenant_id, role_code, permission_code, source)
    SELECT %L, fr.role_code, p.permission_code, 'platform_dna'
      FROM platform_dauth.functional_roles fr
      CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS p(permission_code)
     WHERE fr.role_code IN (
       SELECT DISTINCT role_code
         FROM platform_dauth.user_role_assignments
        WHERE tenant_id = %L AND is_active = true
          AND (revoked_at IS NULL)
          AND (expires_at IS NULL OR expires_at > NOW())
     )
    ON CONFLICT DO NOTHING
  $f$, v_schema, p_tenant_id, p_tenant_id);

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO dos_auth', v_schema);
    EXECUTE format('GRANT SELECT ON %I.role_permission_map TO dos_auth', v_schema);
  END IF;
END;
$$;

-- Backfill all tenants ----------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tenant_id FROM dos.tenants LOOP
    PERFORM dos.fn_ensure_tenant_role_permission_map(r.tenant_id::text);
  END LOOP;
END$$;

-- Trigger on user_role_assignments inserts: re-project for that tenant ---
CREATE OR REPLACE FUNCTION dos.fn_reproject_role_permission_map_on_ura()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM dos.fn_ensure_tenant_role_permission_map(NEW.tenant_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reproject_role_permission_map ON platform_dauth.user_role_assignments;
CREATE TRIGGER trg_reproject_role_permission_map
  AFTER INSERT OR UPDATE ON platform_dauth.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION dos.fn_reproject_role_permission_map_on_ura();

-- Self-test on probe tenant -----------------------------------------------
DO $$
DECLARE n INT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata
              WHERE schema_name='tenant_65f10f855eab8b30') THEN
    EXECUTE 'SELECT count(*) FROM tenant_65f10f855eab8b30.role_permission_map
              WHERE role_code=''tenant_admin''
                AND permission_code IN (''audit_trail.read'',''role.read'',''foundation.users.read'')'
      INTO n;
    RAISE NOTICE 'wave24 proof: probe tenant projected % canonical perm rows', n;
  END IF;
END$$;

COMMIT;
