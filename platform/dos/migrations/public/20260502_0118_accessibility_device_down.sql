-- dos:draft
-- DOWN — UI-OS — §13 Accessibility/device  (20260502_0118)
BEGIN;
DROP TABLE IF EXISTS dos.ui_viewport_profiles CASCADE;
DROP TABLE IF EXISTS dos.ui_device_sessions CASCADE;
DROP TABLE IF EXISTS dos.ui_device_preferences CASCADE;
DROP TABLE IF EXISTS dos.ui_font_scale_preferences CASCADE;
DROP TABLE IF EXISTS dos.ui_contrast_preferences CASCADE;
DROP TABLE IF EXISTS dos.ui_reduced_motion_preferences CASCADE;
DROP TABLE IF EXISTS dos.ui_accessibility_preferences CASCADE;
COMMIT;
