BEGIN;
-- Rollback for 001_executive_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_briefings_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.executive_briefings CASCADE;

COMMIT;
