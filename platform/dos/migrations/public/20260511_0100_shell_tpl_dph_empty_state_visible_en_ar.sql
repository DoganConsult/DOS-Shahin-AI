-- 20260511_0100_shell_tpl_dph_empty_state_visible_en_ar.sql
--
-- Visible empty-state copy for DynamicPageHost (shell.tpl.dph.*).
-- Idempotent upsert for DBs that already applied 20260510_0310 with empty
-- values. Aligns with 20260510_0310 after that file was updated for greenfield.
--
BEGIN;

SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code) VALUES
  ('shell.tpl.dph', 'shell.tpl.dph.empty.title', 'en', 'No widgets to display', 'workspace-shell'),
  ('shell.tpl.dph', 'shell.tpl.dph.empty.title', 'ar', 'لا توجد عناصر لعرضها', 'workspace-shell'),
  ('shell.tpl.dph', 'shell.tpl.dph.empty.body',  'en', 'Content appears when widgets are assigned to this route in your workspace.', 'workspace-shell'),
  ('shell.tpl.dph', 'shell.tpl.dph.empty.body',  'ar', 'يظهر المحتوى عند ربط عناصر العرض بهذا المسار في مساحة العمل.', 'workspace-shell')
ON CONFLICT (key, locale) DO UPDATE
  SET value       = EXCLUDED.value,
      ns          = EXCLUDED.ns,
      module_code = EXCLUDED.module_code;

DO $$
DECLARE
  c_empty_en INT;
BEGIN
  SELECT COUNT(*) INTO c_empty_en
    FROM dos.workspace_shell_i18n
   WHERE ns = 'shell.tpl.dph'
     AND locale = 'en'
     AND key IN ('shell.tpl.dph.empty.title', 'shell.tpl.dph.empty.body')
     AND (trim(coalesce(value, '')) = '');
  IF c_empty_en > 0 THEN
    RAISE WARNING 'shell.tpl.dph en rows still empty after upsert: %', c_empty_en;
  END IF;
END $$;

COMMIT;
