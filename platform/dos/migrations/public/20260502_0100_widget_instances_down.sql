-- dos:draft
-- DOWN — UI-OS — §5 Widgets — widget instances + permissions + role grants  (20260502_0100)
BEGIN;

DROP TABLE IF EXISTS dos.ui_widget_instance_role_grants CASCADE;
DROP TABLE IF EXISTS dos.ui_widget_instance_permissions CASCADE;
DROP TABLE IF EXISTS dos.ui_widget_instances CASCADE;

COMMIT;
