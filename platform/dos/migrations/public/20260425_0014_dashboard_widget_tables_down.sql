-- Rollback for 20260425_0014_dashboard_widget_tables.sql
BEGIN;
DROP TABLE IF EXISTS dos.tenant_dashboard_widget_pins CASCADE;
DROP TABLE IF EXISTS dos.dashboard_widgets CASCADE;
COMMIT;
