-- ============================================================================
-- 120_risk_spec_alignment.sql
-- Ported from monolith: backend/src/migrations/tenant/834_risk_spec_alignment.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ══════════════════════════════════════════════════════════════════════════
-- Migration 714: Risk Module Spec Alignment
--
-- Closes the gaps identified between the Risk Module spec and the codebase:
--   1. next_review_date on risks table
--   2. indicator_type on risk_kris (KRI/KCI/KPI distinction)
--   3. Risk campaigns (RCSA) tables
--   4. Dedicated link tables (risk ↔ policy, evidence, compliance, vendor, asset)
--   5. Risk treatment reviews table
--   6. Scenario reviews table
-- ══════════════════════════════════════════════════════════════════════════

-- ─── 1. Add next_review_date to risks ────────────────────────────────
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ;

-- ─── 2. Add indicator_type to risk_kris ──────────────────────────────
ALTER TABLE risk_kris
  ADD COLUMN IF NOT EXISTS indicator_type VARCHAR(10) DEFAULT 'kri'
    CHECK (indicator_type IN ('kri', 'kci', 'kpi'));

COMMENT ON COLUMN risk_kris.indicator_type IS
  'Indicator classification: kri=Key Risk Indicator, kci=Key Control Indicator, kpi=Key Performance Indicator';

-- ─── 3. RCSA Campaign tables ─────────────────────────────────────────

-- Campaign definition (who, when, scope)
CREATE TABLE IF NOT EXISTS risk_campaigns (
  campaign_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(500) NOT NULL,
  description   TEXT,
  campaign_type VARCHAR(50) DEFAULT 'rcsa' CHECK (campaign_type IN ('rcsa', 'targeted', 'adhoc')),
  status        VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  created_by    VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Individual assessment items within a campaign
CREATE TABLE IF NOT EXISTS risk_assessment_items (
  item_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES risk_campaigns(campaign_id),
  risk_id       VARCHAR(100),
  assigned_to   VARCHAR(255),
  status        VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'reviewed', 'approved')),
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Responses to assessment items
CREATE TABLE IF NOT EXISTS risk_assessment_responses (
  response_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id               UUID REFERENCES risk_assessment_items(item_id),
  respondent_id         VARCHAR(255),
  inherent_likelihood   INTEGER CHECK (inherent_likelihood BETWEEN 1 AND 5),
  inherent_impact       INTEGER CHECK (inherent_impact BETWEEN 1 AND 5),
  residual_likelihood   INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact       INTEGER CHECK (residual_impact BETWEEN 1 AND 5),
  control_effectiveness VARCHAR(30),
  notes                 TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Review records for assessment items
CREATE TABLE IF NOT EXISTS risk_assessment_reviews (
  review_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID REFERENCES risk_assessment_items(item_id),
  reviewer_id   VARCHAR(255),
  decision      VARCHAR(30) CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
  comments      TEXT,
  reviewed_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Dedicated link tables ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_policy_links (
  link_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       VARCHAR(100) NOT NULL,
  policy_id     UUID NOT NULL,
  link_type     VARCHAR(50) DEFAULT 'governs',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    VARCHAR(255),
  UNIQUE(risk_id, policy_id)
);

CREATE TABLE IF NOT EXISTS risk_evidence_links (
  link_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       VARCHAR(100) NOT NULL,
  evidence_id   UUID NOT NULL,
  link_type     VARCHAR(50) DEFAULT 'validates',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    VARCHAR(255),
  UNIQUE(risk_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS risk_compliance_links (
  link_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       VARCHAR(100) NOT NULL,
  obligation_id UUID NOT NULL,
  link_type     VARCHAR(50) DEFAULT 'addresses',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    VARCHAR(255),
  UNIQUE(risk_id, obligation_id)
);

CREATE TABLE IF NOT EXISTS risk_vendor_links (
  link_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       VARCHAR(100) NOT NULL,
  vendor_id     UUID NOT NULL,
  link_type     VARCHAR(50) DEFAULT 'exposes',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    VARCHAR(255),
  UNIQUE(risk_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS risk_asset_links (
  link_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       VARCHAR(100) NOT NULL,
  asset_id      UUID NOT NULL,
  link_type     VARCHAR(50) DEFAULT 'threatens',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    VARCHAR(255),
  UNIQUE(risk_id, asset_id)
);

-- ─── 5. Treatment reviews table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_treatment_reviews (
  review_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id  UUID NOT NULL,
  reviewer_id   VARCHAR(255),
  decision      VARCHAR(30) CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
  comments      TEXT,
  reviewed_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Scenario reviews table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_scenario_reviews (
  review_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   UUID NOT NULL,
  reviewer_id   VARCHAR(255),
  decision      VARCHAR(30) CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
  severity_assessment VARCHAR(30),
  comments      TEXT,
  reviewed_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. Indicator templates table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_indicator_templates (
  template_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(500) NOT NULL,
  description         TEXT,
  indicator_type      VARCHAR(10) DEFAULT 'kri' CHECK (indicator_type IN ('kri', 'kci', 'kpi')),
  default_threshold_red    NUMERIC(10,2),
  default_threshold_amber  NUMERIC(10,2),
  default_threshold_green  NUMERIC(10,2),
  calculation_method  VARCHAR(50),
  collection_frequency VARCHAR(20) DEFAULT 'monthly',
  category            VARCHAR(100),
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. Dashboard cache table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_dashboard_cache (
  cache_key     VARCHAR(200) PRIMARY KEY,
  cache_data    JSONB NOT NULL,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes'
);

-- ─── Indexes ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_risks_next_review
  ON risks (next_review_date)
  WHERE next_review_date IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risk_kris_indicator_type
  ON risk_kris (indicator_type);

CREATE INDEX IF NOT EXISTS idx_risk_campaigns_status
  ON risk_campaigns (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risk_assessment_items_campaign
  ON risk_assessment_items (campaign_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risk_policy_links_risk
  ON risk_policy_links (risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_evidence_links_risk
  ON risk_evidence_links (risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_compliance_links_risk
  ON risk_compliance_links (risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_vendor_links_risk
  ON risk_vendor_links (risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_asset_links_risk
  ON risk_asset_links (risk_id);
