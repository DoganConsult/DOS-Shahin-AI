-- ============================================================================
-- 109_risk_production_readiness.sql
-- Ported from monolith: backend/src/migrations/tenant/203_risk_production_readiness.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- AGRC-OS Tenant Migration 203
-- Risk Module Production Readiness
-- - Soft-delete columns on core risk tables
-- - Full-text search on risks
-- - Fix UUID/VARCHAR mismatch in risk_scenarios
-- - Add updated_at where missing
-- ============================================

-- ── 1. risks: soft-delete + updated_at + full-text search ─────────

ALTER TABLE risks ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS deleted_by  VARCHAR(64);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_risks_active ON risks(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search (generated tsvector from title + description + category)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'risks' AND column_name = 'search_text'
    AND table_schema = current_schema()
  ) THEN
    ALTER TABLE risks ADD COLUMN search_text TSVECTOR
      GENERATED ALWAYS AS (
        to_tsvector('english',
          coalesce(title,'') || ' ' ||
          coalesce(description,'') || ' ' ||
          coalesce(category,'')
        )
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_risks_search ON risks USING GIN(search_text);

-- ── 2. risk_treatments: soft-delete + updated_at ──────────────────

ALTER TABLE risk_treatments ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE risk_treatments ADD COLUMN IF NOT EXISTS deleted_by  VARCHAR(64);
ALTER TABLE risk_treatments ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_risk_treatments_active ON risk_treatments(deleted_at) WHERE deleted_at IS NULL;

-- ── 3. risk_kris: soft-delete + updated_at ────────────────────────

ALTER TABLE risk_kris ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE risk_kris ADD COLUMN IF NOT EXISTS deleted_by  VARCHAR(64);
ALTER TABLE risk_kris ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_risk_kris_active ON risk_kris(deleted_at) WHERE deleted_at IS NULL;

-- ── 4. kri_data_points: soft-delete ───────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kri_data_points' AND table_schema = current_schema()) THEN
    ALTER TABLE kri_data_points ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE kri_data_points ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64);
  END IF;
END $$;

-- ── 5. risk_scoring_models: soft-delete + updated_at ──────────────
-- Phase 3A: risk_scoring_models is created by tenant/113-119. Skip on a
-- fresh tenant schema that has not reached those migrations yet; when
-- they do run, their own ADD COLUMN IF NOT EXISTS will pick up the
-- soft-delete columns idempotently (the same pattern as the guarded
-- ALTERs below for kri_data_points / risk_peer_reviews).

DO $$
BEGIN
  IF to_regclass('risk_scoring_models') IS NULL THEN
    RAISE NOTICE 'skip 109/5: risk_scoring_models does not exist yet (created by 113/114/115/119)';
    RETURN;
  END IF;
  ALTER TABLE risk_scoring_models ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
  ALTER TABLE risk_scoring_models ADD COLUMN IF NOT EXISTS deleted_by  VARCHAR(64);
  ALTER TABLE risk_scoring_models ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();
  CREATE INDEX IF NOT EXISTS idx_risk_scoring_models_active ON risk_scoring_models(deleted_at) WHERE deleted_at IS NULL;
END $$;

-- ── 6. risk_scenarios: fix UUID → VARCHAR(16) to match risks.risk_id

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'risk_scenarios' AND column_name = 'risk_id'
    AND data_type = 'uuid' AND table_schema = current_schema()
  ) THEN
    ALTER TABLE risk_scenarios ALTER COLUMN risk_id TYPE VARCHAR(16) USING risk_id::text;
  END IF;
END $$;

ALTER TABLE risk_scenarios ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE risk_scenarios ADD COLUMN IF NOT EXISTS deleted_by  VARCHAR(64);
ALTER TABLE risk_scenarios ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_risk_scenarios_active ON risk_scenarios(deleted_at) WHERE deleted_at IS NULL;

-- ── 7. risk_peer_reviews (if exists): soft-delete ─────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_peer_reviews' AND table_schema = current_schema()) THEN
    ALTER TABLE risk_peer_reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE risk_peer_reviews ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64);
  END IF;
  -- Also check the alternate name
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_pair_reviews' AND table_schema = current_schema()) THEN
    ALTER TABLE risk_pair_reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE risk_pair_reviews ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64);
  END IF;
END $$;

-- ── Done ──────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'Migration 203: Risk production readiness — soft-delete, search, UUID fix applied';
END $$;
