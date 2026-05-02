-- ============================================================================
-- 130_agent_sod_policies.sql
-- W2 — Agent-aware Segregation-of-Duties policy surface.
--
-- Complements existing tables:
--   - sod_rules           (role-pair conflicts; human actors)
--   - module_sod_rules    (action-pair conflicts; tenant-configurable)
--
-- agent_sod_policies governs proposer/approver combinations when one or
-- both actors are non-human (agent / service_account / external). The
-- existing sod-engine.ts delegates into agent-sod-engine.ts when actor
-- types are non-human. Cleaner separation than overloading sod_rules.
--
-- Seeded rules (enterprise-default):
--   (proposer=agent,  approver=agent)           → block
--   (proposer=agent,  approver=service_account) → escalate
--   (proposer=agent,  approver=human)           → allow
--   (proposer=service_account, approver=same)   → block   (no self-serve)
--
-- Tenant admins can override via the same table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_credentials (
  credential_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  actor_id          VARCHAR(128) NOT NULL,
  credential_hash   TEXT NOT NULL,
  scopes            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  last_used_at      TIMESTAMPTZ,
  created_by        VARCHAR(128),
  CONSTRAINT agent_credentials_active_scopes CHECK (array_length(scopes, 1) IS NULL OR array_length(scopes, 1) <= 64)
);
CREATE INDEX IF NOT EXISTS idx_agent_credentials_tenant_actor
  ON agent_credentials (tenant_id, actor_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_credentials_expiry
  ON agent_credentials (expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;

ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON agent_credentials;
CREATE POLICY tenant_isolation ON agent_credentials
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

-- ── agent_sod_policies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_sod_policies (
  policy_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  proposer_type   VARCHAR(20) NOT NULL
                    CHECK (proposer_type IN ('human','agent','service_account','external')),
  approver_type   VARCHAR(20) NOT NULL
                    CHECK (approver_type IN ('human','agent','service_account','external')),
  action_key      TEXT,                             -- NULL = match any action
  outcome         VARCHAR(10) NOT NULL
                    CHECK (outcome IN ('allow','warn','escalate','block')),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      VARCHAR(128),
  UNIQUE (tenant_id, proposer_type, approver_type, action_key)
);
CREATE INDEX IF NOT EXISTS idx_agent_sod_policies_lookup
  ON agent_sod_policies (tenant_id, proposer_type, approver_type);

ALTER TABLE agent_sod_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sod_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON agent_sod_policies;
CREATE POLICY tenant_isolation ON agent_sod_policies
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

-- ── Seed default rules (idempotent ON CONFLICT DO NOTHING) ─────────────
DO $$
DECLARE
  resolved_tenant_id TEXT;
BEGIN
  SELECT tenant_id INTO resolved_tenant_id
  FROM dos.tenants
  WHERE schema_name = current_schema()
  LIMIT 1;

  IF resolved_tenant_id IS NULL THEN
    RAISE NOTICE 'agent_sod_policies seed skip: no dos.tenants row for %', current_schema();
    RETURN;
  END IF;

  INSERT INTO agent_sod_policies
    (tenant_id, proposer_type, approver_type, action_key, outcome, reason, created_by)
  VALUES
    (resolved_tenant_id, 'agent', 'agent', NULL, 'block',
      'Agent cannot approve another agent-proposed action by default', 'system-seed'),
    (resolved_tenant_id, 'agent', 'service_account', NULL, 'escalate',
      'Agent → service_account approvals require human escalation', 'system-seed'),
    (resolved_tenant_id, 'agent', 'human', NULL, 'allow',
      'Human approvers may always review agent proposals', 'system-seed'),
    (resolved_tenant_id, 'service_account', 'service_account', NULL, 'block',
      'Service accounts cannot self-approve', 'system-seed'),
    (resolved_tenant_id, 'service_account', 'human', NULL, 'allow',
      'Human approvers may always review service_account proposals', 'system-seed'),
    (resolved_tenant_id, 'external', 'external', NULL, 'block',
      'External principals cannot approve each other', 'system-seed')
  ON CONFLICT (tenant_id, proposer_type, approver_type, action_key) DO NOTHING;
END;
$$;
