-- =====================================================================
-- DOWN: UI-OS layout & composition (20260501_0305)
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS dos.ui_layout_publish_history    CASCADE;
DROP TABLE IF EXISTS dos.ui_layout_versions           CASCADE;
DROP TABLE IF EXISTS dos.ui_responsive_breakpoints    CASCADE;
DROP TABLE IF EXISTS dos.ui_section_widgets           CASCADE;
DROP TABLE IF EXISTS dos.ui_page_sections             CASCADE;
DROP TABLE IF EXISTS dos.ui_page_layouts              CASCADE;
DROP TABLE IF EXISTS dos.ui_user_layout_overrides     CASCADE;
DROP TABLE IF EXISTS dos.ui_layout_templates          CASCADE;

COMMIT;
