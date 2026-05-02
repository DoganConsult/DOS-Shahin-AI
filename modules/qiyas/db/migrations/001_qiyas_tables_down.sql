-- Rollback for 001_qiyas_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_qiyas_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.qiyas_records CASCADE;
