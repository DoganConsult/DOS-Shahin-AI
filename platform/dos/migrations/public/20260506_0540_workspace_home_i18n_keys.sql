-- 20260506_0540_workspace_home_i18n_keys.sql
-- Forward-only. Seeds the publisher-owned i18n keys used by the
-- /workspace-home enrichment in services/ui-os-service/src/routes/
-- template-binding.routes.ts (loadWorkspaceHomeProps):
--
--   workspace.home.empty.title       — notification title when tenant has 0 entitled modules
--   workspace.home.empty.description — notification subtitle (same condition)
--   workspace.home.kpi.modules       — KPI label for "Modules entitled"
--
-- The dos.workspace_shell_i18n table has the trg_published_by_only
-- trigger which forbids manual writes unless
-- current_setting('dos.publisher_session') = 'contract-publisher@v1'.
-- We set that GUC LOCAL so it only applies to this transaction.
--
-- Idempotent — uses ON CONFLICT DO UPDATE on the (key, locale) PK.

BEGIN;

SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code) VALUES
  ('workspace.home', 'workspace.home.empty.title',       'en', 'No active modules yet',                         'workspace-shell'),
  ('workspace.home', 'workspace.home.empty.title',       'ar', 'لا توجد وحدات نشطة بعد',                         'workspace-shell'),
  ('workspace.home', 'workspace.home.empty.description', 'en', 'Activate a product or open Foundation to begin.','workspace-shell'),
  ('workspace.home', 'workspace.home.empty.description', 'ar', 'فعّل منتجًا أو افتح الأساس للبدء.',              'workspace-shell'),
  ('workspace.home', 'workspace.home.kpi.modules',       'en', 'Modules entitled',                              'workspace-shell'),
  ('workspace.home', 'workspace.home.kpi.modules',       'ar', 'الوحدات المُتاحة',                              'workspace-shell')
ON CONFLICT (key, locale) DO UPDATE
  SET value = EXCLUDED.value, ns = EXCLUDED.ns;

COMMIT;
