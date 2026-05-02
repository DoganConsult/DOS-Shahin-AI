-- dos:draft
-- DOWN — UI-OS — §14 WebOS — split/drag/clipboard/restore  (20260502_0120)
BEGIN;
DROP TABLE IF EXISTS dos.ui_workspace_restore_points CASCADE;
DROP TABLE IF EXISTS dos.ui_clipboard_items CASCADE;
DROP TABLE IF EXISTS dos.ui_drag_drop_layout_events CASCADE;
DROP TABLE IF EXISTS dos.ui_split_view_states CASCADE;
COMMIT;
