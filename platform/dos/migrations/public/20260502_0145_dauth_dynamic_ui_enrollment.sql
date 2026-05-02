-- =====================================================================
-- DAuth Dynamic-UI enrollment (20260502_0145) — Wave W8 (vertical slice 1/9)
--
-- Per docs/DOS-AIO-Specs/dynamic-ui-enrollment-page-experience-widgets-spec.md
-- §8 (catalog tables) and §10 (Hard Gates).
--
-- Vertical-slice doctrine (AGENTS.md): one DNA module end-to-end before
-- advancing. This migration enrolls ONLY 'dauth'. The other 8 DNA modules
-- (config-center, tenant-management, multi-tenant-mgmt, foundation-admin,
-- dos-platform, dnoc, dsoc, ai-platform) remain pending.
--
-- Seeds the platform-default (tenant_id IS NULL) row set required for
-- the Hard Gates to pass for module_code='dauth':
--   1. dos.dynamic_ui_routes          — 5 routes, EVERY one carries
--      page_type, layout, kpi_scope, title_key, permission_key
--   2. dos.dynamic_ui_theme_tokens    — accent/icon/density/surface/
--      table_density/page_header_variant
--   3. dos.dynamic_ui_kpis            — module-overview KPIs only
--   4. dos.dynamic_ui_actions         — at least one primary action per page
--   5. dos.dynamic_ui_data_resources  — REST resources backing routes/kpis
--   6. dos.dynamic_ui_i18n_keys       — every *_key referenced has EN+AR
--
-- 6NF: scalar columns only on parent tables; multi-valued attributes
-- (route permissions, route audience profiles, action profiles) live in
-- existing junctions / TEXT[] columns owned by earlier migrations.
-- The W8 migration adds NO ARRAY columns of its own.
--
-- Hard Gate compliance for dauth module:
--   ✓ /api/dynamic-ui/contract/dauth returns module contract       (W8.3)
--   ✓ /api/dynamic-ui/route-catalog includes dauth's 5 routes     (W8.3)
--   ✓ every route has page_type        (NOT NULL on every seed)
--   ✓ every route has layout           (NOT NULL on every seed)
--   ✓ every route has kpi_scope        (NOT NULL on every seed)
--   ✓ every route has title_key        (NOT NULL on every seed)
--   ✓ navigation renders from contract (already in W1 0140)
--   ✓ overview page shows module KPIs  (kpi_scope='module-overview')
--   ✓ non-overview routes do NOT show overview KPIs
--                                       (kpi_scope='none' on list/audit)
--   ✓ permissions filter navigation    (permission_key set per route)
-- =====================================================================
BEGIN;

-- ── 0. Pre-flight: dauth must already be in dos.dynamic_ui_modules ──
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.dynamic_ui_modules WHERE module_code = 'dauth';
  IF n = 0 THEN
    RAISE EXCEPTION 'dauth missing from dos.dynamic_ui_modules; run 0140 first';
  END IF;
END $$;

-- =====================================================================
-- 1. dynamic_ui_routes — 5 routes, all critical fields populated.
--    Idempotency guard: skip rows that already exist for (module_code,
--    path_pattern) at platform-default (tenant_id IS NULL).
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled,
   nba_enabled)
SELECT NULL, 'dauth', x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, 'tenant', FALSE,
       x.title_key, x.subtitle_key, x.data_resource_key, 'table',
       x.audit, FALSE, FALSE
  FROM (VALUES
    ('/admin/dauth',             'platform.dauth.overview',    'platform.admin.read',         100, 'overview', 'dashboard', 'module-overview', 'monitor',
        'dauth.page.overview.title',    'dauth.page.overview.subtitle',    'dauth.resource.overview',    TRUE),
    ('/admin/dauth/users',       'platform.dauth.users.list',  'platform.user.read',          200, 'list',     'full-page', 'none',            'manage',
        'dauth.page.users.title',       'dauth.page.users.subtitle',       'dauth.resource.users',       TRUE),
    ('/admin/dauth/roles',       'platform.dauth.roles.list',  'platform.role.manage',        300, 'list',     'full-page', 'none',            'manage',
        'dauth.page.roles.title',       'dauth.page.roles.subtitle',       'dauth.resource.roles',       TRUE),
    ('/admin/dauth/permissions', 'platform.dauth.perms.list',  'platform.permission.manage',  400, 'list',     'full-page', 'none',            'manage',
        'dauth.page.perms.title',       'dauth.page.perms.subtitle',       'dauth.resource.perms',       TRUE),
    ('/admin/dauth/audit',       'platform.dauth.audit.list',  'platform.audit.read',         500, 'audit',    'report',    'none',            'investigate',
        'dauth.page.audit.title',       'dauth.page.audit.subtitle',       'dauth.resource.audit',       TRUE)
  ) AS x(path, component, perm, sort, page_type, layout, kpi_scope, intent,
         title_key, subtitle_key, data_resource_key, audit)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL
      AND r.module_code = 'dauth'
      AND r.path_pattern = x.path
 );

-- =====================================================================
-- 2. dynamic_ui_theme_tokens — module-scope brand identity per spec
--    §8 "Critical fields for dynamic_ui_theme_tokens".
-- =====================================================================
INSERT INTO dos.dynamic_ui_theme_tokens
  (tenant_id, module_code, token_key, token_value, scope, route, is_active)
SELECT NULL, 'dauth', x.k, x.v, 'module', NULL, TRUE
  FROM (VALUES
    ('accent',              'brand'),
    ('icon',                'enterprise'),
    ('density',             'comfortable'),
    ('surface',             'neutral'),
    ('table_density',       'comfortable'),
    ('page_header_variant', 'standard')
  ) AS x(k, v)
ON CONFLICT (tenant_id, module_code, route, token_key) DO UPDATE
   SET token_value = EXCLUDED.token_value,
       is_active   = TRUE;

-- =====================================================================
-- 3. dynamic_ui_kpis — module-overview KPIs only (page-local KPIs forbidden
--    on dauth's non-overview routes per Hard Gate "non-overview pages do
--    not show overview KPIs").
-- =====================================================================
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit, data_resource,
   permission, scope, format, trend_enabled, sort_order, is_active)
SELECT NULL, 'dauth', NULL, x.kpi_key, x.label_key, x.unit, x.resource,
       x.perm, 'module-overview', x.fmt, FALSE, x.sort, TRUE
  FROM (VALUES
    ('users.total',       'dauth.kpi.users.total',       NULL,        'dauth.resource.users.count',       'platform.user.read',         'number', 100),
    ('roles.total',       'dauth.kpi.roles.total',       NULL,        'dauth.resource.roles.count',       'platform.role.manage',       'number', 200),
    ('permissions.total', 'dauth.kpi.permissions.total', NULL,        'dauth.resource.perms.count',       'platform.permission.manage', 'number', 300),
    ('mfa.coverage',      'dauth.kpi.mfa.coverage',      'percent',   'dauth.resource.mfa.coverage',      'platform.admin.read',        'percentage', 400),
    ('sessions.active',   'dauth.kpi.sessions.active',   NULL,        'dauth.resource.sessions.active',   'platform.admin.read',        'number', 500)
  ) AS x(kpi_key, label_key, unit, resource, perm, fmt, sort)
ON CONFLICT (tenant_id, module_code, route, kpi_key) DO UPDATE
   SET label_key     = EXCLUDED.label_key,
       data_resource = EXCLUDED.data_resource,
       permission    = EXCLUDED.permission,
       format        = EXCLUDED.format;

-- =====================================================================
-- 4. dynamic_ui_actions — at least one primary action per page.
-- =====================================================================
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, risk_level, requires_approval, evidence_required,
   handler_key, sort_order, is_active)
SELECT NULL, 'dauth', x.route, x.action_id, x.position, x.label_key,
       x.icon, x.perm, x.risk, FALSE, FALSE, x.handler, x.sort, TRUE
  FROM (VALUES
    ('/admin/dauth',             'open-users',     'primary',   'dauth.action.open_users',     'arrow-right',  'platform.user.read',          'low',    'navigate.users',           100),
    ('/admin/dauth/users',       'create-user',    'primary',   'dauth.action.create_user',    'add',          'platform.user.create',        'medium', 'dauth.user.create',        100),
    ('/admin/dauth/users',       'invite-user',    'secondary', 'dauth.action.invite_user',    'send',         'platform.user.create',        'low',    'dauth.user.invite',        200),
    ('/admin/dauth/roles',       'create-role',    'primary',   'dauth.action.create_role',    'add',          'platform.role.manage',        'medium', 'dauth.role.create',        100),
    ('/admin/dauth/permissions', 'sync-perms',     'primary',   'dauth.action.sync_perms',     'renew',        'platform.permission.manage',  'medium', 'dauth.perm.sync',          100),
    ('/admin/dauth/audit',       'export-audit',   'primary',   'dauth.action.export_audit',   'download',     'platform.audit.read',         'low',    'dauth.audit.export',       100)
  ) AS x(route, action_id, position, label_key, icon, perm, risk, handler, sort)
ON CONFLICT (tenant_id, module_code, route, action_id) DO UPDATE
   SET label_key  = EXCLUDED.label_key,
       icon       = EXCLUDED.icon,
       permission = EXCLUDED.permission,
       handler_key= EXCLUDED.handler_key;

-- =====================================================================
-- 5. dynamic_ui_data_resources — REST resources behind routes/KPIs.
--    Each KPI/route data_resource_key in (1) and (3) is registered here.
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, pagination, shape_ref, is_active)
SELECT NULL, 'dauth', x.key, 'rest', x.url, x.perm, x.ttl, x.pag, x.shape, TRUE
  FROM (VALUES
    ('dauth.resource.overview',         '/api/users/stats',                       'platform.admin.read',        30,  'none',   'dauth.shape.overview'),
    ('dauth.resource.users',            '/api/users',                             'platform.user.read',         15,  'cursor', 'dauth.shape.user'),
    ('dauth.resource.users.count',      '/api/users/count',                       'platform.user.read',         60,  'none',   'dauth.shape.count'),
    ('dauth.resource.roles',            '/api/auth/roles',                        'platform.role.manage',       30,  'offset', 'dauth.shape.role'),
    ('dauth.resource.roles.count',      '/api/auth/roles/count',                  'platform.role.manage',       60,  'none',   'dauth.shape.count'),
    ('dauth.resource.perms',            '/api/auth/permissions',                  'platform.permission.manage', 30,  'offset', 'dauth.shape.permission'),
    ('dauth.resource.perms.count',      '/api/auth/permissions/count',            'platform.permission.manage', 60,  'none',   'dauth.shape.count'),
    ('dauth.resource.audit',            '/api/audit?module=dauth',                'platform.audit.read',        15,  'cursor', 'dauth.shape.audit'),
    ('dauth.resource.mfa.coverage',     '/api/users/mfa-coverage',                'platform.admin.read',        300, 'none',   'dauth.shape.percentage'),
    ('dauth.resource.sessions.active',  '/api/auth/sessions/active/count',        'platform.admin.read',        15,  'none',   'dauth.shape.count')
  ) AS x(key, url, perm, ttl, pag, shape)
ON CONFLICT (tenant_id, module_code, resource_key) DO UPDATE
   SET url_or_query  = EXCLUDED.url_or_query,
       permission    = EXCLUDED.permission,
       cache_ttl_sec = EXCLUDED.cache_ttl_sec,
       pagination    = EXCLUDED.pagination,
       shape_ref     = EXCLUDED.shape_ref;

-- =====================================================================
-- 6. dynamic_ui_i18n_keys — EN+AR for every *_key referenced above.
--    Spec §11.1 forbids rendering raw keys.
-- =====================================================================
INSERT INTO dos.dynamic_ui_i18n_keys (module_code, key_path, en, ar)
VALUES
  -- page titles + subtitles
  ('dauth','dauth.page.overview.title',    'DAuth — Identity & Access',           'دي-أوث — الهوية والوصول'),
  ('dauth','dauth.page.overview.subtitle', 'Identity, sessions, MFA, and SoD',    'الهوية والجلسات والتحقق متعدد العوامل وفصل المهام'),
  ('dauth','dauth.page.users.title',       'Users',                               'المستخدمون'),
  ('dauth','dauth.page.users.subtitle',    'Directory of platform users',         'دليل مستخدمي المنصة'),
  ('dauth','dauth.page.roles.title',       'Roles',                               'الأدوار'),
  ('dauth','dauth.page.roles.subtitle',    'Role catalog and bindings',           'كتالوج الأدوار والربط'),
  ('dauth','dauth.page.perms.title',       'Permissions',                         'الصلاحيات'),
  ('dauth','dauth.page.perms.subtitle',    'Permission catalog',                  'كتالوج الصلاحيات'),
  ('dauth','dauth.page.audit.title',       'Audit',                               'التدقيق'),
  ('dauth','dauth.page.audit.subtitle',    'Identity and access audit trail',     'سجل تدقيق الهوية والوصول'),
  -- KPI labels
  ('dauth','dauth.kpi.users.total',        'Total users',                         'إجمالي المستخدمين'),
  ('dauth','dauth.kpi.roles.total',        'Total roles',                         'إجمالي الأدوار'),
  ('dauth','dauth.kpi.permissions.total',  'Total permissions',                   'إجمالي الصلاحيات'),
  ('dauth','dauth.kpi.mfa.coverage',       'MFA coverage',                        'تغطية التحقق متعدد العوامل'),
  ('dauth','dauth.kpi.sessions.active',    'Active sessions',                     'الجلسات النشطة'),
  -- action labels
  ('dauth','dauth.action.open_users',      'Open users',                          'فتح المستخدمين'),
  ('dauth','dauth.action.create_user',     'Create user',                         'إنشاء مستخدم'),
  ('dauth','dauth.action.invite_user',     'Invite user',                         'دعوة مستخدم'),
  ('dauth','dauth.action.create_role',     'Create role',                         'إنشاء دور'),
  ('dauth','dauth.action.sync_perms',      'Sync permissions',                    'مزامنة الصلاحيات'),
  ('dauth','dauth.action.export_audit',    'Export audit',                        'تصدير التدقيق')
ON CONFLICT (module_code, key_path) DO UPDATE
   SET en = EXCLUDED.en,
       ar = EXCLUDED.ar;

-- =====================================================================
-- 7. Post-flight: enforce Hard Gate on the seeded routes.
-- =====================================================================
DO $$
DECLARE
  bad INTEGER;
  total INTEGER;
BEGIN
  -- every dauth route must have page_type, layout, kpi_scope, title_key
  SELECT COUNT(*) INTO bad
    FROM dos.dynamic_ui_routes
   WHERE module_code = 'dauth' AND tenant_id IS NULL
     AND (page_type IS NULL OR layout IS NULL OR kpi_scope IS NULL OR title_key IS NULL);
  IF bad > 0 THEN
    RAISE EXCEPTION
      'Hard Gate violation: % dauth routes missing page_type/layout/kpi_scope/title_key', bad;
  END IF;

  SELECT COUNT(*) INTO total
    FROM dos.dynamic_ui_routes
   WHERE module_code = 'dauth' AND tenant_id IS NULL;
  IF total < 5 THEN
    RAISE EXCEPTION 'dauth route count below baseline (got %, want >=5)', total;
  END IF;

  -- non-overview routes must NOT carry overview KPIs (kpi_scope='module-overview' only on overview).
  SELECT COUNT(*) INTO bad
    FROM dos.dynamic_ui_routes
   WHERE module_code = 'dauth' AND tenant_id IS NULL
     AND page_type <> 'overview'
     AND kpi_scope = 'module-overview';
  IF bad > 0 THEN
    RAISE EXCEPTION
      'Hard Gate violation: % non-overview dauth routes carry module-overview KPIs', bad;
  END IF;
END $$;

COMMIT;
