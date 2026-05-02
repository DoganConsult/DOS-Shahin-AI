-- dos:draft
-- DOWN — UI-OS — §16 Governance publish  (20260502_0123)
BEGIN;
DROP TABLE IF EXISTS dos.ui_published_versions CASCADE;
DROP TABLE IF EXISTS dos.ui_publish_approvals CASCADE;
DROP TABLE IF EXISTS dos.ui_publish_requests CASCADE;
DROP TABLE IF EXISTS dos.ui_change_log CASCADE;
COMMIT;
