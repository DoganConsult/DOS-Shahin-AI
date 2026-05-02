-- =====================================================================
-- Governance-OS cases + learning + module operating state (20260425_0011)
--
-- Backs the Phase-3 implementations:
--   modules/governance/source/backend/governance-os/services/cases/
--     governance-os-case-creators.service.ts   → dos.governance_os_cases
--   modules/governance/source/backend/governance-os/services/learning/
--     governance-os-learning-metrics.service.ts
--                                              → dos.governance_os_learning_metrics
--     (downstream learning-memory.service)     → dos.governance_os_learning_signals
--   modules/governance-os/source/services/module-operating-state.service.ts
--                                              → dos.module_operating_state
--   modules/governance-os/source/services/leadership-digest.service.ts
--                                              → dos.leadership_digests
--   modules/proactive-leadership/.../milestone-engine.service.ts
--                                              → dos.proactive_leadership_milestones
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.governance_os_cases (
  case_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  case_type          TEXT NOT NULL,
  entity_type        TEXT,
  entity_id          VARCHAR(128),
  context            JSONB NOT NULL DEFAULT '{}'::jsonb,
  observation_due_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_governance_os_cases_tenant_due
  ON dos.governance_os_cases(tenant_id, observation_due_at);
CREATE INDEX IF NOT EXISTS idx_dos_governance_os_cases_entity
  ON dos.governance_os_cases(tenant_id, entity_id)
  WHERE entity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.governance_os_learning_metrics (
  tenant_id          VARCHAR(64) NOT NULL,
  metric             TEXT NOT NULL,
  value              BIGINT NOT NULL DEFAULT 0,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, metric)
);

CREATE TABLE IF NOT EXISTS dos.governance_os_learning_signals (
  signal_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  module_code        TEXT,
  signal_name        TEXT NOT NULL,
  signal_value       DOUBLE PRECISION,
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_governance_os_learning_signals_lookup
  ON dos.governance_os_learning_signals(tenant_id, signal_name, recorded_at DESC);

CREATE TABLE IF NOT EXISTS dos.module_operating_state (
  tenant_id          VARCHAR(64) NOT NULL,
  module_code        TEXT NOT NULL,
  state              TEXT NOT NULL DEFAULT 'active',
  reason             TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, module_code)
);

CREATE TABLE IF NOT EXISTS dos.leadership_digests (
  digest_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_dos_leadership_digests_tenant_generated
  ON dos.leadership_digests(tenant_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS dos.proactive_leadership_milestones (
  milestone_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  code               TEXT NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  target_date        TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'pending',
  achieved_at        TIMESTAMPTZ,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dos_proactive_leadership_milestones_tenant_code
  ON dos.proactive_leadership_milestones(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_dos_proactive_leadership_milestones_target
  ON dos.proactive_leadership_milestones(tenant_id, target_date);

DO $grants$
DECLARE
  service_role TEXT;
  tbl TEXT;
  -- Real roles in shahin_grc — see 20260425_0010 header. IF EXISTS guard
  -- below means future role additions just work without a new migration.
  write_roles TEXT[] := ARRAY[
    'dos_user', 'dos_ai', 'dos_workflow', 'dos_audit', 'dos_tenant',
    'dos_notification', 'dos_auth', 'dos_migrator'
  ];
  tables TEXT[] := ARRAY[
    'governance_os_cases', 'governance_os_learning_metrics',
    'governance_os_learning_signals', 'module_operating_state',
    'leadership_digests', 'proactive_leadership_milestones'
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
