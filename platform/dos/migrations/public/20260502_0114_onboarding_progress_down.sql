-- dos:draft
-- DOWN — UI-OS — §10 Onboarding  (20260502_0114)
BEGIN;
DROP TABLE IF EXISTS dos.ui_user_release_notes_read CASCADE;
DROP TABLE IF EXISTS dos.ui_release_notes CASCADE;
DROP TABLE IF EXISTS dos.ui_user_checklist_progress CASCADE;
DROP TABLE IF EXISTS dos.ui_checklist_steps CASCADE;
DROP TABLE IF EXISTS dos.ui_checklists CASCADE;
DROP TABLE IF EXISTS dos.ui_empty_state_content CASCADE;
COMMIT;
