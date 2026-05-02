-- dos:draft
-- DOWN — UI-OS — §20 Manager Studio core  (20260502_0129)
BEGIN;
DROP TABLE IF EXISTS dos.ui_manager_review_comments CASCADE;
DROP TABLE IF EXISTS dos.ui_manager_locks CASCADE;
DROP TABLE IF EXISTS dos.ui_manager_drafts CASCADE;
DROP TABLE IF EXISTS dos.ui_manager_projects CASCADE;
COMMIT;
