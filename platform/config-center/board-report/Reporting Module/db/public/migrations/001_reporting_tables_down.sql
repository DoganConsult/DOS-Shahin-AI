BEGIN;
-- Rollback for 001_reporting_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_reports_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.report_schedules CASCADE;

COMMIT;
