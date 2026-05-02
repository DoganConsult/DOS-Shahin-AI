-- ============================================================================
-- 415_agent_tool_permissions.sql
--
-- Creates the agent_tool_permissions table declared as owned by the AI module
-- in services/ai-engine-service/src/runtime/ai/ai.module.ts:30 and actively
-- queried by the permission engine in
-- services/ai-engine-service/src/runtime/ai/services/governance/agent-governance.service.ts
-- (checkToolPermission wildcard + specific lookups) and by
-- services/ai-engine-service/src/runtime/ai/repositories/auto-extracted.repo.ts.
--
-- Without this table every permission check silently fell through — see
-- agent-governance.service.ts:220 wildcard lookup. Columns here MUST match the
-- column names those queries already use (agent_id, tool_name, action, level,
-- conditions, active, expires_at, permission_id UUID PK).
--
-- RLS: scoped via tenant_id following the tenant_isolation pattern in
-- ops/migrations/tenant/020_row_level_security.sql (uses current_tenant_id()).
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_tool_permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  action TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('allow', 'deny', 'approval_required')),
  conditions JSONB,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_permissions_lookup
  ON agent_tool_permissions (agent_id, tool_name, action, active)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_tool_permissions_tenant
  ON agent_tool_permissions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_agent_tool_permissions_expiry
  ON agent_tool_permissions (expires_at)
  WHERE expires_at IS NOT NULL AND active = TRUE;

-- RLS — mirrors ops/migrations/tenant/020_row_level_security.sql pattern.
ALTER TABLE agent_tool_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON agent_tool_permissions;
CREATE POLICY tenant_isolation ON agent_tool_permissions
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id IS NULL
    OR tenant_id::text = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NULL
    OR tenant_id IS NULL
    OR tenant_id::text = current_tenant_id()
  );
