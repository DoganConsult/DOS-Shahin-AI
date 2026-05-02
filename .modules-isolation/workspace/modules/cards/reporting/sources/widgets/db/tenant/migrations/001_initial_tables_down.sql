-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_widgets_logs_entity;
DROP INDEX IF EXISTS idx_widgets_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.widgets_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.widgets_items CASCADE;
