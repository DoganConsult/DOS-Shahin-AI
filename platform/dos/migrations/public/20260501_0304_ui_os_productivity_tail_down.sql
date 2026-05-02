-- =====================================================================
-- DOWN: UI-OS productivity tail (20260501_0304)
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS dos.ui_bulk_actions    CASCADE;
DROP TABLE IF EXISTS dos.ui_context_menus   CASCADE;
DROP TABLE IF EXISTS dos.ui_quick_actions   CASCADE;
DROP TABLE IF EXISTS dos.ui_favorites       CASCADE;
DROP TABLE IF EXISTS dos.ui_saved_filters   CASCADE;

COMMIT;
