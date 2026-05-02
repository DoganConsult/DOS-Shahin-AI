-- =====================================================================
-- Tenant schema grants for service DB roles (20260425_0009)
--
-- Every per-service Postgres role (dos_workflow, dos_audit, dos_user,
-- dos_tenant, dos_notification, dos_onboarding, dos_auth,
-- dos_dashboard_widgets, dos_ai_gateway, dos_analytics, dos_migrator,
-- dos_evidence_audit_reporting, dos_governance_policy,
-- dos_compliance_controls, dos_risk_incident, dos_vendor, dos_asset,
-- dos_bcp, dos_training, dos_privacy, dos_dora, dos_remediation,
-- dos_qiyas, dos_executive_intelligence, dos_integrations,
-- dos_inbox, dos_portals, dos_records, dos_platform_admin,
-- dos_platform_core, dos_platform_product, dos_agrc_os,
-- dos_mcp_gateway, dos_ai_governance) needs USAGE on every tenant_*
-- schema and SELECT/INSERT/UPDATE/DELETE on all tables + sequences in
-- those schemas. Without this, services fail with 42501
-- "permission denied for schema tenant_<hex>" even though their
-- DATABASE_URL points at the right DB.
--
-- Observed regression:
--   GET /api/approval-requests/dashboard
--     → 500 detail: "permission denied for schema
--        tenant_ab8e7cb6e9054a63bac0e4a5e6c453ee"
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

SET search_path = public;

DO $grants$
DECLARE
  r RECORD;
  service_role TEXT;
  service_roles TEXT[] := ARRAY[
    'dos_workflow', 'dos_audit', 'dos_user', 'dos_tenant',
    'dos_notification', 'dos_onboarding', 'dos_auth',
    'dos_dashboard_widgets', 'dos_ai_gateway', 'dos_analytics',
    'dos_evidence_audit_reporting', 'dos_governance_policy',
    'dos_compliance_controls', 'dos_risk_incident', 'dos_vendor',
    'dos_asset', 'dos_bcp', 'dos_training', 'dos_privacy',
    'dos_dora', 'dos_remediation', 'dos_qiyas',
    'dos_executive_intelligence', 'dos_integrations',
    'dos_inbox', 'dos_portals', 'dos_records',
    'dos_platform_admin', 'dos_platform_core', 'dos_platform_product',
    'dos_agrc_os', 'dos_mcp_gateway', 'dos_ai_governance'
  ];
BEGIN
  FOR r IN SELECT DISTINCT schema_name
             FROM public.tenants
            WHERE schema_name IS NOT NULL
              AND schema_name LIKE 'tenant\_%' ESCAPE '\'
  LOOP
    FOREACH service_role IN ARRAY service_roles LOOP
      -- Skip roles that don't exist in this database to keep the
      -- migration idempotent across smaller deployments.
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', r.schema_name, service_role);
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I',
          r.schema_name, service_role
        );
        EXECUTE format(
          'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO %I',
          r.schema_name, service_role
        );
        -- Cover future tables/sequences without needing another migration.
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
          r.schema_name, service_role
        );
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
          r.schema_name, service_role
        );
      END IF;
    END LOOP;
  END LOOP;
END $grants$;

-- Also grant USAGE on the dos + platform_dauth schemas to every service role
-- so they can read permissions / functional_roles views and write audit
-- entries without schema-level 42501s.
DO $shared_grants$
DECLARE
  service_role TEXT;
  service_roles TEXT[] := ARRAY[
    'dos_workflow', 'dos_audit', 'dos_user', 'dos_tenant',
    'dos_notification', 'dos_onboarding', 'dos_auth',
    'dos_dashboard_widgets', 'dos_ai_gateway', 'dos_analytics',
    'dos_evidence_audit_reporting', 'dos_governance_policy',
    'dos_compliance_controls', 'dos_risk_incident', 'dos_vendor',
    'dos_asset', 'dos_bcp', 'dos_training', 'dos_privacy',
    'dos_dora', 'dos_remediation', 'dos_qiyas',
    'dos_executive_intelligence', 'dos_integrations',
    'dos_inbox', 'dos_portals', 'dos_records',
    'dos_platform_admin', 'dos_platform_core', 'dos_platform_product',
    'dos_agrc_os', 'dos_mcp_gateway', 'dos_ai_governance'
  ];
BEGIN
  FOREACH service_role IN ARRAY service_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA dos TO %I', service_role);
      EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA dos TO %I', service_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA dos GRANT SELECT ON TABLES TO %I', service_role);
    END IF;
  END LOOP;
END $shared_grants$;

COMMIT;
