-- ============================================================================
-- 121_risk_spec_field_alignment.sql
-- Ported from monolith: backend/src/migrations/tenant/837_risk_spec_field_alignment.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ══════════════════════════════════════════════════════════════════════════
-- Migration 715: Risk Module Spec Field-Level Alignment
--
-- Adds missing spec columns to the risks table and risk_kris table.
-- These are the exact fields from spec section 15 & 16 that were
-- identified as missing in the field-level audit.
-- ══════════════════════════════════════════════════════════════════════════

-- ─── 1. risks table — spec section 15 fields ────────────────────────

-- risk_code: human-readable code separate from risk_id (e.g., RSK-2024-001)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS risk_code VARCHAR(50);

-- statement: formal risk statement (separate from description which is free-text)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS statement TEXT;

-- cause/event/impact narrative fields (spec section 8.D, tab: Causes/Events/Impacts)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS cause_text TEXT;

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS event_text TEXT;

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS impact_text TEXT;

-- business_unit_id: links risk to org structure (spec field)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS business_unit_id UUID;

-- trend_direction: overall risk trend (improving/stable/worsening)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS trend_direction VARCHAR(20) DEFAULT 'stable'
    CHECK (trend_direction IN ('improving', 'stable', 'worsening'));

-- appetite_status: whether risk is within or outside appetite (within/outside/at_limit)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS appetite_status VARCHAR(20) DEFAULT 'within'
    CHECK (appetite_status IN ('within', 'outside', 'at_limit'));

-- inherent/residual on the risks table itself (denormalized for fast queries)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS inherent_likelihood INTEGER CHECK (inherent_likelihood BETWEEN 1 AND 5);

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS inherent_impact INTEGER CHECK (inherent_impact BETWEEN 1 AND 5);

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS inherent_score NUMERIC(6,2);

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5);

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_impact INTEGER CHECK (residual_impact BETWEEN 1 AND 5);

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_score NUMERIC(6,2);

-- treatment_status should be explicit (not just treatment_plan text)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS treatment_status VARCHAR(30) DEFAULT 'untreated'
    CHECK (treatment_status IN ('untreated', 'in_progress', 'mitigated', 'accepted', 'transferred', 'avoided'));

-- ─── 2. risk_kris table — spec section 16 fields ────────────────────

-- source_type: where indicator data comes from (manual/scripted/calculated/api)
ALTER TABLE risk_kris
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'scripted', 'calculated', 'api', 'integrated'));

-- calculation_method: how the indicator is computed (if scripted/calculated)
ALTER TABLE risk_kris
  ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(100);

-- ─── 3. risk_scenarios — missing spec fields ────────────────────────

-- treatment_options: possible response strategies for the scenario
ALTER TABLE risk_scenarios
  ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';

-- operational_disruption: estimated operational impact
ALTER TABLE risk_scenarios
  ADD COLUMN IF NOT EXISTS operational_disruption TEXT;

-- severity_classification: severe but plausible / moderate / low
ALTER TABLE risk_scenarios
  ADD COLUMN IF NOT EXISTS severity_classification VARCHAR(30) DEFAULT 'moderate'
    CHECK (severity_classification IN ('low', 'moderate', 'severe', 'catastrophic'));

-- ─── 4. Indexes for new columns ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_risks_risk_code
  ON risks (risk_code)
  WHERE risk_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risks_trend_direction
  ON risks (trend_direction)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risks_appetite_status
  ON risks (appetite_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risks_business_unit
  ON risks (business_unit_id)
  WHERE business_unit_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risks_inherent_score
  ON risks (inherent_score)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risks_residual_score
  ON risks (residual_score)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risk_kris_source_type
  ON risk_kris (source_type);

-- ─── 5. Backfill risk_code from risk_id where null ───────────────────

-- Phase 3A: risk_id is UUID; SUBSTRING(uuid FROM ...) has no overload. Cast
-- to text before extracting the first 8 chars.
UPDATE risks
SET risk_code = 'RSK-' || LPAD(SUBSTRING(risk_id::text FROM 1 FOR 8), 8, '0')
WHERE risk_code IS NULL AND deleted_at IS NULL;

-- ─── 6. Backfill inherent/residual from latest assessment ────────────

UPDATE risks r
SET
  inherent_likelihood = COALESCE(a.inherent_likelihood, r.likelihood),
  inherent_impact = COALESCE(a.inherent_impact, r.impact),
  inherent_score = COALESCE(a.inherent_score, r.likelihood * r.impact),
  residual_likelihood = a.residual_likelihood,
  residual_impact = a.residual_impact,
  residual_score = a.residual_score
FROM (
  SELECT DISTINCT ON (risk_id) *
  FROM risk_assessments
  WHERE deleted_at IS NULL
  ORDER BY risk_id, assessed_at DESC
) a
WHERE a.risk_id = r.risk_id AND r.deleted_at IS NULL AND r.inherent_score IS NULL;

-- ─── 7. Backfill appetite_status from appetite config ────────────────

-- Phase 3A: risk_appetite_config is not a table in this migration chain
-- (it would be seeded separately). Skip the backfill when the table is
-- absent; the column default ('within') already ships a reasonable value.
DO $$
BEGIN
  IF to_regclass('risk_appetite_config') IS NULL THEN
    RAISE NOTICE 'skip 121/7: risk_appetite_config not present; appetite_status left at default (within)';
    RETURN;
  END IF;
  UPDATE risks r
  SET appetite_status = CASE
    WHEN COALESCE(r.residual_score, r.risk_score, r.likelihood * r.impact, 0) > COALESCE(ac.threshold_critical, 20) THEN 'outside'
    WHEN COALESCE(r.residual_score, r.risk_score, r.likelihood * r.impact, 0) > COALESCE(ac.threshold_high, 15) THEN 'at_limit'
    ELSE 'within'
  END
  FROM risk_appetite_config ac
  WHERE ac.risk_category = r.category AND ac.is_active = true AND r.deleted_at IS NULL;
END $$;
