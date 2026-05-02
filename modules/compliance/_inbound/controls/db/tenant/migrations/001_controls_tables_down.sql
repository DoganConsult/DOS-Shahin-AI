-- Rollback for 001_controls_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_control_tests_control;
DROP INDEX IF EXISTS idx_controls_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.control_tests CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.controls CASCADE;
