-- dos:draft
-- DOWN — UI-OS — §15 Visibility/permission  (20260502_0121)
BEGIN;
DROP TABLE IF EXISTS dos.ui_denied_render_log CASCADE;
DROP TABLE IF EXISTS dos.ui_policy_evaluation_log CASCADE;
DROP TABLE IF EXISTS dos.ui_permission_bindings CASCADE;
DROP TABLE IF EXISTS dos.ui_visibility_rules CASCADE;
COMMIT;
