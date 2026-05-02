-- AI-OS Wave 3.5 — Per-tenant bias / fairness scoring report sink.
--
-- A07 (Risk Analysis) and A09 (Vendor Risk) emit bias-reports when
-- their output skews against protected categories or shows demographic
-- imbalance. Without this table the agents have nowhere to land scores.
--
-- One row per agent invocation that opted into bias scoring. Fields
-- match the ISO 42001 / NIST AI-RMF impact-assessment schema as much
-- as a per-tenant Postgres surface allows.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS ai_gov_bias_reports (
  report_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  agent_code       text NOT NULL,
  execution_id     uuid,
  -- Free-form key the agent uses to identify the affected entity
  -- (risk_id / vendor_id / control_id / etc.).
  subject_type     text NOT NULL,
  subject_id       text,
  -- Aggregate fairness score in [0,1]; ≥0.8 = pass, 0.5-0.8 = review,
  -- <0.5 = fail. Match the gate the dashboard renders.
  fairness_score   numeric(5,4) CHECK (fairness_score IS NULL OR (fairness_score >= 0 AND fairness_score <= 1)),
  -- Per-protected-category score, e.g. {"gender": 0.92, "region": 0.71}.
  category_scores  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Findings array, each {code, severity, description}.
  findings         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 'pass' | 'review' | 'fail' | 'inconclusive'.
  outcome          text NOT NULL DEFAULT 'inconclusive'
                     CHECK (outcome IN ('pass','review','fail','inconclusive')),
  reviewer_id      uuid,
  reviewed_at      timestamptz,
  reviewer_notes   text,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_gov_bias_reports_tenant_agent
  ON ai_gov_bias_reports (tenant_id, agent_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gov_bias_reports_outcome
  ON ai_gov_bias_reports (outcome, created_at DESC)
  WHERE outcome IN ('review','fail');
CREATE INDEX IF NOT EXISTS idx_ai_gov_bias_reports_execution
  ON ai_gov_bias_reports (execution_id) WHERE execution_id IS NOT NULL;

COMMIT;
