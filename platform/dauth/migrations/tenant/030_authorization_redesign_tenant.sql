-- ============================================================================
-- 030_authorization_redesign_tenant.sql
-- Per-tenant canonical roles table for DAuth RBAC.
-- Referenced from services/auth-service/src/domain/access/rbac/seed-rbac-data.ts
-- and asserted by seed-rbac-data.test.ts's migration-dependency block.
--
-- Runs in per-tenant schema; run-tenant-migrations.sh:155 sets search_path.
-- Idempotent: CREATE TABLE IF NOT EXISTS so a schema that already has
-- this table (from an older bootstrap) is left untouched.
-- ============================================================================

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(50) NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON __TENANT_SCHEMA__.roles(role_code);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON __TENANT_SCHEMA__.roles(is_system) WHERE is_system = TRUE;
