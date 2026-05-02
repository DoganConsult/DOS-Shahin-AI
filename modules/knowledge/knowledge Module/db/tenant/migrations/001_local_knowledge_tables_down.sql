-- Rollback for 001_local_knowledge_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_local_knowledge_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.local_knowledge_records CASCADE;
