-- dos:draft
BEGIN;
DROP TABLE IF EXISTS dos.dynamic_ui_health_probes CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_page_headers CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_trial_banner_rules CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_empty_states CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_setup_steps CASCADE;
COMMIT;
