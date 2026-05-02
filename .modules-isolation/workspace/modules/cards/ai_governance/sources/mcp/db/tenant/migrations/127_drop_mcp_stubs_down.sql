-- ============================================================================
-- 127_drop_mcp_stubs_down.sql
-- Rollback: recreate the generic mcp_items / mcp_logs stubs (empty).
-- Used only for recovery; the stubs have no production consumers.
-- Schema copied verbatim from
-- services/ai-engine-service/src/domain/mcp/migrations/001_initial_tables.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS mcp_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   VARCHAR(64) NOT NULL,
  title       TEXT,
  description TEXT,
  status      VARCHAR(50) DEFAULT 'active',
  owner_id    VARCHAR(100),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.mcp_logs (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   VARCHAR(64) NOT NULL,
  entity_id   UUID,
  action      VARCHAR(100),
  actor_id    VARCHAR(100),
  payload     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
