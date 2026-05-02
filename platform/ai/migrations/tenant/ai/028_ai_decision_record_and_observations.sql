-- Service: ai-engine-service
-- Migration: 028_ai_decision_record_and_observations.sql
-- Description: Tables backing AI-OS decisions + persistent observations.

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".decision_record (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  run_id TEXT,
  agent_id TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  confidence DOUBLE PRECISION,
  explanation TEXT,
  outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_record_tenant_created_at ON "__TENANT_SCHEMA__".decision_record (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_record_tenant_agent ON "__TENANT_SCHEMA__".decision_record (tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_decision_record_tenant_run ON "__TENANT_SCHEMA__".decision_record (tenant_id, run_id);
CREATE INDEX IF NOT EXISTS idx_decision_record_tenant_entity ON "__TENANT_SCHEMA__".decision_record (tenant_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".ai_observations (
  observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id TEXT,
  run_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('anomaly','drift','gap','pattern','correlation')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','low','medium','high','warning','critical')),
  confidence DOUBLE PRECISION,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved','dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_created_at ON "__TENANT_SCHEMA__".ai_observations (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_status ON "__TENANT_SCHEMA__".ai_observations (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_agent ON "__TENANT_SCHEMA__".ai_observations (tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_run ON "__TENANT_SCHEMA__".ai_observations (tenant_id, run_id);
CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_entity ON "__TENANT_SCHEMA__".ai_observations (tenant_id, entity_type, entity_id);
