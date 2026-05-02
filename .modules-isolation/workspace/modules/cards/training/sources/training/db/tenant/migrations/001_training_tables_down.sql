-- Rollback for 001_training_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_training_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.training_records CASCADE;
