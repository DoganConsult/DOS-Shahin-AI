-- Rollback for 001_governance_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_governance_health_tenant;
DROP INDEX IF EXISTS idx_board_decisions_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.governance_health_scores CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.governance_meetings CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.board_decisions CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.governance_boards CASCADE;
