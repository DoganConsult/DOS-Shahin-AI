-- dos:draft
-- DOWN — UI-OS — §20 Manager Studio runs  (20260502_0130)
BEGIN;
DROP TABLE IF EXISTS dos.ui_manager_export_jobs CASCADE;
DROP TABLE IF EXISTS dos.ui_manager_import_jobs CASCADE;
DROP TABLE IF EXISTS dos.ui_manager_preview_sessions CASCADE;
DROP TABLE IF EXISTS dos.ui_manager_validation_runs CASCADE;
COMMIT;
