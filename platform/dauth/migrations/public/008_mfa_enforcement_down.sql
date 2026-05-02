-- 008_mfa_enforcement_down.sql
-- Rollback: remove mfa_enrollment_deadline from users table.

BEGIN;

DROP INDEX IF EXISTS idx_users_mfa_deadline;
ALTER TABLE public.users DROP COLUMN IF EXISTS mfa_enrollment_deadline;

COMMIT;
