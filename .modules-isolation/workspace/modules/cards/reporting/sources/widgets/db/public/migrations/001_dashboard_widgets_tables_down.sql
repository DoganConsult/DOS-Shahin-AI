BEGIN;
-- Rollback for 001_dashboard_widgets_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_widgets_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.widgets CASCADE;

COMMIT;
