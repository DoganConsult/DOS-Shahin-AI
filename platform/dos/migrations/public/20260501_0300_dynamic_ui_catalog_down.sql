-- =====================================================================
-- DOWN: Dynamic UI catalog (20260501_0300)
-- Drops tables in reverse-dependency order. CASCADE used to peel FKs.
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS dos.dynamic_ui_shells              CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_user_preferences    CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_intents             CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_theme_tokens        CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_data_resources      CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_kpis                CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_agent_squad_members CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_agent_squads        CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_workflow_agents     CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_page_agents         CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_agent_actions       CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_agents              CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_widgets             CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_actions             CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_routes              CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_navigation          CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_module_status       CASCADE;
DROP TABLE IF EXISTS dos.dynamic_ui_modules             CASCADE;

COMMIT;
