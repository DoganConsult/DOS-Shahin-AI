-- Rollback for 001_analytics_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_analytics_snapshots_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.analytics_reports CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.analytics_snapshots CASCADE;
