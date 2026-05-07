-- 20260511_0200_shell_tpl_skip_and_aria_landmarks.sql
--
-- DB-only copy for ShellHost: skip link + landmark aria-labels (shell.tpl.*).
-- Zero frontend literals — keys merge into chrome.tplStrings via UI-OS.
--
BEGIN;

SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code) VALUES
  ('shell.tpl', 'shell.tpl.skip_to_main', 'en', 'Skip to main content', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.skip_to_main', 'ar', 'تخطي إلى المحتوى الرئيسي', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.header', 'en', 'Workspace header', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.header', 'ar', 'رأس مساحة العمل', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.sidebar', 'en', 'Workspace sidebar', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.sidebar', 'ar', 'الشريط الجانبي لمساحة العمل', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.main', 'en', 'Main content', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.main', 'ar', 'المحتوى الرئيسي', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.banners', 'en', 'Notifications', 'workspace-shell'),
  ('shell.tpl', 'shell.tpl.aria.banners', 'ar', 'إشعارات', 'workspace-shell')
ON CONFLICT (key, locale) DO UPDATE
  SET value       = EXCLUDED.value,
      ns          = EXCLUDED.ns,
      module_code = EXCLUDED.module_code;

DO $$
DECLARE
  c INT;
BEGIN
  SELECT COUNT(*) INTO c
    FROM dos.workspace_shell_i18n
   WHERE ns = 'shell.tpl'
     AND key IN (
       'shell.tpl.skip_to_main',
       'shell.tpl.aria.header',
       'shell.tpl.aria.sidebar',
       'shell.tpl.aria.main',
       'shell.tpl.aria.banners'
     );
  IF c <> 10 THEN
    RAISE EXCEPTION 'shell.tpl skip/aria i18n incomplete: % rows (expected 10)', c;
  END IF;
END$$;

COMMIT;
