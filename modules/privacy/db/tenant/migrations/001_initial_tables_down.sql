-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_privacy_logs_entity;
DROP INDEX IF EXISTS idx_privacy_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.privacy_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.privacy_items CASCADE;
