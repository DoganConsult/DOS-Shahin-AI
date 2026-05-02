-- Down migration for 20260419_0001_m2_team_role_schema_align.
DROP INDEX IF EXISTS dos.idx_teams_tenant_status;
DROP INDEX IF EXISTS dos.idx_teams_deleted_at;
DROP INDEX IF EXISTS dos.idx_teams_team_id;
ALTER TABLE dos.teams DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE dos.teams DROP COLUMN IF EXISTS created_by;
ALTER TABLE dos.teams DROP COLUMN IF EXISTS department_id;
ALTER TABLE dos.teams DROP COLUMN IF EXISTS status;
ALTER TABLE dos.teams DROP COLUMN IF EXISTS code;
ALTER TABLE dos.teams DROP COLUMN IF EXISTS team_id;
