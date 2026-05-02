-- Down for 20260425_0002 — schema alignment additive columns.
-- Drops only the columns this forward migration introduced; leaves rows intact.
BEGIN;

ALTER TABLE IF EXISTS dos.teams        DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS dos.teams        DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS dos.teams        DROP COLUMN IF EXISTS description;

ALTER TABLE IF EXISTS dos.departments  DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS dos.departments  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE IF EXISTS dos.delegations  DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS dos.delegations  DROP COLUMN IF EXISTS updated_at;

COMMIT;
