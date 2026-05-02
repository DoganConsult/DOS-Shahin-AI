-- AI-OS — Per-tenant LLM cost ledger.
--
-- Two tables that the existing llm-usage-tracker.service.ts already
-- writes to but that have never been created. Result: every cost insert
-- failed silently inside safeQuery(), and /dashboard's totalCostUsd was
-- always 0 even though Anthropic/OpenRouter/Ollama were billing real
-- tokens.
--
-- llm_usage_log     — append-only per-call cost+tokens+latency ledger.
-- tenant_llm_budgets — running monthly counter + soft/hard caps.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS llm_usage_log (
  usage_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  user_id         uuid,
  agent_id        text,
  run_id          text,
  provider        text NOT NULL,
  model           text NOT NULL,
  input_tokens    integer NOT NULL DEFAULT 0,
  output_tokens   integer NOT NULL DEFAULT 0,
  total_tokens    integer NOT NULL DEFAULT 0,
  cost_usd        numeric(12, 6) NOT NULL DEFAULT 0,
  latency_ms      integer NOT NULL DEFAULT 0,
  cache_hit       boolean NOT NULL DEFAULT FALSE,
  endpoint_type   text NOT NULL DEFAULT 'chat',
  error           text,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_log_tenant_created
  ON llm_usage_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_log_agent
  ON llm_usage_log (agent_id, created_at DESC) WHERE agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tenant_llm_budgets (
  tenant_id              uuid PRIMARY KEY,
  monthly_token_limit    bigint NOT NULL DEFAULT 10000000,    -- 10M tokens / month
  monthly_cost_limit     numeric(12, 2) NOT NULL DEFAULT 100, -- $100 / month
  tokens_used_month      bigint NOT NULL DEFAULT 0,
  cost_used_month        numeric(12, 6) NOT NULL DEFAULT 0,
  soft_limit_pct         integer NOT NULL DEFAULT 80,         -- warn at 80%
  hard_limit_action      text NOT NULL DEFAULT 'throttle' CHECK (hard_limit_action IN ('block','throttle','allow')),
  notified_soft          boolean NOT NULL DEFAULT FALSE,
  notified_hard          boolean NOT NULL DEFAULT FALSE,
  budget_reset_at        timestamptz NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at             timestamptz NOT NULL DEFAULT NOW(),
  updated_at             timestamptz NOT NULL DEFAULT NOW()
);

COMMIT;
