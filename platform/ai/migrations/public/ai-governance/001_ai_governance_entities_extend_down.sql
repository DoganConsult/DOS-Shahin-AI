-- Down migration for 001_ai_governance_entities_extend.sql
-- We do NOT drop the columns (would lose data). We only drop the indexes.
BEGIN;
DROP INDEX IF EXISTS "__TENANT_SCHEMA__".idx_ai_governance_entities_tenant_type;
DROP INDEX IF EXISTS "__TENANT_SCHEMA__".idx_ai_governance_entities_updated;
COMMIT;
