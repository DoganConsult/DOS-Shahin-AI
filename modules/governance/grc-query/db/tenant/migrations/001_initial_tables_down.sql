-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_grc_query_logs_entity;
DROP INDEX IF EXISTS idx_grc_query_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.grc_query_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.grc_query_items CASCADE;
