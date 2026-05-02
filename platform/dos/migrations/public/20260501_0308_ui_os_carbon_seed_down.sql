-- =====================================================================
-- DOWN — UI-OS Carbon Design System token seed (20260501_0308)
-- =====================================================================
BEGIN;

DELETE FROM dos.dynamic_ui_theme_tokens
 WHERE scope = 'global'
   AND tenant_id IS NULL
   AND module_code IS NULL
   AND route IS NULL
   AND token_key LIKE 'cds-%';

COMMIT;
