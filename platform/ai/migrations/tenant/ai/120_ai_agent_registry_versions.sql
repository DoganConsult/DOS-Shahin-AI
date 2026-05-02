CREATE TABLE IF NOT EXISTS ai_agent_registry (
  agent_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  agent_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_prompt_asset_id UUID,
  linked_model_asset_id UUID,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_status TEXT NOT NULL DEFAULT 'draft',
  deployment_status TEXT NOT NULL DEFAULT 'not_deployed',
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  rollback_from_version_id UUID,
  diff_summary TEXT,
  change_summary TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_agent_registry_asset_ver_unique UNIQUE (asset_id, version_number),
  CONSTRAINT ai_agent_registry_approval_status_chk CHECK (approval_status IN ('draft','submitted','under_review','approved','rejected','suspended','retired','archived')),
  CONSTRAINT ai_agent_registry_deployment_status_chk CHECK (deployment_status IN ('not_deployed','staging','canary','production','rollback','decommissioned'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_agent_registry_one_active_per_asset
  ON ai_agent_registry(asset_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_asset_id
  ON ai_agent_registry(asset_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_approval_status
  ON ai_agent_registry(approval_status);

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_deployment_status
  ON ai_agent_registry(deployment_status);

