-- Migration 210 — CSA schema alignment (Sprint 1 / Track 3A)
--
-- The application/misc/csa.service.ts service expects:
--   * a csa_questionnaires table (not in any prior migration)
--   * extra csa_responses columns: questionnaire_id, workspace_id,
--     respondent_id, period, answers, raw_score, weighted_score, outcome,
--     status, is_active
--
-- Prior migration 003_advanced_controls_tables.sql created csa_responses
-- against a campaign-based schema (campaign_id, respondent, effectiveness_rating)
-- that the service does NOT use. Both schemas are needed: campaigns for the
-- attestation flow, questionnaires for the self-assessment flow. We extend
-- csa_responses with the missing service-required columns and create the
-- missing csa_questionnaires table.

-- ── csa_questionnaires (new) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.csa_questionnaires (
  questionnaire_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      TEXT,
  control_id        TEXT NOT NULL,
  control_title     TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  questions         JSONB NOT NULL DEFAULT '[]',
  scoring_method    TEXT NOT NULL DEFAULT 'weighted_average'
                    CHECK (scoring_method IN ('weighted_average','pass_fail','percentage','maturity')),
  frequency         TEXT NOT NULL DEFAULT 'annual',
  owner_id          TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csa_questionnaires_control
  ON __TENANT_SCHEMA__.csa_questionnaires(control_id);
CREATE INDEX IF NOT EXISTS idx_csa_questionnaires_workspace
  ON __TENANT_SCHEMA__.csa_questionnaires(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- ── csa_responses (extend) ──────────────────────────────────────────────────

ALTER TABLE __TENANT_SCHEMA__.csa_responses
  ADD COLUMN IF NOT EXISTS questionnaire_id UUID
    REFERENCES __TENANT_SCHEMA__.csa_questionnaires(questionnaire_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id     TEXT,
  ADD COLUMN IF NOT EXISTS respondent_id    TEXT,
  ADD COLUMN IF NOT EXISTS period           TEXT,
  ADD COLUMN IF NOT EXISTS answers          JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS raw_score        NUMERIC(7,2),
  ADD COLUMN IF NOT EXISTS weighted_score   NUMERIC(7,2),
  ADD COLUMN IF NOT EXISTS outcome          TEXT
    CHECK (outcome IN ('pass','fail','partial','not_assessed') OR outcome IS NULL),
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft','submitted','approved','rejected'));

CREATE INDEX IF NOT EXISTS idx_csa_responses_questionnaire
  ON __TENANT_SCHEMA__.csa_responses(questionnaire_id)
  WHERE questionnaire_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csa_responses_status
  ON __TENANT_SCHEMA__.csa_responses(status);

-- The legacy campaign_id stays as nullable for back-compat with the
-- attestation-campaign flow; new questionnaire-driven responses use
-- questionnaire_id instead.
ALTER TABLE __TENANT_SCHEMA__.csa_responses
  ALTER COLUMN campaign_id DROP NOT NULL,
  ALTER COLUMN respondent  DROP NOT NULL;
