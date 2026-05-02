-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_executive_logs_entity;
DROP INDEX IF EXISTS idx_executive_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.executive_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.executive_items CASCADE;
