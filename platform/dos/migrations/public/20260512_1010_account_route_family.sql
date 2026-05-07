-- =====================================================================
-- 20260512_1010_account_route_family.sql
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / Dynamic UI-OS only.
--
-- Closes the /account/* route family gap so the user-menu navigate items
-- (Profile / Preferences / Security) emitted by Wave 36 Migration 1 land
-- on real, classifiable routes with template + page-experience contracts.
--
-- Adds DB-driven contracts for:
--   /account
--   /account/profile
--   /account/preferences
--   /account/security
--
-- Tables touched:
--   dos.dynamic_ui_route_metadata  (classification, metadata_public=true)
--   dos.dynamic_ui_routes          (page-experience, tenant_id IS NULL = global)
--   dos.ui_route_template_binding  (archetype + template export)
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- 1) Route metadata classification
WITH new_meta(route, render_mode, template_binding_required, is_public, metadata_public) AS (
  VALUES
    ('/account',             'redirect', false, false, true),
    ('/account/profile',     'template', true,  false, true),
    ('/account/preferences', 'template', true,  false, true),
    ('/account/security',    'template', true,  false, true)
)
INSERT INTO dos.dynamic_ui_route_metadata
  (route, render_mode, template_binding_required, is_public, metadata_public, metadata, version)
SELECT nm.route, nm.render_mode, nm.template_binding_required,
       nm.is_public, nm.metadata_public, '{}'::jsonb, 1
  FROM new_meta nm
ON CONFLICT (route) DO UPDATE
  SET render_mode               = EXCLUDED.render_mode,
      template_binding_required = EXCLUDED.template_binding_required,
      is_public                 = EXCLUDED.is_public,
      metadata_public           = EXCLUDED.metadata_public,
      updated_at                = now();

-- 2) Page-experience rows (global = tenant_id IS NULL)
WITH new_routes(path_pattern, component_key, sort_order, page_type, layout,
                title_key, subtitle_key, permission_key) AS (
  VALUES
    ('/account/profile',     'module.settings.page', 10, 'settings', 'form-grid',
       'account.page.profile.title',     'account.page.profile.subtitle',     ''),
    ('/account/preferences', 'module.settings.page', 20, 'settings', 'form-grid',
       'account.page.preferences.title', 'account.page.preferences.subtitle', ''),
    ('/account/security',    'module.settings.page', 30, 'settings', 'form-grid',
       'account.page.security.title',    'account.page.security.subtitle',    '')
)
INSERT INTO dos.dynamic_ui_routes (
  tenant_id, module_code, path_pattern, component_key, permission_key,
  sort_order, page_type, layout, title_key, subtitle_key,
  data_scope_mode, audit_enabled, realtime_enabled
)
SELECT NULL, 'account', nr.path_pattern, nr.component_key, NULLIF(nr.permission_key,''),
       nr.sort_order, nr.page_type, nr.layout, nr.title_key, nr.subtitle_key,
       'tenant', TRUE, FALSE
  FROM new_routes nr
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL AND r.path_pattern = nr.path_pattern
 );

-- 3) Template bindings (archetype = module-settings)
WITH new_bindings(route, archetype, template_export,
                  title_en, title_ar, subtitle_en, subtitle_ar) AS (
  VALUES
    ('/account/profile',     'module-settings', 'ModuleSettingsTemplateComponent',
     'Profile',     'الملف الشخصي',
     'Personal profile and contact details.', 'الملف الشخصي وبيانات الاتصال.'),
    ('/account/preferences', 'module-settings', 'ModuleSettingsTemplateComponent',
     'Preferences', 'التفضيلات',
     'Language, theme, notification and accessibility preferences.',
     'اللغة والسمة والإشعارات وتفضيلات الوصول.'),
    ('/account/security',    'module-settings', 'ModuleSettingsTemplateComponent',
     'Security',    'الأمان',
     'Password, MFA, sessions and trusted devices.',
     'كلمة المرور والمصادقة الثنائية والجلسات والأجهزة الموثوقة.')
)
INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props,
  title_en, title_ar, subtitle_en, subtitle_ar, status_tags
)
SELECT nb.route, nb.archetype, nb.template_export, '{}'::jsonb,
       nb.title_en, nb.title_ar, nb.subtitle_en, nb.subtitle_ar, '[]'::jsonb
  FROM new_bindings nb
ON CONFLICT (route) DO UPDATE
  SET archetype       = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      title_en        = EXCLUDED.title_en,
      title_ar        = EXCLUDED.title_ar,
      subtitle_en     = EXCLUDED.subtitle_en,
      subtitle_ar     = EXCLUDED.subtitle_ar,
      updated_at      = now();

-- Self-test
DO $$
DECLARE n_meta int; n_routes int; n_bind int;
BEGIN
  SELECT count(*) INTO n_meta FROM dos.dynamic_ui_route_metadata
   WHERE route IN ('/account','/account/profile','/account/preferences','/account/security');
  SELECT count(*) INTO n_routes FROM dos.dynamic_ui_routes
   WHERE tenant_id IS NULL
     AND path_pattern IN ('/account/profile','/account/preferences','/account/security');
  SELECT count(*) INTO n_bind FROM dos.ui_route_template_binding
   WHERE route IN ('/account/profile','/account/preferences','/account/security');
  IF n_meta < 4 OR n_routes < 3 OR n_bind < 3 THEN
    RAISE EXCEPTION 'account-route-family: incomplete (meta=% routes=% bind=%)', n_meta, n_routes, n_bind;
  END IF;
  RAISE NOTICE 'account-route-family: meta=% routes=% bind=%', n_meta, n_routes, n_bind;
END$$;

COMMIT;
