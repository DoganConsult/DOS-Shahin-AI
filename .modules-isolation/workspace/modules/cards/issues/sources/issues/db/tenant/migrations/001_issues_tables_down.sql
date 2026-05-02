-- Rollback for 001_issues_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_issues_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.issues_records CASCADE;
