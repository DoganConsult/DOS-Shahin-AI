-- agrc-os-service: Agent orchestration tables
BEGIN;

-- ── Orchestrator Cycles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.agrc_cycles (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'hybrid',
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  agents JSONB NOT NULL DEFAULT '[]',
  context JSONB NOT NULL DEFAULT '{}',
  results JSONB,
  wave_count INT NOT NULL DEFAULT 0,
  discovery_count INT NOT NULL DEFAULT 0,
  action_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrc_cycles_tenant ON dos.agrc_cycles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agrc_cycles_status ON dos.agrc_cycles (tenant_id, status);

-- ── Agent Runs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.agrc_agent_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  cycle_id UUID REFERENCES dos.agrc_cycles(cycle_id),
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  mode VARCHAR(20) NOT NULL DEFAULT 'hybrid',
  task TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  discovery_count INT NOT NULL DEFAULT 0,
  action_count INT NOT NULL DEFAULT 0,
  token_usage INT NOT NULL DEFAULT 0,
  duration_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agrc_agent_runs_tenant ON dos.agrc_agent_runs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agrc_agent_runs_agent ON dos.agrc_agent_runs (tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agrc_agent_runs_cycle ON dos.agrc_agent_runs (cycle_id);

-- ── Agent Discoveries ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.agrc_discoveries (
  discovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  cycle_id UUID REFERENCES dos.agrc_cycles(cycle_id),
  agent_id VARCHAR(10) NOT NULL,
  run_id UUID REFERENCES dos.agrc_agent_runs(run_id),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrc_discoveries_tenant ON dos.agrc_discoveries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agrc_discoveries_cycle ON dos.agrc_discoveries (cycle_id);
CREATE INDEX IF NOT EXISTS idx_agrc_discoveries_agent ON dos.agrc_discoveries (tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agrc_discoveries_severity ON dos.agrc_discoveries (tenant_id, severity);

-- ── Proposed Actions (approval workflow) ────────────────────────────
CREATE TABLE IF NOT EXISTS dos.agrc_proposed_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  cycle_id UUID REFERENCES dos.agrc_cycles(cycle_id),
  agent_id VARCHAR(10) NOT NULL,
  run_id UUID REFERENCES dos.agrc_agent_runs(run_id),
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_entity_type VARCHAR(50),
  target_entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  review_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(64),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrc_proposed_actions_tenant ON dos.agrc_proposed_actions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agrc_proposed_actions_status ON dos.agrc_proposed_actions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agrc_proposed_actions_cycle ON dos.agrc_proposed_actions (cycle_id);

-- ── Agent Memory (per-agent persistent context) ─────────────────────
CREATE TABLE IF NOT EXISTS dos.agrc_agent_memory (
  memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'working',
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  cycle_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrc_agent_memory_agent ON dos.agrc_agent_memory (tenant_id, agent_id);

-- ── Agent Handoffs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.agrc_handoffs (
  handoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  from_agent VARCHAR(10) NOT NULL,
  to_agent VARCHAR(10) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrc_handoffs_tenant ON dos.agrc_handoffs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agrc_handoffs_to ON dos.agrc_handoffs (tenant_id, to_agent, status);

-- ── Add missing columns to agrc_tasks ───────────────────────────────
DO $$
BEGIN
  -- The original migration had task_type/assigned_to/due_date/source_module/source_entity_id
  -- but the service code uses type/module/agent_id/assignee_id/input_data/output_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'type') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN type VARCHAR(50);
    UPDATE dos.agrc_tasks SET type = task_type WHERE type IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'module') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN module VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'agent_id') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN agent_id VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'assignee_id') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN assignee_id VARCHAR(64);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'input_data') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN input_data JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'output_data') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN output_data JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'started_at') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dos' AND table_name = 'agrc_tasks' AND column_name = 'completed_at') THEN
    ALTER TABLE dos.agrc_tasks ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

COMMIT;
