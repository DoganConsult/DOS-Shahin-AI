-- dos:draft
-- DOWN — UI-OS — §15 Role assignments  (20260502_0122)
BEGIN;
DROP TABLE IF EXISTS dos.ui_role_navigation_assignments CASCADE;
DROP TABLE IF EXISTS dos.ui_role_dashboard_assignments CASCADE;
DROP TABLE IF EXISTS dos.ui_role_layout_assignments CASCADE;
COMMIT;
