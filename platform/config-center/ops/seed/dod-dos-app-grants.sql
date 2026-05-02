-- =============================================================================
-- DOS Platform — DoD Wave B DB role enablement
-- =============================================================================
-- Wave B (2026-04-30) found 5x verticals (risk, governance-policy, policy,
-- vendor, asset, bcp) returning 500 "password authentication failed" / 500
-- "permission denied for schema dos" because the dos_app role had:
--   (1) rolcanlogin = false  → connections rejected outright
--   (2) no schema USAGE / table privileges on dos / public / platform_dauth
--
-- Eight services configure DATABASE_URL with dos_app/dos_app_pass_2026 in
-- ops/env/{agrc-os, analytics-reporting, asset, bcp, dora, evidence-audit-
-- reporting, executive-intelligence, governance-policy, mcp-gateway,
-- notification-inbox, risk-incident, vendor, ...}.env. Without this seed,
-- every one of those services failed every authenticated downstream call.
--
-- Idempotent — safe to re-run.
-- =============================================================================

ALTER ROLE dos_app WITH LOGIN PASSWORD 'dos_app_pass_2026';

GRANT USAGE ON SCHEMA dos, public, platform_dauth TO dos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dos, public, platform_dauth TO dos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dos, public, platform_dauth TO dos_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA dos             GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO dos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public          GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO dos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_dauth  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO dos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA dos             GRANT USAGE, SELECT                  ON SEQUENCES TO dos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public          GRANT USAGE, SELECT                  ON SEQUENCES TO dos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_dauth  GRANT USAGE, SELECT                  ON SEQUENCES TO dos_app;

-- =============================================================================
-- Wave C (2026-04-30) — extend dos_app grants to per-tenant schemas
-- =============================================================================
-- Risk/Governance/Vendor/Asset/BCP/Privacy/DORA all execute queries against
-- "tenant_<id>".<table>. Without USAGE + DML on the tenant schema, every
-- list/detail call returns 500 "permission denied for schema tenant_*".
-- Loop grants existing tenant schemas now AND set ALTER DEFAULT PRIVILEGES
-- on each so future migrations against new tables auto-grant.
-- =============================================================================
DO $$
DECLARE s text;
BEGIN
  FOR s IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO dos_app', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO dos_app', s);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO dos_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dos_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO dos_app', s);
  END LOOP;
END $$;
