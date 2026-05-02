-- dos:draft
-- DOWN — UI-OS — §12 i18n governance  (20260502_0117)
BEGIN;
DROP TABLE IF EXISTS dos.ui_rtl_validation_results CASCADE;
DROP TABLE IF EXISTS dos.ui_locale_user_preferences CASCADE;
DROP TABLE IF EXISTS dos.ui_translation_overrides CASCADE;
DROP TABLE IF EXISTS dos.ui_translation_versions CASCADE;
DROP TABLE IF EXISTS dos.ui_translation_namespaces CASCADE;
COMMIT;
