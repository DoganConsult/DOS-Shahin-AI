-- Rollback for 001_remediation_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_remediation_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.remediation_records CASCADE;
