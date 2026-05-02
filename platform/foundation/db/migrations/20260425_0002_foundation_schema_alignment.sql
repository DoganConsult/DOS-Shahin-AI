-- =====================================================================
-- Foundation schema alignment (20260425_0002)
--
-- Second pass over the F1 Foundation audit after 20260425_0001 unblocked
-- dos.users. Residual 500-cascade errors, grouped by table:
--
--   • dos.teams               — missing `deleted_at`, `updated_at`,
--                                `description` referenced by
--                                services/user-service/src/domain/team.service.ts
--   • dos.departments         — missing `deleted_at`, `updated_at`
--                                referenced by team/department queries
--   • dos.delegations (view)  — column names `from_user_id`/`to_user_id`
--                                drift from what the service expects
--                                (`delegator_id`/`delegate_id`) and the
--                                view also omits `deleted_at`. The
--                                service does soft-delete filtering via
--                                `d.deleted_at IS NULL`; the underlying
--                                table has no deleted_at column, so the
--                                view projects NULL::timestamptz to
--                                satisfy the WHERE clause while the
--                                base table retains its shape.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

SET search_path = public;

-- ---------------------------------------------------------------------
-- 1. dos.teams shape alignment
-- ---------------------------------------------------------------------
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dos_teams_tenant_not_deleted
  ON dos.teams(tenant_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 2. dos.departments shape alignment
-- ---------------------------------------------------------------------
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dos_departments_tenant_not_deleted
  ON dos.departments(tenant_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 3. dos.delegations view — rebuild with service-expected aliases
--    (delegator_id / delegate_id) and a NULL::timestamptz `deleted_at`
--    so soft-delete filtering works until the underlying base table
--    gains its own deleted_at column.
--
--    Upstream caller invariant (services/user-service/.../delegation.service.ts):
--      SELECT d.*, dr.email, de.email
--        FROM dos.delegations d
--        LEFT JOIN dos.users dr ON dr.user_id = d.delegator_id
--        LEFT JOIN dos.users de ON de.user_id = d.delegate_id
--       WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS dos.delegations;
CREATE VIEW dos.delegations AS
  SELECT
    delegation_id,
    from_user_id AS delegator_id,
    to_user_id   AS delegate_id,
    -- keep legacy aliases so any queries still using the original column
    -- names continue to compile during the transition.
    from_user_id,
    to_user_id,
    tenant_id,
    scope,
    valid_from,
    valid_until,
    created_at,
    NULL::timestamptz AS deleted_at,
    NULL::timestamptz AS updated_at
  FROM platform_dauth.delegations;

COMMIT;
