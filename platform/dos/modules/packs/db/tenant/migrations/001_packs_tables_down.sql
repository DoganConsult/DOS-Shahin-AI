-- Rollback for 001_packs_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_packs_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.packs_records CASCADE;
