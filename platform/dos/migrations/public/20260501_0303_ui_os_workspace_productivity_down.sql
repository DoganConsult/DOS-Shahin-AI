-- =====================================================================
-- DOWN: UI-OS workspace productivity (20260501_0303)
-- Drops in reverse-dependency order. CASCADE peels FKs.
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS dos.ui_user_announcements_read CASCADE;
DROP TABLE IF EXISTS dos.ui_announcements           CASCADE;
DROP TABLE IF EXISTS dos.ui_user_shortcuts          CASCADE;
DROP TABLE IF EXISTS dos.ui_command_palette_items   CASCADE;
DROP TABLE IF EXISTS dos.ui_recent_items            CASCADE;
DROP TABLE IF EXISTS dos.ui_pinned_items            CASCADE;
DROP TABLE IF EXISTS dos.ui_saved_views             CASCADE;

COMMIT;
