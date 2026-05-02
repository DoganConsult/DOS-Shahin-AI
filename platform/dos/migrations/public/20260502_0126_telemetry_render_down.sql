-- dos:draft
-- DOWN — UI-OS — §18 Telemetry render  (20260502_0126)
BEGIN;
DROP TABLE IF EXISTS dos.ui_render_performance_events CASCADE;
DROP TABLE IF EXISTS dos.ui_command_events CASCADE;
DROP TABLE IF EXISTS dos.ui_click_events CASCADE;
DROP TABLE IF EXISTS dos.ui_page_view_events CASCADE;
COMMIT;
