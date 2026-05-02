-- Rollback for 001_dora_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_dora_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.dora_records CASCADE;
