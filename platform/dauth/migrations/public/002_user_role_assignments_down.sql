BEGIN;
DROP INDEX IF EXISTS dos.ix_user_role_assignments_tenant_role;
DROP INDEX IF EXISTS dos.ix_user_role_assignments_tenant_user;
DROP INDEX IF EXISTS dos.ux_user_role_assignments_active;
DROP TABLE IF EXISTS dos.user_role_assignments;
COMMIT;
