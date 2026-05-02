-- =====================================================================
-- Foundation schema alignment, part 2 (20260425_0003)
--
-- After 20260425_0002 closed the deleted_at / delegations gaps, two
-- more 500s remain in the user-service tree:
--
--   • dos.teams needs `name`, `code`, `status`, `created_by`,
--     `head_user_id` — team.service.ts SELECT list:
--       team_id, tenant_id, name, code, description, status,
--       department_id, head_user_id, created_by, created_at, updated_at
--     (minus team_code which already exists as the unique code column;
--      add a `name` column as the display name distinct from team_code).
--
--   • dos.departments needs `name_en`, `name_ar`, `code`, `bu_id`,
--     `head_user_id`, `status`, `created_by` — department.service.ts
--     writes these on INSERT/UPDATE and reads them on SELECT.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

SET search_path = public;

-- ---------------------------------------------------------------------
-- 1. dos.teams shape alignment (Part-2 additions)
-- ---------------------------------------------------------------------
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS name          VARCHAR(255);
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS code          VARCHAR(100);
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS status        VARCHAR(20)  DEFAULT 'active';
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS created_by    VARCHAR(64);
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS head_user_id  VARCHAR(64);
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);

-- Backfill `name` from the existing display_name / team_code so legacy
-- rows satisfy the NOT NULL expectations downstream without blocking.
UPDATE dos.teams
   SET name = COALESCE(display_name, team_code)
 WHERE name IS NULL AND (display_name IS NOT NULL OR team_code IS NOT NULL);

-- Backfill `code` from the existing unique team_code so older rows stay
-- queryable via the new canonical column.
UPDATE dos.teams
   SET code = team_code
 WHERE code IS NULL AND team_code IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. dos.departments shape alignment (Part-2 additions)
-- ---------------------------------------------------------------------
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS name_en       VARCHAR(255);
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS name_ar       VARCHAR(255);
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS code          VARCHAR(100);
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS bu_id         UUID;
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS head_user_id  VARCHAR(64);
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'active';
ALTER TABLE dos.departments ADD COLUMN IF NOT EXISTS created_by    VARCHAR(64);

-- Backfill: the existing `display_name` and `department_code` columns
-- carry the legacy values; mirror them into the service-expected shape
-- so existing rows are visible.
UPDATE dos.departments
   SET name_en = display_name
 WHERE name_en IS NULL AND display_name IS NOT NULL;

UPDATE dos.departments
   SET code = department_code
 WHERE code IS NULL AND department_code IS NOT NULL;

COMMIT;
