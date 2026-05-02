-- Migration: 003_agent_delegations_and_proposed_actions.sql
-- Description: Durable ledger for agent-to-agent delegation and copilot proposed actions.

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".agent_delegations (
  delegation_id UUID PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  source_agent_id VARCHAR(10) NOT NULL,
  target_agent_id VARCHAR(10) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  task_description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  expected_outcome TEXT,
  deadline TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2),
  governance_check JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'failed', 'timed_out', 'cancelled')),
  acceptance_reason TEXT,
  rejection_reason TEXT,
  execution_result JSONB,
  error_message TEXT,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_delegations_target_status
  ON "__TENANT_SCHEMA__".agent_delegations (target_agent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_source
  ON "__TENANT_SCHEMA__".agent_delegations (source_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_tenant_status
  ON "__TENANT_SCHEMA__".agent_delegations (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".copilot_proposed_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  action_payload JSONB DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  auto_execute_at TIMESTAMPTZ,
  auto_execute_enabled BOOLEAN DEFAULT TRUE,
  pre_validation JSONB,
  post_validation JSONB,
  executed_at TIMESTAMPTZ,
  executed_by VARCHAR(64),
  execution_method VARCHAR(20),
  delegation_action_id UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by VARCHAR(64),
  rejection_reason TEXT,
  failure_reason TEXT,
  escalated_at TIMESTAMPTZ,
  escalation_target VARCHAR(64),
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpa_pending
  ON "__TENANT_SCHEMA__".copilot_proposed_actions (user_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cpa_auto_exec
  ON "__TENANT_SCHEMA__".copilot_proposed_actions (auto_execute_at)
  WHERE status = 'pending' AND auto_execute_enabled = TRUE AND auto_execute_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpa_session
  ON "__TENANT_SCHEMA__".copilot_proposed_actions (session_id);
