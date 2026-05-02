-- ============================================================
-- AI Engine Service — Copilot Sessions, Messages & Performance
-- Migration: 002_copilot_and_performance_tables
-- Owner: ai module (AI_MANIFEST.ownedTables)
-- ============================================================

CREATE TABLE IF NOT EXISTS copilot_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(10),
  page_context TEXT,
  message_count INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_tenant
  ON copilot_sessions (tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS copilot_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  agent_id VARCHAR(10),
  tool_calls JSONB DEFAULT '[]',
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_session
  ON copilot_messages (session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS agent_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  session_id VARCHAR(255),
  duration_ms INT NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  tool_calls INT DEFAULT 0,
  stop_reason VARCHAR(50),
  is_error BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_perf_agent
  ON agent_performance_log (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_perf_tenant
  ON agent_performance_log (tenant_id, created_at DESC);
