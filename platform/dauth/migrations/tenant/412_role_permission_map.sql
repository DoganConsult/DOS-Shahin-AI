-- ============================================================================
-- 412_role_permission_map.sql
-- Per-tenant role-to-permission runtime mapping consumed by
-- services/auth-service/src/domain/access/decision-engine.ts
-- (queries `"${schema}".role_permission_map` on every access decision).
--
-- Columns and UNIQUE asserted by seed-rbac-data.test.ts migration-
-- dependency block. Seeded by
-- services/auth-service/src/domain/registry/module-security-seeder.service.ts
-- which iterates archetype → permission mappings per tenant.
--
-- Runs in per-tenant schema. Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.role_permission_map (
  map_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  role_code         VARCHAR(50) NOT NULL,
  permission_code   TEXT NOT NULL,
  module_code       TEXT NOT NULL,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by        UUID,
  UNIQUE(tenant_id, role_code, permission_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_rpm_role ON __TENANT_SCHEMA__.role_permission_map(tenant_id, role_code);
CREATE INDEX IF NOT EXISTS idx_rpm_permission ON __TENANT_SCHEMA__.role_permission_map(tenant_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_rpm_module ON __TENANT_SCHEMA__.role_permission_map(tenant_id, module_code);
