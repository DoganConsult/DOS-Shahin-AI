-- AI-OS Wave 2 — Per-tenant ai_kill_switches.
--
-- Two separate code paths INSERT/SELECT this table with slightly different
-- column shapes:
--   * domain/ai-governance/routes/...wave1.routes.ts — asset-centric
--     (asset_id, asset_name, asset_type, kill_switch_type, trigger_method,
--      fallback_procedure, status, last_tested_at, last_activated_at).
--     This is what the UI button reads/writes.
--   * runtime/ai/events/ai.subscribers.ts — agent-centric (agent_id,
--     reason, activated_at, active). Auto-tripped when an agent breaches
--     its cost ceiling.
--
-- We carry both shapes on a single table so both code paths work. The
-- UNIQUE (tenant_id, COALESCE(agent_id, kill_switch_id::text)) on the
-- agent shape is provided by an explicit unique index on agent_id only.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS ai_kill_switches (
  kill_switch_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,

  -- asset-centric shape (UI surface)
  asset_id            uuid,
  asset_name          text,
  asset_type          text,
  kill_switch_type    text,
  trigger_method      text,
  fallback_procedure  text,
  status              text NOT NULL DEFAULT 'inactive'
                        CHECK (status IN ('inactive','armed','activated')),
  last_tested_at      timestamptz,
  last_activated_at   timestamptz,
  activated_by        uuid,
  created_by          uuid,

  -- agent-centric shape (runtime auto-trip path)
  agent_id            text,
  reason              text,
  activated_at        timestamptz,
  active              boolean NOT NULL DEFAULT FALSE,

  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_kill_switches_tenant
  ON ai_kill_switches (tenant_id, status);

-- Unique per-(tenant, agent) when agent_id is set, so the runtime
-- ON CONFLICT (tenant_id, agent_id) UPSERT in ai.subscribers works.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_kill_switches_tenant_agent
  ON ai_kill_switches (tenant_id, agent_id)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_kill_switches_active
  ON ai_kill_switches (tenant_id, active)
  WHERE active = TRUE;

COMMIT;
