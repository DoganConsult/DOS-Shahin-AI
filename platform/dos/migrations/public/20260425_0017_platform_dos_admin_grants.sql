-- =====================================================================
-- Platform-DOS catalog write grants for admin + auth service roles
-- (20260425_0017)
--
-- Scope: the admin lifecycle for tenant↔product associations and the
-- auth-service bootstrap (kc-bootstrap.service.ts) both need INSERT on
-- platform_dos.tenants_registry + tenant_products. Without these grants:
--   - admin POST /api/admin/dos/tenant-products/:t/:p/activate fails 500
--     "permission denied for table tenant_products" (UPDATE alone is not
--     enough — Postgres requires INSERT to evaluate ON CONFLICT)
--   - auth-service kc-bootstrap silently rolls back its DOS-hierarchy
--     SAVEPOINT and the new tenant never appears in tenants_registry
--
-- Granted ad-hoc on prod 2026-04-25 during P4 smoke-test; this migration
-- captures it so a fresh DB rebuild lands in the same state.
--
-- Idempotent: skips roles that don't exist; GRANTs are no-ops when the
-- privilege is already present. Safe to re-run.
-- =====================================================================

BEGIN;

DO $platform_dos_grants$
DECLARE
  service_role TEXT;
  -- dos_user        — platform-admin-service (full lifecycle on catalog write tables)
  -- dos_auth        — auth-service (bootstrap writes the hierarchy on register)
  -- dos_platform_admin / dos_platform_core / dos_platform_product
  --                 — defensive: future platform services that may share
  --                   the catalog write surface
  full_write_roles TEXT[] := ARRAY[
    'dos_user',
    'dos_auth',
    'dos_platform_admin',
    'dos_platform_core',
    'dos_platform_product'
  ];
  -- Catalog tables the admin lifecycle + bootstrap need to write to.
  -- product_modules / products_registry / modules_registry stay
  -- migrator-owned (dos_migrator) — the catalog-sync script runs as the
  -- migrator role and these tables are not mutated from request handlers.
  write_tables TEXT[] := ARRAY[
    'tenants_registry',
    'tenant_products',
    'tenant_product_modules',
    'tenant_services',
    'tenant_config',
    'tenant_secrets_ref'
  ];
  tname TEXT;
BEGIN
  FOREACH service_role IN ARRAY full_write_roles LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      CONTINUE;
    END IF;

    -- USAGE on the schema is a precondition for any table-level grant.
    EXECUTE format('GRANT USAGE ON SCHEMA platform_dos TO %I', service_role);

    -- Per-table SUID grants. Loop so we only touch tables that exist.
    FOREACH tname IN ARRAY write_tables LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'platform_dos' AND table_name = tname
      ) THEN
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON platform_dos.%I TO %I',
          tname, service_role
        );
      END IF;
    END LOOP;

    -- Sequences (ID generators). platform_dos uses text PKs everywhere
    -- today, but ALTER DEFAULT PRIVILEGES future-proofs sequence usage
    -- without another migration.
    EXECUTE format(
      'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA platform_dos TO %I',
      service_role
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform_dos GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
      service_role
    );

    -- Future tables added under platform_dos automatically inherit SUID
    -- for these roles, matching the per-tenant-schema pattern in 0009.
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform_dos GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
      service_role
    );
  END LOOP;
END $platform_dos_grants$;

-- Read-only access for every other service role so cross-service queries
-- (e.g. gateway loading the product catalog, tenant-service reading the
-- product hierarchy) don't 42501 on platform_dos.
DO $platform_dos_reads$
DECLARE
  service_role TEXT;
  reader_roles TEXT[] := ARRAY[
    'dos_workflow', 'dos_audit', 'dos_tenant', 'dos_notification',
    'dos_onboarding', 'dos_dashboard_widgets', 'dos_ai_gateway',
    'dos_analytics', 'dos_evidence_audit_reporting',
    'dos_governance_policy', 'dos_compliance_controls',
    'dos_risk_incident', 'dos_vendor', 'dos_asset', 'dos_bcp',
    'dos_training', 'dos_privacy', 'dos_dora', 'dos_remediation',
    'dos_qiyas', 'dos_executive_intelligence', 'dos_integrations',
    'dos_inbox', 'dos_portals', 'dos_records', 'dos_agrc_os',
    'dos_mcp_gateway', 'dos_ai_governance'
  ];
BEGIN
  FOREACH service_role IN ARRAY reader_roles LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      CONTINUE;
    END IF;
    EXECUTE format('GRANT USAGE ON SCHEMA platform_dos TO %I', service_role);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA platform_dos TO %I', service_role);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform_dos GRANT SELECT ON TABLES TO %I',
      service_role
    );
  END LOOP;
END $platform_dos_reads$;

COMMIT;
