-- ============================================================================
-- mcp-gateway-service migrations/001_ownership_claim.sql
--
-- Phase 12D — Commercial Release Freeze Gate.
--
-- The canonical MCP schema (mcp_servers, mcp_tools, mcp_resources,
-- mcp_prompts, mcp_sessions, mcp_tool_invocations, mcp_audit_log) is
-- applied by the platform tenant-migration pipeline at
-- ops/migrations/tenant/126_mcp_core_schema.sql.
--
-- This file exists to satisfy the per-service structural contract
-- (tests/contract/inter-service-contracts.test.ts) and to record
-- ownership of those tables by mcp-gateway-service as declared in
-- services/mcp-gateway-service/service.manifest.json:ownedTables.
--
-- It is idempotent: it records an ownership claim row in the platform
-- schema-ownership log if the log exists, and is a no-op otherwise.
-- No destructive DDL is performed here.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'schema_ownership_log'
  ) THEN
    INSERT INTO dos.schema_ownership_log
      (service_code, object_schema, object_name, claim_note, claimed_at)
    VALUES
      ('mcp-gateway-service', 'tenant_*', 'mcp_servers',            'owned by mcp-gateway-service', NOW()),
      ('mcp-gateway-service', 'tenant_*', 'mcp_tools',              'owned by mcp-gateway-service', NOW()),
      ('mcp-gateway-service', 'tenant_*', 'mcp_resources',          'owned by mcp-gateway-service', NOW()),
      ('mcp-gateway-service', 'tenant_*', 'mcp_prompts',            'owned by mcp-gateway-service', NOW()),
      ('mcp-gateway-service', 'tenant_*', 'mcp_sessions',           'owned by mcp-gateway-service', NOW()),
      ('mcp-gateway-service', 'tenant_*', 'mcp_tool_invocations',   'owned by mcp-gateway-service', NOW()),
      ('mcp-gateway-service', 'tenant_*', 'mcp_audit_log',          'owned by mcp-gateway-service', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
