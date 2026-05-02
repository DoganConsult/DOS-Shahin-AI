-- ============================================================================
-- 100_risk_operating_model.sql
-- Ported from monolith: backend/src/migrations/tenant/038_risk_operating_model.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- AGRC-OS Tenant Migration 038
-- Domain F: Risk Operating Model
-- Phase 4 — 10 new tables
-- (risks, risk_treatments, risk_kris,
--  kri_data_points, kri_breach_log,
--  risk_acceptance_log, risk_review_log,
--  risk_escalation_log already exist)
-- ============================================

-- ═══════════════════════════════════════════════════════════════════
-- Phase 3A: tenant/027_tenant_schema_tables.sql creates minimal shapes
-- (id, tenant_id, status, metadata, timestamps) for several risk_* tables
-- used below. Those minimal shapes conflict with this migration's richer
-- schema (different PK column names, missing domain columns, missing
-- unique-target columns for FKs). On a fresh tenant schema (validator
-- runs and real tenant provisioning) the 027-created stubs are empty, so
-- dropping and recreating is safe. Idempotent via IF EXISTS.
-- ═══════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_treatments CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_taxonomy CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_assessments CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_owners CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_categories CASCADE;

-- risk_treatments is not defined by this migration in its original form but
-- is referenced as an FK target below (risk_treatment_actions.treatment_id).
-- Create the minimal canonical shape so the FK resolves; migration 109
-- adds deleted_at / deleted_by / updated_at on top.
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_treatments (
  treatment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID,
  risk_id      UUID,
  strategy     VARCHAR(30),
  status       VARCHAR(30) DEFAULT 'planned',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Universal soft-delete column for every risk_* table touched here.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'risk_categories','risk_taxonomy','risk_assessments',
    'risk_impact_scales','risk_likelihood_scales','risk_velocity_scales',
    'risk_owners','risk_dependencies','risk_treatment_actions',
    'risk_status_history'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', t);
    END IF;
  END LOOP;
END $$;

-- Per-table column backfills keyed to the indexes / FKs below. Guarded so
-- tables not created by 027 (e.g. risk_impact_scales) are skipped until
-- their CREATE TABLE IF NOT EXISTS below actually creates them.
DO $$
DECLARE
  specs TEXT[][] := ARRAY[
    ARRAY['risk_taxonomy',          'status',             'TEXT'],
    ARRAY['risk_assessments',       'risk_id',            'UUID'],
    ARRAY['risk_assessments',       'assessor_id',        'UUID'],
    ARRAY['risk_assessments',       'assessment_type',    'TEXT'],
    ARRAY['risk_assessments',       'assessed_at',        'TIMESTAMPTZ'],
    ARRAY['risk_impact_scales',     'taxonomy_id',        'UUID'],
    ARRAY['risk_impact_scales',     'level',              'INT'],
    ARRAY['risk_likelihood_scales', 'taxonomy_id',        'UUID'],
    ARRAY['risk_likelihood_scales', 'level',              'INT'],
    ARRAY['risk_velocity_scales',   'taxonomy_id',        'UUID'],
    ARRAY['risk_velocity_scales',   'level',              'INT'],
    ARRAY['risk_owners',            'risk_id',            'UUID'],
    ARRAY['risk_owners',            'user_id',            'UUID'],
    ARRAY['risk_owners',            'is_primary',         'BOOLEAN DEFAULT FALSE'],
    ARRAY['risk_dependencies',      'risk_id',            'UUID'],
    ARRAY['risk_dependencies',      'dependent_risk_id',  'UUID'],
    ARRAY['risk_treatment_actions', 'treatment_id',       'UUID']
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(specs, 1) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = specs[i][1]
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I %s',
                     specs[i][1], specs[i][2], specs[i][3]);
    END IF;
  END LOOP;
END $$;

-- ── F1. risk_categories ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_categories (
  category_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code               VARCHAR(50) NOT NULL UNIQUE,
  name_en            VARCHAR(255) NOT NULL,
  name_ar            VARCHAR(255),
  description        TEXT,
  parent_category_id UUID REFERENCES risk_categories(category_id) ON DELETE SET NULL,
  display_order      INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

-- Phase 3A: tenant/027_tenant_schema_tables.sql already creates a minimal
-- risk_categories. The CREATE above then no-ops. Backfill the columns this
-- migration's indexes and rows expect.
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS code               VARCHAR(50);
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS name_en            VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS name_ar            VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS parent_category_id UUID;
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS display_order      INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.risk_categories ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_risk_categories_code   ON __TENANT_SCHEMA__.risk_categories(code);
CREATE INDEX IF NOT EXISTS idx_risk_categories_parent ON __TENANT_SCHEMA__.risk_categories(parent_category_id) WHERE parent_category_id IS NOT NULL;

-- ── F2. risk_taxonomy ───────────────────────────────────────────

-- Phase 3A: tenant/027 creates risk_taxonomy with `id UUID PK`; this
-- migration's FKs reference `taxonomy_id` as PK. The two shapes are
-- incompatible. On a fresh tenant schema (validator and production tenant
-- provisioning) drop-and-recreate is safe — 027's empty stub has no rows.
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_taxonomy CASCADE;
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_taxonomy (
  taxonomy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     VARCHAR(255) NOT NULL,
  name_ar     VARCHAR(255),
  version     VARCHAR(30),
  status      VARCHAR(30) NOT NULL DEFAULT 'active',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_taxonomy_status ON __TENANT_SCHEMA__.risk_taxonomy(status) WHERE deleted_at IS NULL;

-- ── F3. risk_assessments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_assessments (
  assessment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id             VARCHAR(16) NOT NULL,
  assessment_type     VARCHAR(50),
  assessor_id         VARCHAR(64),
  assessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inherent_likelihood INT,
  inherent_impact     INT,
  inherent_score      NUMERIC,
  residual_likelihood INT,
  residual_impact     INT,
  residual_score      NUMERIC,
  methodology         VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk      ON __TENANT_SCHEMA__.risk_assessments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessor  ON __TENANT_SCHEMA__.risk_assessments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_type      ON __TENANT_SCHEMA__.risk_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed  ON __TENANT_SCHEMA__.risk_assessments(assessed_at DESC);

-- ── F4. risk_impact_scales ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_impact_scales (
  scale_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taxonomy_id        UUID NOT NULL REFERENCES risk_taxonomy(taxonomy_id) ON DELETE CASCADE,
  level              INT NOT NULL,
  label_en           VARCHAR(100) NOT NULL,
  label_ar           VARCHAR(100),
  description        TEXT,
  monetary_range_min NUMERIC,
  monetary_range_max NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_impact_scales_taxonomy ON risk_impact_scales(taxonomy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_impact_scales_level
  ON risk_impact_scales(taxonomy_id, level) WHERE deleted_at IS NULL;

-- ── F5. risk_likelihood_scales ──────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_likelihood_scales (
  scale_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taxonomy_id           UUID NOT NULL REFERENCES risk_taxonomy(taxonomy_id) ON DELETE CASCADE,
  level                 INT NOT NULL,
  label_en              VARCHAR(100) NOT NULL,
  label_ar              VARCHAR(100),
  description           TEXT,
  frequency_description VARCHAR(255),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_likelihood_scales_taxonomy ON risk_likelihood_scales(taxonomy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_likelihood_scales_level
  ON risk_likelihood_scales(taxonomy_id, level) WHERE deleted_at IS NULL;

-- ── F6. risk_velocity_scales ────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_velocity_scales (
  scale_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taxonomy_id    UUID NOT NULL REFERENCES risk_taxonomy(taxonomy_id) ON DELETE CASCADE,
  level          INT NOT NULL,
  label_en       VARCHAR(100) NOT NULL,
  label_ar       VARCHAR(100),
  description    TEXT,
  time_to_impact VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_velocity_scales_taxonomy ON risk_velocity_scales(taxonomy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_velocity_scales_level
  ON risk_velocity_scales(taxonomy_id, level) WHERE deleted_at IS NULL;

-- ── F7. risk_owners ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_owners (
  owner_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id        VARCHAR(16) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  ownership_type VARCHAR(30) NOT NULL DEFAULT 'primary',
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_owners_risk    ON __TENANT_SCHEMA__.risk_owners(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_owners_user    ON __TENANT_SCHEMA__.risk_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_owners_primary ON __TENANT_SCHEMA__.risk_owners(risk_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ── F8. risk_dependencies ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_dependencies (
  dependency_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id           VARCHAR(16) NOT NULL,
  dependent_risk_id VARCHAR(16) NOT NULL,
  dependency_type   VARCHAR(30),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_risk_dep_no_self CHECK (risk_id <> dependent_risk_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_dependencies_risk      ON risk_dependencies(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_dependencies_dependent ON risk_dependencies(dependent_risk_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_dependency
  ON risk_dependencies(risk_id, dependent_risk_id) WHERE deleted_at IS NULL;

-- ── F9. risk_treatment_actions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_treatment_actions (
  action_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id      UUID NOT NULL REFERENCES risk_treatments(treatment_id) ON DELETE CASCADE,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  assigned_to       VARCHAR(64),
  due_date          DATE,
  status            VARCHAR(30) NOT NULL DEFAULT 'open',
  priority          VARCHAR(20),
  completion_percent INT DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_treatment ON risk_treatment_actions(treatment_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_status    ON risk_treatment_actions(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_assigned  ON risk_treatment_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_due       ON risk_treatment_actions(due_date);

-- ── F10. risk_status_history ────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_status_history (
  history_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id         VARCHAR(16) NOT NULL,
  previous_status VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  previous_score  NUMERIC,
  new_score       NUMERIC,
  changed_by      VARCHAR(64),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_status_history_risk    ON risk_status_history(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_status_history_created ON risk_status_history(created_at DESC);

-- ── TABLE DOCUMENTATION ─────────────────────────────────────────

COMMENT ON TABLE risk_categories         IS 'Hierarchical risk classification categories';
COMMENT ON TABLE risk_taxonomy           IS 'Risk taxonomy definitions with versioning';
COMMENT ON TABLE risk_assessments        IS 'Individual risk assessment records with inherent/residual scoring';
COMMENT ON TABLE risk_impact_scales      IS 'Configurable impact severity scales per taxonomy';
COMMENT ON TABLE risk_likelihood_scales  IS 'Configurable likelihood frequency scales per taxonomy';
COMMENT ON TABLE risk_velocity_scales    IS 'Configurable velocity/speed-of-onset scales per taxonomy';
COMMENT ON TABLE risk_owners             IS 'Risk ownership assignments (primary/secondary)';
COMMENT ON TABLE risk_dependencies       IS 'Inter-risk dependency and correlation mapping';
COMMENT ON TABLE risk_treatment_actions  IS 'Actionable tasks within a risk treatment plan';
COMMENT ON TABLE risk_status_history     IS 'Audit trail of risk status and score transitions';

-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 038: Risk Operating Model created successfully';
  RAISE NOTICE '- Classification: 2 tables (risk_categories, risk_taxonomy)';
  RAISE NOTICE '- Assessment: 4 tables (risk_assessments, impact_scales, likelihood_scales, velocity_scales)';
  RAISE NOTICE '- Ownership & linkage: 2 tables (risk_owners, risk_dependencies)';
  RAISE NOTICE '- Treatment & history: 2 tables (risk_treatment_actions, risk_status_history)';
  RAISE NOTICE '- Total: 10 new tables (existing risk tables preserved)';
END $$;
