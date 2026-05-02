-- ============================================================================
-- 115_risk_scoring_tables_v3.sql
-- Ported from monolith: backend/src/migrations/tenant/576_risk_scoring_tables.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- Migration 368: Risk Scoring Tables
-- Creates risk_scoring_models and risk_score_history tables
-- Replaces CREATE TABLE IF NOT EXISTS anti-pattern in risk-scoring.service.ts

-- Risk scoring models (configurable scoring formulas, dimensions, thresholds)
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_scoring_models (
  model_id VARCHAR(100) PRIMARY KEY,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '[]',
  thresholds JSONB NOT NULL DEFAULT '{}',
  formula VARCHAR(20) NOT NULL DEFAULT 'weighted',
  zone_definitions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_scoring_models_created_at ON __TENANT_SCHEMA__.risk_scoring_models (created_at DESC);

-- Risk score history (tracks score changes over time for threshold crossing detection)
CREATE TABLE IF NOT EXISTS risk_score_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id VARCHAR(16) NOT NULL,
  model_id VARCHAR(100) NOT NULL,
  dimension_scores JSONB NOT NULL,
  composite_score DECIMAL(6,2) NOT NULL,
  zone VARCHAR(20) NOT NULL,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_score_history_risk_model ON risk_score_history (risk_id, model_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_score_history_scored_at ON risk_score_history (scored_at DESC);
