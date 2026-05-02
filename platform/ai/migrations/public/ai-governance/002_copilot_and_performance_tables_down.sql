-- Rollback for 002_copilot_and_performance_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_agent_perf_tenant;
DROP INDEX IF EXISTS idx_agent_perf_agent;
DROP INDEX IF EXISTS idx_copilot_messages_session;
DROP INDEX IF EXISTS idx_copilot_sessions_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS agent_performance_log CASCADE;
DROP TABLE IF EXISTS copilot_messages CASCADE;
DROP TABLE IF EXISTS copilot_sessions CASCADE;
