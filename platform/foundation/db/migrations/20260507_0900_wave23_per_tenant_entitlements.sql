-- =====================================================================
-- Wave 23 — per-tenant tenant_module_entitlements + DNA seed
--
-- Root cause:
--   dauth.evaluateAccess() reads
--     SELECT module_code FROM "<tenant_schema>".tenant_module_entitlements
--      WHERE is_active = TRUE
--   from the per-tenant schema (NOT dos.*). Existing tenant schemas were
--   created without that table, so every dauth check whose moduleCode is
--   not in ALWAYS_ON_MODULES / GRC_CORE_MODULES denies with
--   DAUTH_DENY_PRODUCT_NOT_ENTITLED — observed for /api/audit-trail
--   (audit_trail) and /api/profiles/roles (role).
--
-- Doctrine fix (DB only):
--   1) DDL helper that creates the per-tenant tenant_module_entitlements
--      table inside a given tenant schema and seeds platform-DNA rows
--      (foundation, audit_trail, role, profile, navigation, workspace,
--      tenant, users, access). Idempotent — IF NOT EXISTS / ON CONFLICT.
--   2) Backfill: run helper for every existing tenant schema.
--   3) Trigger on dos.tenants AFTER INSERT to run helper on the
--      newly-created tenant schema (provisioning hook).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION dos.fn_ensure_tenant_module_entitlements(p_tenant_id text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_schema text := 'tenant_' || regexp_replace(p_tenant_id, '[^a-zA-Z0-9_]', '', 'g');
BEGIN
  -- Ensure the per-tenant schema exists. Self-registered tenants whose
  -- per-tenant provisioning has not run yet would otherwise leave dauth's
  -- product_enabled check reading from a non-existent schema.
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_migrator') THEN
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO dos_migrator', v_schema);
  END IF;

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS %I.tenant_module_entitlements (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      module_code         text NOT NULL UNIQUE,
      is_active           boolean DEFAULT true,
      entitlement_source  text DEFAULT 'platform_dna',
      activated_at        timestamptz DEFAULT NOW(),
      tenant_id           text,
      created_at          timestamptz DEFAULT NOW(),
      updated_at          timestamptz DEFAULT NOW()
    )
  $f$, v_schema);

  EXECUTE format($f$
    INSERT INTO %I.tenant_module_entitlements
      (module_code, is_active, entitlement_source, tenant_id)
    VALUES
      ('foundation',   true, 'platform_dna', %L),
      ('audit_trail',  true, 'platform_dna', %L),
      ('role',         true, 'platform_dna', %L),
      ('profile',      true, 'platform_dna', %L),
      ('navigation',   true, 'platform_dna', %L),
      ('workspace',    true, 'platform_dna', %L),
      ('tenant',       true, 'platform_dna', %L),
      ('users',        true, 'platform_dna', %L),
      ('access',       true, 'platform_dna', %L),
      ('access_review',true, 'platform_dna', %L)
    ON CONFLICT (module_code) DO UPDATE
      SET is_active = true, updated_at = NOW()
  $f$, v_schema,
       p_tenant_id, p_tenant_id, p_tenant_id, p_tenant_id, p_tenant_id,
       p_tenant_id, p_tenant_id, p_tenant_id, p_tenant_id, p_tenant_id);

  -- Grant runtime read.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO dos_auth', v_schema);
    EXECUTE format('GRANT SELECT ON %I.tenant_module_entitlements TO dos_auth', v_schema);
  END IF;
END;
$$;

-- Backfill existing tenants ----------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tenant_id FROM dos.tenants LOOP
    PERFORM dos.fn_ensure_tenant_module_entitlements(r.tenant_id::text);
  END LOOP;
END$$;

-- Provisioning trigger on dos.tenants -------------------------------------
CREATE OR REPLACE FUNCTION dos.fn_seed_tenant_module_entitlements_on_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM dos.fn_ensure_tenant_module_entitlements(NEW.tenant_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_module_entitlements_on_insert ON dos.tenants;
CREATE TRIGGER trg_seed_tenant_module_entitlements_on_insert
  AFTER INSERT ON dos.tenants
  FOR EACH ROW EXECUTE FUNCTION dos.fn_seed_tenant_module_entitlements_on_insert();

-- Self-test on the live probe tenant -------------------------------------
DO $$
DECLARE n INT;
BEGIN
  -- The probe tenant created in earlier waves; if its schema exists, the
  -- table must now hold audit_trail + role.
  IF EXISTS (SELECT 1 FROM information_schema.schemata
              WHERE schema_name='tenant_65f10f855eab8b30') THEN
    EXECUTE 'SELECT count(*) FROM tenant_65f10f855eab8b30.tenant_module_entitlements
              WHERE module_code IN (''audit_trail'',''role'') AND is_active'
      INTO n;
    IF n < 2 THEN
      RAISE EXCEPTION 'wave23: probe tenant schema missing audit_trail/role rows (got %)', n;
    END IF;
    RAISE NOTICE 'wave23 proof: probe tenant schema holds % platform-DNA entitlement rows', n;
  ELSE
    RAISE NOTICE 'wave23 proof: probe tenant schema absent — backfill skipped';
  END IF;
END$$;

COMMIT;
