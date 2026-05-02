-- =====================================================================
-- AI workflow triggers + emission log (20260425_0012)
--
-- Backs modules/governance/source/backend/ai/services/workflow/
--   ai-workflow-trigger.service.ts — evaluateAndTrigger reads rules from
-- dos.ai_workflow_triggers and appends an emission to dos.ai_workflow_trigger_log
-- for every matching rule. Both tables are absent in shahin_grc today, so
-- evaluateAndTrigger swallows the 42P01 and the canonical bus never fires.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ai_workflow_triggers (
  trigger_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  module            TEXT NOT NULL,
  signal            TEXT,
  rule              JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_code     TEXT,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_ai_workflow_triggers_match
  ON dos.ai_workflow_triggers(tenant_id, module, enabled, signal);

CREATE TABLE IF NOT EXISTS dos.ai_workflow_trigger_log (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  trigger_id        UUID NOT NULL REFERENCES dos.ai_workflow_triggers(trigger_id) ON DELETE CASCADE,
  module            TEXT,
  signal            TEXT,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  emitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_ai_workflow_trigger_log_tenant
  ON dos.ai_workflow_trigger_log(tenant_id, trigger_id, emitted_at DESC);

DO $grants$
DECLARE
  service_role TEXT;
  tbl TEXT;
  -- Real roles in shahin_grc — see 20260425_0010 header.
  write_roles TEXT[] := ARRAY[
    'dos_user', 'dos_ai', 'dos_workflow', 'dos_audit', 'dos_tenant',
    'dos_notification', 'dos_auth', 'dos_migrator'
  ];
  tables TEXT[] := ARRAY[
    'ai_workflow_triggers', 'ai_workflow_trigger_log'
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
