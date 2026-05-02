-- =====================================================================
-- DOWN: UI-OS runtime & personalization (20260501_0302)
-- Drops in reverse-dependency order. CASCADE peels FKs.
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS dos.ui_user_tours_completed CASCADE;
DROP TABLE IF EXISTS dos.ui_tours                CASCADE;
DROP TABLE IF EXISTS dos.ui_translations         CASCADE;
DROP TABLE IF EXISTS dos.ui_locales              CASCADE;
DROP TABLE IF EXISTS dos.ui_tenant_branding      CASCADE;
DROP TABLE IF EXISTS dos.ui_data_grid_states     CASCADE;
DROP TABLE IF EXISTS dos.ui_workspace_states     CASCADE;
DROP TABLE IF EXISTS dos.ui_dashboard_widgets    CASCADE;
DROP TABLE IF EXISTS dos.ui_dashboards           CASCADE;
DROP TABLE IF EXISTS dos.ui_user_preferences     CASCADE;

COMMIT;
