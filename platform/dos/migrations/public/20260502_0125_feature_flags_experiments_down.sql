-- dos:draft
-- DOWN — UI-OS — §17 Feature flags / experiments  (20260502_0125)
BEGIN;
DROP TABLE IF EXISTS dos.ui_kill_switches CASCADE;
DROP TABLE IF EXISTS dos.ui_rollout_rules CASCADE;
DROP TABLE IF EXISTS dos.ui_experiment_assignments CASCADE;
DROP TABLE IF EXISTS dos.ui_experiment_variants CASCADE;
DROP TABLE IF EXISTS dos.ui_experiments CASCADE;
DROP TABLE IF EXISTS dos.ui_feature_flag_assignments CASCADE;
DROP TABLE IF EXISTS dos.ui_feature_flags CASCADE;
COMMIT;
