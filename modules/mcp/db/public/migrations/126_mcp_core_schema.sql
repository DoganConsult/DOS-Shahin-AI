-- ============================================================================
-- 126_mcp_core_schema.sql
-- W1.2 — Real MCP (Model Context Protocol) tenant schema.
--
-- Supersedes the generic mcp_items / mcp_logs stub at
-- services/ai-engine-service/src/domain/mcp/migrations/001_initial_tables.sql
-- which had zero code references. Those stubs are dropped in 127_*.
--
-- Tables are created with RLS enabled + forced + tenant_isolation policy at
-- creation time so there is no unprotected window between DDL and RLS.
-- W3 (mcp-gateway-service) binds to these tables through the
-- @modelcontextprotocol/sdk server handlers (tools/list, tools/call,
-- resources/list, resources/read, prompts/list, prompts/get).
--
-- Schema ownership: modules/mcp/module.manifest.json ownedTables updated to
-- enumerate all seven tables; modules/mcp/AS-BUILT.md updated accordingly.
-- ============================================================================

-- Per-tenant RLS helper presence check. 020_row_level_security.sql creates
-- current_tenant_id() once per tenant schema; if that migration did not run
-- yet (fresh tenant), define a local fallback shape that matches.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
DECLARE
  tid TEXT;
BEGIN
  tid := current_setting('app.current_tenant_id', true);
  IF tid IS NULL OR tid = '' THEN
    RETURN NULL;
  END IF;
  RETURN tid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── mcp_servers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_servers (
  server_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  server_name    TEXT NOT NULL,
  transport      TEXT NOT NULL DEFAULT 'stdio'
                   CHECK (transport IN ('stdio', 'http', 'sse', 'streamable-http')),
  endpoint       TEXT,
  auth_config    JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'registered'
                   CHECK (status IN ('registered', 'active', 'inactive', 'error')),
  capabilities   JSONB NOT NULL DEFAULT '{}',
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, server_name)
);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_tenant_id ON mcp_servers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers (status);

-- ── mcp_tools ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_tools (
  tool_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  server_id         UUID NOT NULL REFERENCES mcp_servers(server_id) ON DELETE CASCADE,
  tool_name         TEXT NOT NULL,
  description       TEXT,
  input_schema      JSONB NOT NULL DEFAULT '{}',
  output_schema     JSONB,
  permission_scope  TEXT,
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, server_id, tool_name)
);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_tenant_id ON mcp_tools (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_server_id ON mcp_tools (server_id);

-- ── mcp_resources ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_resources (
  resource_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  server_id     UUID NOT NULL REFERENCES mcp_servers(server_id) ON DELETE CASCADE,
  uri           TEXT NOT NULL,
  mime_type     TEXT,
  name          TEXT,
  description   TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, server_id, uri)
);
CREATE INDEX IF NOT EXISTS idx_mcp_resources_tenant_id ON mcp_resources (tenant_id);

-- ── mcp_prompts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_prompts (
  prompt_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  server_id     UUID NOT NULL REFERENCES mcp_servers(server_id) ON DELETE CASCADE,
  prompt_name   TEXT NOT NULL,
  description   TEXT,
  arguments     JSONB NOT NULL DEFAULT '[]',
  template      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, server_id, prompt_name)
);
CREATE INDEX IF NOT EXISTS idx_mcp_prompts_tenant_id ON mcp_prompts (tenant_id);

-- ── mcp_sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_sessions (
  session_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64) NOT NULL,
  server_id    UUID NOT NULL REFERENCES mcp_servers(server_id) ON DELETE CASCADE,
  user_id      VARCHAR(64),
  agent_code   VARCHAR(100),
  actor_type   VARCHAR(20) NOT NULL DEFAULT 'human'
                 CHECK (actor_type IN ('human', 'agent', 'service_account', 'external')),
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ,
  status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed', 'errored'))
);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_tenant_id ON mcp_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_open
  ON mcp_sessions (tenant_id, opened_at DESC) WHERE status = 'open';

-- ── mcp_tool_invocations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
  invocation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  session_id     UUID NOT NULL REFERENCES mcp_sessions(session_id) ON DELETE CASCADE,
  tool_id        UUID REFERENCES mcp_tools(tool_id) ON DELETE SET NULL,
  tool_name      TEXT NOT NULL,
  input          JSONB,
  output         JSONB,
  latency_ms     INTEGER,
  error          TEXT,
  actor_type     VARCHAR(20) NOT NULL DEFAULT 'human',
  actor_id       VARCHAR(64),
  invoked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_tenant ON mcp_tool_invocations (tenant_id, invoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_session ON mcp_tool_invocations (session_id);

-- ── mcp_audit_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_audit_log (
  log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64) NOT NULL,
  event_type   TEXT NOT NULL,
  actor_id     VARCHAR(64),
  actor_type   VARCHAR(20) NOT NULL DEFAULT 'human'
                 CHECK (actor_type IN ('human', 'agent', 'service_account', 'external')),
  payload      JSONB NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_tenant ON mcp_audit_log (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_event_type ON mcp_audit_log (event_type);

-- ── RLS enablement (policy baked in at schema-create time) ─────────────
DO $$
DECLARE
  tbl TEXT;
  mcp_tables TEXT[] := ARRAY[
    'mcp_servers',
    'mcp_tools',
    'mcp_resources',
    'mcp_prompts',
    'mcp_sessions',
    'mcp_tool_invocations',
    'mcp_audit_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY mcp_tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
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
       )',
      tbl
    );
  END LOOP;
END;
$$;
