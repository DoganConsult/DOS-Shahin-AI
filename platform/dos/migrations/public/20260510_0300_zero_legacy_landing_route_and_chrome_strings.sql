-- 20260510_0300_zero_legacy_landing_route_and_chrome_strings.sql
--
-- ZERO-LEGACY / ZERO-FALLBACK / ZERO-CUSTOMIZATION cutover (Session S1).
--
-- Doctrine (AGENTS.md):
--   DB stores. UI-OS resolves. Frontend renders only normalized runtime.
--   If DB has nothing, UI-OS emits nothing, frontend renders nothing.
--   No '/workspace-home' literal in source/runtime/seed outside this
--   migration boundary. No 'Shahin-AI' brand literal outside the
--   tenant-branding seed. No DEFAULT '/workspace-home' columns.
--
-- This migration:
--   1. Drops the doctrine-violating column DEFAULTs from
--      dos.tenant_landing_config so the table no longer auto-fabricates
--      a landing route. Operators must seed real values explicitly.
--   2. Makes those columns NULLABLE so absence of intent is representable.
--   3. Deletes the auto-seed rows (planted by 20260505_0903) whose
--      values are byte-equal to the literal demo defaults — those rows
--      were the doctrine drift we are killing.
--   4. Seeds the publisher-owned i18n keys required for shell chrome
--      to render breadcrumbs, template-page strings, and required-
--      permission prefix from DB instead of from frontend constants.
--
-- Forward-only. Idempotent. Re-runnable. Test-DB safe (no destructive
-- table drops; no destruction of operator-customized rows; only deletes
-- rows whose values match the literal defaults verbatim).

BEGIN;

-- ─── 1. Drop fallback DEFAULTs on tenant_landing_config columns ────────
ALTER TABLE dos.tenant_landing_config
  ALTER COLUMN authenticated_route   DROP DEFAULT,
  ALTER COLUMN unauthenticated_route DROP DEFAULT,
  ALTER COLUMN session_expired_route DROP DEFAULT,
  ALTER COLUMN authenticated_route   DROP NOT NULL,
  ALTER COLUMN unauthenticated_route DROP NOT NULL,
  ALTER COLUMN session_expired_route DROP NOT NULL;

-- ─── 2. Purge auto-fabricated rows (doctrine-drift seed) ───────────────
-- Only delete rows where every routable column matches the literal
-- demo defaults exactly. Operator-customized rows survive.
DELETE FROM dos.tenant_landing_config
 WHERE authenticated_route   = '/workspace-home'
   AND unauthenticated_route = '/'
   AND session_expired_route = '/'
   AND (post_auth_route = '/workspace-home' OR post_auth_route IS NULL);

-- ─── 3. Seed shell chrome i18n keys (publisher-owned catalog) ──────────
-- workspace_shell_i18n is publisher-locked by trg_published_by_only.
SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code) VALUES
  -- Workspace breadcrumb (replaces hardcoded "Workspace" / "مساحة العمل" in 4 foundation pages + module-page-chrome)
  ('shell.breadcrumb', 'shell.breadcrumb.workspace', 'en', 'Workspace',     'workspace-shell'),
  ('shell.breadcrumb', 'shell.breadcrumb.workspace', 'ar', 'مساحة العمل',     'workspace-shell'),

  -- DynamicTemplatePageComponent strings (replaces hardcoded
  -- "Access denied", "You do not have...", "Loading…", empty state)
  ('shell.tpl', 'shell.tpl.access_denied.title',       'en', 'Access denied',                                            'workspace-shell'),
  ('shell.tpl', 'shell.tpl.access_denied.title',       'ar', 'تم رفض الوصول',                                              'workspace-shell'),
  ('shell.tpl', 'shell.tpl.access_denied.description', 'en', 'You do not have the required permission to open this page.','workspace-shell'),
  ('shell.tpl', 'shell.tpl.access_denied.description', 'ar', 'ليست لديك الصلاحية المطلوبة لفتح هذه الصفحة.',                'workspace-shell'),
  ('shell.tpl', 'shell.tpl.required_permission_prefix','en', 'Required permission:',                                      'workspace-shell'),
  ('shell.tpl', 'shell.tpl.required_permission_prefix','ar', 'الصلاحية المطلوبة:',                                          'workspace-shell'),
  ('shell.tpl', 'shell.tpl.loading',                   'en', 'Loading…',                                                  'workspace-shell'),
  ('shell.tpl', 'shell.tpl.loading',                   'ar', 'جارٍ التحميل…',                                                'workspace-shell'),
  ('shell.tpl', 'shell.tpl.empty.title',               'en', '',                                                          'workspace-shell'),
  ('shell.tpl', 'shell.tpl.empty.title',               'ar', '',                                                          'workspace-shell'),
  ('shell.tpl', 'shell.tpl.empty.description',         'en', '',                                                          'workspace-shell'),
  ('shell.tpl', 'shell.tpl.empty.description',         'ar', '',                                                          'workspace-shell')
ON CONFLICT (key, locale) DO UPDATE
  SET value     = EXCLUDED.value,
      ns        = EXCLUDED.ns;

-- ─── 4. Assertions — fail loudly if substrate did not land ─────────────
DO $$
DECLARE
  c_default_anon   TEXT;
  c_default_auth   TEXT;
  c_seed_count     INT;
  c_breadcrumb_en  INT;
  c_breadcrumb_ar  INT;
  c_tpl_keys       INT;
BEGIN
  -- 4.1 Defaults must be NULL
  SELECT column_default INTO c_default_anon
    FROM information_schema.columns
   WHERE table_schema='dos' AND table_name='tenant_landing_config'
     AND column_name='unauthenticated_route';
  IF c_default_anon IS NOT NULL THEN
    RAISE EXCEPTION 'tenant_landing_config.unauthenticated_route still has DEFAULT %, expected NULL', c_default_anon;
  END IF;

  SELECT column_default INTO c_default_auth
    FROM information_schema.columns
   WHERE table_schema='dos' AND table_name='tenant_landing_config'
     AND column_name='authenticated_route';
  IF c_default_auth IS NOT NULL THEN
    RAISE EXCEPTION 'tenant_landing_config.authenticated_route still has DEFAULT %, expected NULL', c_default_auth;
  END IF;

  -- 4.2 No auto-fabricated rows survive (would be fingerprintable)
  SELECT COUNT(*) INTO c_seed_count
    FROM dos.tenant_landing_config
   WHERE authenticated_route   = '/workspace-home'
     AND unauthenticated_route = '/'
     AND session_expired_route = '/'
     AND (post_auth_route = '/workspace-home' OR post_auth_route IS NULL);
  IF c_seed_count > 0 THEN
    RAISE EXCEPTION 'tenant_landing_config still has % auto-fabricated demo-default rows', c_seed_count;
  END IF;

  -- 4.3 Required i18n rows exist (en + ar)
  SELECT COUNT(*) INTO c_breadcrumb_en
    FROM dos.workspace_shell_i18n
   WHERE key='shell.breadcrumb.workspace' AND locale='en';
  SELECT COUNT(*) INTO c_breadcrumb_ar
    FROM dos.workspace_shell_i18n
   WHERE key='shell.breadcrumb.workspace' AND locale='ar';
  IF c_breadcrumb_en <> 1 OR c_breadcrumb_ar <> 1 THEN
    RAISE EXCEPTION 'shell.breadcrumb.workspace i18n missing (en=%, ar=%)', c_breadcrumb_en, c_breadcrumb_ar;
  END IF;

  SELECT COUNT(*) INTO c_tpl_keys
    FROM dos.workspace_shell_i18n
   WHERE key IN (
     'shell.tpl.access_denied.title',
     'shell.tpl.access_denied.description',
     'shell.tpl.required_permission_prefix',
     'shell.tpl.loading',
     'shell.tpl.empty.title',
     'shell.tpl.empty.description'
   );
  -- 6 keys × 2 locales = 12 rows expected
  IF c_tpl_keys <> 12 THEN
    RAISE EXCEPTION 'shell.tpl.* i18n incomplete: % rows, expected 12', c_tpl_keys;
  END IF;
END$$;

COMMIT;
