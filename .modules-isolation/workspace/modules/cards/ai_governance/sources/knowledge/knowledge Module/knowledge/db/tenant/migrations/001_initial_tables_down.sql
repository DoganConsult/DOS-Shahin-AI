-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_knowledge_logs_entity;
DROP INDEX IF EXISTS idx_knowledge_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.knowledge_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.knowledge_items CASCADE;
