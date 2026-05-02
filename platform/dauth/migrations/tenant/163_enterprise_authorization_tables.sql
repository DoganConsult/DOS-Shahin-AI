-- ============================================================================
-- 163_enterprise_authorization_tables.sql
-- Per-tenant canonical permissions table for DAuth.
-- Columns assert: code TEXT NOT NULL UNIQUE, module_code, resource_code, action_code.
-- seed-rbac-data.ts consumes this shape; seed-rbac-data.test.ts pins the
-- required columns.
--
-- Runs in per-tenant schema. Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.permissions (
  permission_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  module_code     TEXT NOT NULL,
  resource_code   TEXT,
  action_code     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON __TENANT_SCHEMA__.permissions(module_code);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON __TENANT_SCHEMA__.permissions(code);
