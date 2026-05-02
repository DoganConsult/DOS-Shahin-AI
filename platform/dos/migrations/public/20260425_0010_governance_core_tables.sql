-- =====================================================================
-- Governance core tables (20260425_0010)
--
-- Backs the Phase-3 real implementations of:
--   modules/governance-os/source/services/initiative-registry.service.ts
--     → reads/writes dos.governance_initiatives
--   modules/governance-os/source/services/governance-context-engine.service.ts
--     → reads/writes dos.governance_context with ON CONFLICT upsert
--   modules/governance-os/source/services/governance-os-config.service.ts
--     → reads/writes dos.governance_os_config (tenant, key) PK
--
-- Each service currently swallows "relation does not exist" via safeQuery
-- try/catch — so reads return [] and writes are silent no-ops. After
-- this migration lands, the real rows are persisted.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.governance_initiatives (
  initiative_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  code              VARCHAR(128) NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  modules_covered   TEXT[] NOT NULL DEFAULT '{}',
  owner_id          VARCHAR(64),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dos_governance_initiatives_tenant_code
  ON dos.governance_initiatives(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_dos_governance_initiatives_tenant_active
  ON dos.governance_initiatives(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.governance_context (
  context_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  module_code       TEXT,
  entity_type       TEXT,
  entity_id         VARCHAR(128),
  dimension         TEXT NOT NULL DEFAULT 'mission',
  data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dos_governance_context_upsert_key
  ON dos.governance_context(
    tenant_id,
    COALESCE(module_code, ''),
    COALESCE(entity_id, ''),
    dimension
  );
CREATE INDEX IF NOT EXISTS idx_dos_governance_context_lookup
  ON dos.governance_context(tenant_id, module_code, entity_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS dos.governance_os_config (
  tenant_id         VARCHAR(64) NOT NULL,
  key               TEXT NOT NULL,
  value             JSONB,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, key)
);

-- Grant INSERT/UPDATE/DELETE on these dos.* tables to service roles that
-- write to governance tables. 20260425_0009 already granted SELECT on all
-- dos.* tables; this layers write privileges on the new tables only.
DO $grants$
DECLARE
  service_role TEXT;
  tbl TEXT;
  -- Real roles in shahin_grc (verified via pg_roles): all governance,
  -- compliance, risk, AI, etc. services connect as dos_user; dos_ai is the
  -- ai-gateway-service role. Other roles are listed for forward-compat in
  -- case services are split out — guarded by IF EXISTS so absent roles
  -- skip silently.
  write_roles TEXT[] := ARRAY[
    'dos_user', 'dos_ai', 'dos_workflow', 'dos_audit', 'dos_tenant',
    'dos_notification', 'dos_auth', 'dos_migrator'
  ];
  tables TEXT[] := ARRAY[
    'governance_initiatives', 'governance_context', 'governance_os_config'
  ];
BEGIN
  FOREACH service_role IN ARRAY write_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.%I TO %I',
          tbl, service_role
        );
      END LOOP;
    END IF;
  END LOOP;
END $grants$;

COMMIT;
