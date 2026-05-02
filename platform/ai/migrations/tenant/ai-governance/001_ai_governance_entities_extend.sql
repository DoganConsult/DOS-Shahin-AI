BEGIN;

ALTER TABLE ai_governance_entities
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_governance_entities_tenant_type
    ON ai_governance_entities (tenant_id, entity_type)
    WHERE deleted_at IS NULL;
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_governance_entities_updated
    ON ai_governance_entities (updated_at DESC);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

COMMIT;
