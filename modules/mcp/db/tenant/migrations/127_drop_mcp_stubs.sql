-- ============================================================================
-- 127_drop_mcp_stubs.sql
-- W1.2 — Drop the generic mcp_items / mcp_logs stubs now that 126_mcp_core_schema
-- has replaced them with real MCP tenant tables.
--
-- Pre-flight: run-tenant-migrations.sh must first run snapshot-before-drop.sh
-- (triggered by DESTRUCTIVE_MIGRATION_PATTERN matching 127_drop_*).
--
-- Safe-to-drop rationale:
--   - Zero .ts references to mcp_items or mcp_logs across the codebase.
--   - No FK dependencies (the FKs in 126_* reference new mcp_servers, not
--     the stub tables).
--   - Enterprise-grade reversibility: the down migration recreates both
--     stubs with their original schema, even though empty.
-- ============================================================================

DROP TABLE IF EXISTS mcp_items CASCADE;
DROP TABLE IF EXISTS mcp_logs CASCADE;
