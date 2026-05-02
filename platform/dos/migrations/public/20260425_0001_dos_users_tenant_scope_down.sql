-- =====================================================================
-- Rollback for 20260425_0001_dos_users_tenant_scope.
-- Reverses the ALTER TABLE … ADD COLUMN additions. Does NOT truncate
-- the backfilled rows — those are safe to keep because the event
-- consumer keeps them fresh and public.users remains the source of
-- truth. If a full reset is required, `TRUNCATE dos.users;` after the
-- DROP COLUMN block below.
-- =====================================================================

BEGIN;

SET search_path = public;

DROP INDEX IF EXISTS dos.idx_dos_users_tenant_email;
DROP INDEX IF EXISTS dos.idx_dos_users_tenant;

ALTER TABLE dos.users DROP COLUMN IF EXISTS last_name;
ALTER TABLE dos.users DROP COLUMN IF EXISTS first_name;
ALTER TABLE dos.users DROP COLUMN IF EXISTS full_name;
ALTER TABLE dos.users DROP COLUMN IF EXISTS last_login;
ALTER TABLE dos.users DROP COLUMN IF EXISTS platform_role;
ALTER TABLE dos.users DROP COLUMN IF EXISTS member_onboarded;
ALTER TABLE dos.users DROP COLUMN IF EXISTS onboarding_complete;
ALTER TABLE dos.users DROP COLUMN IF EXISTS updated_at;
ALTER TABLE dos.users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE dos.users DROP COLUMN IF EXISTS department_id;
ALTER TABLE dos.users DROP COLUMN IF EXISTS role;
ALTER TABLE dos.users DROP COLUMN IF EXISTS tenant_id;

COMMIT;
