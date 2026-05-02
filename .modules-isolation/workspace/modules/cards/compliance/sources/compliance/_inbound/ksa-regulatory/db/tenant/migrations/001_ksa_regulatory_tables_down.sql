-- Rollback for 001_ksa_regulatory_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_ksa_regulatory_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.ksa_regulatory_records CASCADE;
