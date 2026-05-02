-- dos:draft
-- DOWN — UI-OS — §16 Drafts/audit  (20260502_0124)
BEGIN;
DROP TABLE IF EXISTS dos.ui_admin_activity_log CASCADE;
DROP TABLE IF EXISTS dos.ui_contract_drift_results CASCADE;
DROP TABLE IF EXISTS dos.ui_schema_validation_results CASCADE;
DROP TABLE IF EXISTS dos.ui_rollback_points CASCADE;
DROP TABLE IF EXISTS dos.ui_draft_versions CASCADE;
COMMIT;
