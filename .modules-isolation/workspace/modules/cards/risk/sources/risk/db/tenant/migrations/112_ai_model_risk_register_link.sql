-- ============================================================================
-- 112_ai_model_risk_register_link.sql
-- Ported from monolith: backend/src/migrations/tenant/374_ai_model_risk_register_link.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- Feature 15: AI Model Risk → Enterprise Risk Register linking
--
-- Phase 3A: `entity_links` is not a table in any tenant migration; it's a
-- JSONB column added to `risks` below. The index on entity_links(table) is
-- a monolith-porting artefact — guard it so it no-ops when the legacy
-- entity_links TABLE shape isn't present.

DO $$
BEGIN
  IF to_regclass('entity_links') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_entity_links_ai_model
      ON entity_links(source_type, source_id) WHERE source_type = 'ai_model';
  ELSE
    RAISE NOTICE 'skip 112: legacy entity_links TABLE not present; using risks.entity_links JSONB column only';
  END IF;
END $$;

ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_category VARCHAR(60);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS entity_links JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(risk_category) WHERE risk_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_entity_links_model ON risks((entity_links->>'modelId')) WHERE risk_category = 'ai_model';
