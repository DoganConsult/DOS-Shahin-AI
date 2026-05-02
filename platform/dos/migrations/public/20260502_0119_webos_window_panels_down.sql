-- dos:draft
-- DOWN — UI-OS — §14 WebOS — sessions/windows/panels/tabs  (20260502_0119)
BEGIN;
DROP TABLE IF EXISTS dos.ui_tab_states CASCADE;
DROP TABLE IF EXISTS dos.ui_panel_states CASCADE;
DROP TABLE IF EXISTS dos.ui_window_states CASCADE;
DROP TABLE IF EXISTS dos.ui_workspace_sessions CASCADE;
COMMIT;
