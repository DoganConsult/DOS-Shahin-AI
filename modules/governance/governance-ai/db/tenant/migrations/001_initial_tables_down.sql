-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_governance_ai_logs_entity;
DROP INDEX IF EXISTS idx_governance_ai_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.governance_ai_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.governance_ai_items CASCADE;
