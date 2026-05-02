-- dos:draft
-- DOWN — UI-OS — §18 Telemetry analytics  (20260502_0127)
BEGIN;
DROP TABLE IF EXISTS dos.ui_retention_snapshots CASCADE;
DROP TABLE IF EXISTS dos.ui_funnel_events CASCADE;
DROP TABLE IF EXISTS dos.ui_search_events CASCADE;
DROP TABLE IF EXISTS dos.ui_widget_usage_events CASCADE;
DROP TABLE IF EXISTS dos.ui_error_events CASCADE;
COMMIT;
