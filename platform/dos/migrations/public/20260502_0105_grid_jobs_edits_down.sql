-- dos:draft
-- DOWN — UI-OS — §6 Grids — bulk jobs/inline edits/validation errors  (20260502_0105)
BEGIN;
DROP TABLE IF EXISTS dos.ui_data_grid_validation_errors CASCADE;
DROP TABLE IF EXISTS dos.ui_data_grid_inline_edit_sessions CASCADE;
DROP TABLE IF EXISTS dos.ui_data_grid_bulk_jobs CASCADE;
COMMIT;
