-- =====================================================================
-- dos.users tenant-scope repair (20260425_0001)
--
-- The current dos.users schema (installed from
-- modules/platform-core/db/public/migrations/001_user_tables.sql) carries
-- only the cross-tenant directory columns: user_id, email, display_name,
-- status, created_at. The full user-service codebase however reads and
-- writes a tenant-scoped shape aligned with public.users:
--   tenant_id, role, department_id, deleted_at, updated_at,
--   onboarding_complete, member_onboarded, platform_role, last_login.
--
-- Production evidence (F1 contract matrix, 2026-04-25): every Foundation
-- 500 cascade (GET /api/teams, /api/roles, /api/organizations,
-- /api/business-units, /api/positions, /api/locations, /api/committees,
-- /api/foundation/{teams,roles,departments}) reports the same SQL error
-- class: `column u.tenant_id does not exist` — services/user-service
-- queries against dos.users cannot compile.
--
-- Fix: ALTER TABLE dos.users to the shape the service tree already
-- assumes, then backfill from public.users. Idempotent. Safe to re-run.
-- Public.users remains the authoritative source — the consumer in
-- services/user-service/src/events/consumer.ts keeps dos.users in sync
-- via user.created / user.updated events going forward; this migration
-- is the one-time backfill that unblocks every Foundation SELECT.
--
-- Rollback: see 20260425_0001_dos_users_tenant_scope_down.sql (reverses
-- the columns to the minimal pre-migration shape). Backfill rows remain.
-- =====================================================================

BEGIN;

SET search_path = public;

-- ---------------------------------------------------------------------
-- 1. Extend dos.users to match the tenant-scoped shape the user-service
--    codebase queries against. ALTER … ADD COLUMN IF NOT EXISTS is
--    idempotent (Postgres 9.6+).
-- ---------------------------------------------------------------------
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS tenant_id           VARCHAR(64);
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS role                VARCHAR(100);
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS department_id       VARCHAR(64);
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ;
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS member_onboarded    BOOLEAN DEFAULT FALSE;
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS platform_role       VARCHAR(100);
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS last_login          TIMESTAMPTZ;
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS full_name           VARCHAR(255);
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS first_name          VARCHAR(100);
ALTER TABLE dos.users ADD COLUMN IF NOT EXISTS last_name           VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_dos_users_tenant          ON dos.users(tenant_id)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dos_users_tenant_email   ON dos.users(tenant_id, email)  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 2. One-time backfill from public.users. Public remains the source of
--    truth for new writes (auth-service registration path); the
--    user-service event consumer keeps dos.users in sync on subsequent
--    user.created / user.updated events.
-- ---------------------------------------------------------------------
INSERT INTO dos.users (
    user_id, email, display_name, status, created_at,
    tenant_id, role, updated_at,
    onboarding_complete, member_onboarded, platform_role, last_login,
    full_name, first_name, last_name
)
SELECT
    u.user_id,
    u.email,
    COALESCE(u.display_name, u.name, u.full_name, u.email) AS display_name,
    COALESCE(u.status, 'active'),
    COALESCE(u.created_at, NOW()),
    u.tenant_id,
    u.role,
    COALESCE(u.updated_at, NOW()),
    COALESCE(u.onboarding_complete, FALSE),
    COALESCE(u.member_onboarded, FALSE),
    COALESCE(u.platform_role, 'member'),
    u.last_login,
    u.full_name,
    u.first_name,
    u.last_name
FROM public.users u
ON CONFLICT (user_id) DO UPDATE
   SET email                = EXCLUDED.email,
       display_name         = EXCLUDED.display_name,
       status               = EXCLUDED.status,
       tenant_id            = EXCLUDED.tenant_id,
       role                 = EXCLUDED.role,
       updated_at           = EXCLUDED.updated_at,
       onboarding_complete  = EXCLUDED.onboarding_complete,
       member_onboarded     = EXCLUDED.member_onboarded,
       platform_role        = EXCLUDED.platform_role,
       last_login           = EXCLUDED.last_login,
       full_name            = EXCLUDED.full_name,
       first_name           = EXCLUDED.first_name,
       last_name            = EXCLUDED.last_name;

COMMIT;
