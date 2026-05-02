-- Rollback for 001_ai_engine_initial_schema.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_ai_memory_thread;
DROP INDEX IF EXISTS idx_ai_agent_exec_status;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.ai_memory_store CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.ai_agent_executions CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.ai_providers CASCADE;
