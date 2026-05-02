-- Rollback for 001_bcp_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_bcp_plans_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.bcp_tests CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.bcp_scenarios CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.bcp_plans CASCADE;
