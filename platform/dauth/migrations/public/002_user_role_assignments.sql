-- user-service 002: create dos.user_role_assignments
-- This table is referenced by src/domain/role-assignment.service.ts but was never migrated.
-- tenant_id NOT NULL for isolation.
--
-- Phase 3A: reconcile with earlier creators
--   - ops/migrations/006_missing_admin_tables.sql (UUID PK, FKs, no tenant_id)
--   - services/auth-service/migrations/001 (SERIAL PK, tenant_id nullable)
-- The CREATE TABLE IF NOT EXISTS below no-ops against either earlier shape,
-- so we idempotently add every column we need before the indexes.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.user_role_assignments (
  assignment_id VARCHAR(64)  PRIMARY KEY,
  tenant_id     VARCHAR(64)  NOT NULL,
  user_id       VARCHAR(64)  NOT NULL,
  role_code     VARCHAR(100) NOT NULL,
  scope         VARCHAR(255),
  granted_by    VARCHAR(64),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  revoked_by    VARCHAR(64),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Idempotent backfill of columns that legacy shapes omit.
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS assignment_id VARCHAR(64);
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS tenant_id     VARCHAR(64);
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS role_code     VARCHAR(100);
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS scope         VARCHAR(255);
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS granted_by    VARCHAR(64);
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ;
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS revoked_at    TIMESTAMPTZ;
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS revoked_by    VARCHAR(64);
ALTER TABLE dos.user_role_assignments ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_role_assignments_active
  ON dos.user_role_assignments (tenant_id, user_id, role_code)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS ix_user_role_assignments_tenant_user
  ON dos.user_role_assignments (tenant_id, user_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS ix_user_role_assignments_tenant_role
  ON dos.user_role_assignments (tenant_id, role_code)
  WHERE is_active = TRUE;

COMMIT;
