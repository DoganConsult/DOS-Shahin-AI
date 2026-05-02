-- dos:draft
-- DOWN — UI-OS — §9 Inbox  (20260502_0112)
BEGIN;
DROP TABLE IF EXISTS dos.ui_inbox_assignments CASCADE;
DROP TABLE IF EXISTS dos.ui_inbox_snoozes CASCADE;
DROP TABLE IF EXISTS dos.ui_inbox_rules CASCADE;
DROP TABLE IF EXISTS dos.ui_inbox_views CASCADE;
COMMIT;
