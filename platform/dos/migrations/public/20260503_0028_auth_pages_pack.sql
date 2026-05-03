-- Phase M1.6 — Carbon Auth Pages Pack.
-- Owner: ui-os-service.
--
-- Registers:
--   ① 19 auth.* primitive component_keys in
--      dos.dynamic_ui_component_registry, all vendor='ibm-carbon' +
--      approval_status='approved'. Each carbon_key references a row in
--      dos.ui_carbon_components and is enforced by trg_carbon_only_runtime.
--   ② 5 auth.*.page component_keys for the page composers.
--   ③ 5 dos.dynamic_ui_routes rows for the public auth surfaces
--      (/login, /register, /forgot-password, /mfa, /reset-password)
--      with tenant_id IS NULL (public).
--
-- Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- 1. Auth primitive component_keys (19 rows).
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('auth.shell',                  'ibm-carbon', 'grid',                'approved'),
  ('auth.brand-panel',            'ibm-carbon', 'tiles',               'approved'),
  ('auth.login-card',             'ibm-carbon', 'tiles',               'approved'),
  ('auth.register-card',          'ibm-carbon', 'tiles',               'approved'),
  ('auth.forgot-password-card',   'ibm-carbon', 'tiles',               'approved'),
  ('auth.reset-password-card',    'ibm-carbon', 'tiles',               'approved'),
  ('auth.mfa-card',               'ibm-carbon', 'modal',               'approved'),
  ('auth.field',                  'ibm-carbon', 'input',               'approved'),
  ('auth.password-field',         'ibm-carbon', 'input',               'approved'),
  ('auth.dropdown',               'ibm-carbon', 'dropdown',            'approved'),
  ('auth.checkbox',               'ibm-carbon', 'checkbox',            'approved'),
  ('auth.submit',                 'ibm-carbon', 'button',              'approved'),
  ('auth.sso-actions',            'ibm-carbon', 'button',              'approved'),
  ('auth.notification',           'ibm-carbon', 'notification',        'approved'),
  ('auth.progress',               'ibm-carbon', 'progress-indicator',  'approved'),
  ('auth.help',                   'ibm-carbon', 'accordion',           'approved'),
  ('auth.language-toggle',        'ibm-carbon', 'button',              'approved'),
  ('auth.security-note',          'ibm-carbon', 'tiles',               'approved'),
  ('auth.skeleton',               'ibm-carbon', 'skeleton',            'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. Auth page composer component_keys (5 rows).
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('auth.login.page',             'ibm-carbon', 'grid',  'approved'),
  ('auth.register.page',          'ibm-carbon', 'grid',  'approved'),
  ('auth.forgot-password.page',   'ibm-carbon', 'grid',  'approved'),
  ('auth.mfa.page',               'ibm-carbon', 'grid',  'approved'),
  ('auth.reset-password.page',    'ibm-carbon', 'grid',  'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 3. Public auth routes (tenant_id IS NULL).
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, 'dauth', v.path, v.component_key, NULL,
       v.sort_order, 'active', 'overview', 'full-page', 'none', NULL,
       NULL, FALSE, v.title_key, v.subtitle_key,
       v.resource_key, 'cards', FALSE, FALSE
  FROM (VALUES
    ('/login',            'auth.login.page',           20, 'auth.login.title',           'auth.login.subtitle',           'auth.resource.login'),
    ('/register',         'auth.register.page',        21, 'auth.register.title',        'auth.register.subtitle',        'auth.resource.register'),
    ('/forgot-password',  'auth.forgot-password.page', 22, 'auth.forgot-password.title', 'auth.forgot-password.subtitle', 'auth.resource.forgot-password'),
    ('/mfa',              'auth.mfa.page',             23, 'auth.mfa.title',             'auth.mfa.subtitle',             'auth.resource.mfa'),
    ('/reset-password',   'auth.reset-password.page',  24, 'auth.reset-password.title',  'auth.reset-password.subtitle',  'auth.resource.reset-password')
  ) AS v(path, component_key, sort_order, title_key, subtitle_key, resource_key)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL AND r.path_pattern = v.path
      AND r.module_code = 'dauth'
 );

-- =====================================================================
-- 4. Sanity guard.
-- =====================================================================
DO $$
DECLARE
  expected_components TEXT[] := ARRAY[
    'auth.shell','auth.brand-panel','auth.login-card','auth.register-card',
    'auth.forgot-password-card','auth.reset-password-card','auth.mfa-card',
    'auth.field','auth.password-field','auth.dropdown','auth.checkbox',
    'auth.submit','auth.sso-actions','auth.notification','auth.progress',
    'auth.help','auth.language-toggle','auth.security-note','auth.skeleton'
  ];
  expected_pages TEXT[] := ARRAY[
    'auth.login.page','auth.register.page','auth.forgot-password.page',
    'auth.mfa.page','auth.reset-password.page'
  ];
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_component_registry
   WHERE component_key = ANY(expected_components)
     AND vendor = 'ibm-carbon' AND approval_status = 'approved';
  IF cnt < array_length(expected_components,1) THEN
    RAISE EXCEPTION '[m1.6] auth primitive component_keys missing: have %, want %',
      cnt, array_length(expected_components,1);
  END IF;

  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_component_registry
   WHERE component_key = ANY(expected_pages)
     AND vendor = 'ibm-carbon' AND approval_status = 'approved';
  IF cnt < array_length(expected_pages,1) THEN
    RAISE EXCEPTION '[m1.6] auth page component_keys missing: have %, want %',
      cnt, array_length(expected_pages,1);
  END IF;

  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_routes
   WHERE tenant_id IS NULL AND module_code = 'dauth' AND readiness = 'active';
  IF cnt < array_length(expected_pages,1) THEN
    RAISE EXCEPTION '[m1.6] expected % public auth routes, have %',
      array_length(expected_pages,1), cnt;
  END IF;
END $$;

COMMIT;
