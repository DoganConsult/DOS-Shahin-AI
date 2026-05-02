-- =====================================================================
-- DAuth experience layer (20260502_0146) — Wave W9 (vertical slice 1/9, depth)
--
-- Per docs/DOS-AIO-Specs/dynamic-ui-enrollment-page-experience-widgets-spec.md
-- closes the following gaps for module 'dauth' only:
--   §7   widgets (signature widget per page)
--   §27  page archetype binding via signature_widget on each route
--   §26.1 page mastheads     (new dos.dynamic_ui_page_headers)
--   §26.3 smart-grid columns (new dos.dynamic_ui_grid_columns)
--   §26.6 AI recommendation cards (new dos.dynamic_ui_ai_tips)
--   §26.10 audit timeline binding (timeline widget on /audit)
--   §18.1 command-palette actions (existing table)
--   §18.1 search scopes           (existing table)
--
-- 6NF discipline: every multi-valued attribute lives in its own row.
-- New tables expose only scalar columns; jsonb is reserved for opaque
-- per-cell formatter blobs (single-valued).
-- =====================================================================
BEGIN;

-- ── 0. Pre-flight: dauth must be enrolled (W1) and have routes (W8) ──
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n
    FROM dos.dynamic_ui_routes
   WHERE module_code='dauth' AND tenant_id IS NULL;
  IF n < 5 THEN
    RAISE EXCEPTION 'W9 requires W8 dauth routes seeded first (got %)', n;
  END IF;
END $$;

-- =====================================================================
-- 1. New catalog tables (platform-default, tenant-overridable).
-- =====================================================================

-- 1a. Page mastheads — §26.1
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_page_headers (
  tenant_id        VARCHAR(80)  NOT NULL DEFAULT '',
  module_code      VARCHAR(100) NOT NULL REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  route            VARCHAR(300) NOT NULL,
  variant          VARCHAR(40)  NOT NULL DEFAULT 'standard'
                   CHECK (variant IN ('standard','hero','compact','split')),
  eyebrow_key      VARCHAR(200),
  title_key        VARCHAR(200) NOT NULL,
  subtitle_key     VARCHAR(200),
  badge_key        VARCHAR(200),
  cta_action_id    VARCHAR(120),
  show_breadcrumb  BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, module_code, route)
);
CREATE INDEX IF NOT EXISTS ix_dyn_page_hdr_module ON dos.dynamic_ui_page_headers(module_code, route);

-- 1b. Smart-grid columns — §26.3 (one column per row, 6NF)
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_grid_columns (
  tenant_id        VARCHAR(80)  NOT NULL DEFAULT '',
  module_code      VARCHAR(100) NOT NULL REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  route            VARCHAR(300) NOT NULL,
  column_key       VARCHAR(120) NOT NULL,
  label_i18n_key   VARCHAR(200) NOT NULL,
  data_path        VARCHAR(200) NOT NULL,
  data_type        VARCHAR(40)  NOT NULL
                   CHECK (data_type IN ('string','number','boolean','date','datetime','enum','badge','user','avatar','json')),
  formatter_key    VARCHAR(120),
  width_px         INTEGER,
  align            VARCHAR(20)  NOT NULL DEFAULT 'start'
                   CHECK (align IN ('start','center','end')),
  sortable         BOOLEAN      NOT NULL DEFAULT TRUE,
  filterable       BOOLEAN      NOT NULL DEFAULT FALSE,
  hidden_default   BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order       INTEGER      NOT NULL DEFAULT 100,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (tenant_id, module_code, route, column_key)
);
CREATE INDEX IF NOT EXISTS ix_dyn_grid_col_route ON dos.dynamic_ui_grid_columns(module_code, route);

-- 1c. AI tips / recommendation cards — §26.6
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_ai_tips (
  tenant_id        VARCHAR(80)  NOT NULL DEFAULT '',
  module_code      VARCHAR(100) NOT NULL REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  route            VARCHAR(300) NOT NULL DEFAULT '',
  tip_code         VARCHAR(120) NOT NULL,
  severity         VARCHAR(20)  NOT NULL DEFAULT 'info'
                   CHECK (severity IN ('info','success','warning','danger')),
  title_key        VARCHAR(200) NOT NULL,
  body_key         VARCHAR(200) NOT NULL,
  cta_label_key    VARCHAR(200),
  cta_route        VARCHAR(300),
  cta_action_id    VARCHAR(120),
  audience_role    VARCHAR(80),
  source           VARCHAR(40)  NOT NULL DEFAULT 'rule'
                   CHECK (source IN ('rule','heuristic','llm','agent')),
  sort_order       INTEGER      NOT NULL DEFAULT 100,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (tenant_id, module_code, route, tip_code)
);
CREATE INDEX IF NOT EXISTS ix_dyn_ai_tips_module ON dos.dynamic_ui_ai_tips(module_code, route);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON dos.dynamic_ui_page_headers,
     dos.dynamic_ui_grid_columns,
     dos.dynamic_ui_ai_tips
  TO dos_app, dos_auth;

-- =====================================================================
-- 2. Component registry — register the dauth signature widgets
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry (component_key, schema_version, metadata)
VALUES
  ('command-center.identity-summary', '1', '{"archetype":"overview","kind":"command-center"}'::jsonb),
  ('smart-grid.users',                '1', '{"archetype":"list","kind":"smart-grid"}'::jsonb),
  ('smart-grid.roles',                '1', '{"archetype":"list","kind":"smart-grid"}'::jsonb),
  ('matrix.permissions',              '1', '{"archetype":"list","kind":"matrix"}'::jsonb),
  ('audit-timeline.dauth',            '1', '{"archetype":"audit","kind":"timeline"}'::jsonb)
ON CONFLICT (component_key) DO UPDATE
   SET metadata = EXCLUDED.metadata;

-- =====================================================================
-- 3. Pin signature_widget on each dauth route (§27 archetype binding)
-- =====================================================================
UPDATE dos.dynamic_ui_routes
   SET signature_widget = CASE path_pattern
       WHEN '/admin/dauth'             THEN 'command-center.identity-summary'
       WHEN '/admin/dauth/users'       THEN 'smart-grid.users'
       WHEN '/admin/dauth/roles'       THEN 'smart-grid.roles'
       WHEN '/admin/dauth/permissions' THEN 'matrix.permissions'
       WHEN '/admin/dauth/audit'       THEN 'audit-timeline.dauth'
   END
 WHERE module_code='dauth' AND tenant_id IS NULL;

-- =====================================================================
-- 4. Widgets — signature widget per page (§7) + supporting context-rail
-- =====================================================================
INSERT INTO dos.dynamic_ui_widgets
  (tenant_id, module_code, route, widget_key, zone, permission,
   sort_order, is_signature, is_active, config)
SELECT NULL, 'dauth', x.route, x.widget_key, x.zone, x.perm,
       x.sort, x.signature, TRUE, x.cfg::jsonb
  FROM (VALUES
    -- overview
    ('/admin/dauth',             'command-center.identity-summary', 'signature',    'platform.admin.read',         100, TRUE,  '{"kpiScope":"module-overview"}'),
    ('/admin/dauth',             'recommendation-card.identity',    'side',         'platform.admin.read',         200, FALSE, '{"source":"ai-tips"}'),
    -- users
    ('/admin/dauth/users',       'smart-grid.users',                'signature',    'platform.user.read',          100, TRUE,  '{"resource":"dauth.resource.users"}'),
    ('/admin/dauth/users',       'context-rail.user-360',           'context-rail', 'platform.user.read',          200, FALSE, '{}'),
    -- roles
    ('/admin/dauth/roles',       'smart-grid.roles',                'signature',    'platform.role.manage',        100, TRUE,  '{"resource":"dauth.resource.roles"}'),
    ('/admin/dauth/roles',       'context-rail.role-coverage',      'context-rail', 'platform.role.manage',        200, FALSE, '{}'),
    -- permissions
    ('/admin/dauth/permissions', 'matrix.permissions',              'signature',    'platform.permission.manage',  100, TRUE,  '{"resource":"dauth.resource.perms"}'),
    -- audit
    ('/admin/dauth/audit',       'audit-timeline.dauth',            'signature',    'platform.audit.read',         100, TRUE,  '{"resource":"dauth.resource.audit"}')
  ) AS x(route, widget_key, zone, perm, sort, signature, cfg)
ON CONFLICT (tenant_id, module_code, route, widget_key) DO UPDATE
   SET zone         = EXCLUDED.zone,
       permission   = EXCLUDED.permission,
       sort_order   = EXCLUDED.sort_order,
       is_signature = EXCLUDED.is_signature,
       config       = EXCLUDED.config,
       is_active    = TRUE;

-- =====================================================================
-- 5. Page mastheads — §26.1 (one row per route)
-- =====================================================================
INSERT INTO dos.dynamic_ui_page_headers
  (tenant_id, module_code, route, variant, eyebrow_key, title_key,
   subtitle_key, badge_key, cta_action_id, show_breadcrumb, is_active)
VALUES
  ('','dauth','/admin/dauth',             'hero',     'dauth.eyebrow.platform',  'dauth.page.overview.title', 'dauth.page.overview.subtitle', 'dauth.badge.live',     'open-users',     FALSE, TRUE),
  ('','dauth','/admin/dauth/users',       'standard', 'dauth.eyebrow.directory', 'dauth.page.users.title',    'dauth.page.users.subtitle',    NULL,                   'create-user',    TRUE,  TRUE),
  ('','dauth','/admin/dauth/roles',       'standard', 'dauth.eyebrow.directory', 'dauth.page.roles.title',    'dauth.page.roles.subtitle',    NULL,                   'create-role',    TRUE,  TRUE),
  ('','dauth','/admin/dauth/permissions', 'standard', 'dauth.eyebrow.directory', 'dauth.page.perms.title',    'dauth.page.perms.subtitle',    NULL,                   'sync-perms',     TRUE,  TRUE),
  ('','dauth','/admin/dauth/audit',       'compact',  'dauth.eyebrow.forensic',  'dauth.page.audit.title',    'dauth.page.audit.subtitle',    NULL,                   'export-audit',   TRUE,  TRUE)
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
   SET variant         = EXCLUDED.variant,
       eyebrow_key     = EXCLUDED.eyebrow_key,
       title_key       = EXCLUDED.title_key,
       subtitle_key    = EXCLUDED.subtitle_key,
       badge_key       = EXCLUDED.badge_key,
       cta_action_id   = EXCLUDED.cta_action_id,
       show_breadcrumb = EXCLUDED.show_breadcrumb,
       is_active       = TRUE;

-- =====================================================================
-- 6. Smart-grid columns — §26.3 (users / roles / permissions / audit)
-- =====================================================================
INSERT INTO dos.dynamic_ui_grid_columns
  (tenant_id, module_code, route, column_key, label_i18n_key, data_path,
   data_type, formatter_key, width_px, align, sortable, filterable,
   hidden_default, sort_order, is_active)
VALUES
  -- users grid (8 columns)
  ('','dauth','/admin/dauth/users','avatar',     'dauth.col.user.avatar',   'avatarUrl',     'avatar', NULL,             56,  'center','f','f','f', 100, TRUE),
  ('','dauth','/admin/dauth/users','full_name',  'dauth.col.user.name',     'displayName',   'string', NULL,             220, 'start', 't','t','f', 200, TRUE),
  ('','dauth','/admin/dauth/users','email',      'dauth.col.user.email',    'email',         'string', NULL,             260, 'start', 't','t','f', 300, TRUE),
  ('','dauth','/admin/dauth/users','role',       'dauth.col.user.role',     'roleCode',      'badge',  'role-pill',      160, 'start', 't','t','f', 400, TRUE),
  ('','dauth','/admin/dauth/users','status',     'dauth.col.user.status',   'status',        'enum',   'status-pill',    120, 'start', 't','t','f', 500, TRUE),
  ('','dauth','/admin/dauth/users','mfa',        'dauth.col.user.mfa',      'mfaEnabled',    'boolean','bool-pill',      90,  'center','f','t','f', 600, TRUE),
  ('','dauth','/admin/dauth/users','last_login', 'dauth.col.user.last',     'lastLoginAt',   'datetime','rel-time',      170, 'start', 't','f','f', 700, TRUE),
  ('','dauth','/admin/dauth/users','created_at', 'dauth.col.user.created',  'createdAt',     'datetime','rel-time',      170, 'start', 't','f','t', 800, TRUE),
  -- roles grid (5 columns)
  ('','dauth','/admin/dauth/roles','code',       'dauth.col.role.code',     'roleCode',      'string', NULL,             200, 'start', 't','t','f', 100, TRUE),
  ('','dauth','/admin/dauth/roles','name',       'dauth.col.role.name',     'displayName',   'string', NULL,             240, 'start', 't','t','f', 200, TRUE),
  ('','dauth','/admin/dauth/roles','members',    'dauth.col.role.members',  'memberCount',   'number', 'count-pill',     120, 'end',   't','f','f', 300, TRUE),
  ('','dauth','/admin/dauth/roles','perms',      'dauth.col.role.perms',    'permissionCount','number','count-pill',     120, 'end',   't','f','f', 400, TRUE),
  ('','dauth','/admin/dauth/roles','scope',      'dauth.col.role.scope',    'scope',         'enum',   'scope-pill',     140, 'start', 't','t','f', 500, TRUE),
  -- permissions grid (4 columns)
  ('','dauth','/admin/dauth/permissions','code', 'dauth.col.perm.code',     'permissionCode','string', NULL,             280, 'start', 't','t','f', 100, TRUE),
  ('','dauth','/admin/dauth/permissions','title','dauth.col.perm.title',    'displayName',   'string', NULL,             280, 'start', 't','t','f', 200, TRUE),
  ('','dauth','/admin/dauth/permissions','risk', 'dauth.col.perm.risk',     'riskLevel',     'enum',   'risk-pill',      120, 'center','t','t','f', 300, TRUE),
  ('','dauth','/admin/dauth/permissions','rolesUsing','dauth.col.perm.roles','rolesUsing',   'number', 'count-pill',     130, 'end',   't','f','f', 400, TRUE),
  -- audit grid (5 columns)
  ('','dauth','/admin/dauth/audit','time',       'dauth.col.audit.time',    'timestamp',     'datetime','rel-time',      170, 'start', 't','t','f', 100, TRUE),
  ('','dauth','/admin/dauth/audit','actor',      'dauth.col.audit.actor',   'actorEmail',    'user',   NULL,             220, 'start', 't','t','f', 200, TRUE),
  ('','dauth','/admin/dauth/audit','action',     'dauth.col.audit.action',  'action',        'string', NULL,             200, 'start', 't','t','f', 300, TRUE),
  ('','dauth','/admin/dauth/audit','target',     'dauth.col.audit.target',  'targetEntity',  'string', NULL,             220, 'start', 't','f','f', 400, TRUE),
  ('','dauth','/admin/dauth/audit','result',     'dauth.col.audit.result',  'result',        'enum',   'status-pill',    120, 'center','t','t','f', 500, TRUE)
ON CONFLICT (tenant_id, module_code, route, column_key) DO UPDATE
   SET label_i18n_key = EXCLUDED.label_i18n_key,
       data_path      = EXCLUDED.data_path,
       data_type      = EXCLUDED.data_type,
       formatter_key  = EXCLUDED.formatter_key,
       width_px       = EXCLUDED.width_px,
       align          = EXCLUDED.align,
       sortable       = EXCLUDED.sortable,
       filterable     = EXCLUDED.filterable,
       hidden_default = EXCLUDED.hidden_default,
       sort_order     = EXCLUDED.sort_order,
       is_active      = TRUE;

-- =====================================================================
-- 7. Command-palette actions — §18.1 (dauth)
-- =====================================================================
INSERT INTO dos.dynamic_ui_command_palette_actions
  (action_code, label_i18n_key, shortcut, module_code, route, intent_code, sort_order, registry_status)
VALUES
  ('dauth.cmd.open_users',      'dauth.cmd.open_users',      'g u', 'dauth', '/admin/dauth/users',       'navigate', 100, 'active'),
  ('dauth.cmd.open_roles',      'dauth.cmd.open_roles',      'g r', 'dauth', '/admin/dauth/roles',       'navigate', 200, 'active'),
  ('dauth.cmd.open_perms',      'dauth.cmd.open_perms',      'g p', 'dauth', '/admin/dauth/permissions', 'navigate', 300, 'active'),
  ('dauth.cmd.open_audit',      'dauth.cmd.open_audit',      'g a', 'dauth', '/admin/dauth/audit',       'navigate', 400, 'active'),
  ('dauth.cmd.create_user',     'dauth.cmd.create_user',     'n u', 'dauth', '/admin/dauth/users',       'create',   500, 'active'),
  ('dauth.cmd.create_role',     'dauth.cmd.create_role',     'n r', 'dauth', '/admin/dauth/roles',       'create',   600, 'active'),
  ('dauth.cmd.export_audit',    'dauth.cmd.export_audit',    NULL,  'dauth', '/admin/dauth/audit',       'export',   700, 'active')
ON CONFLICT (action_code) DO UPDATE
   SET label_i18n_key = EXCLUDED.label_i18n_key,
       shortcut       = EXCLUDED.shortcut,
       module_code    = EXCLUDED.module_code,
       route          = EXCLUDED.route,
       intent_code    = EXCLUDED.intent_code,
       sort_order     = EXCLUDED.sort_order,
       registry_status= 'active';

-- =====================================================================
-- 8. Search scopes — §18.1 (dauth)
-- =====================================================================
INSERT INTO dos.dynamic_ui_search_scopes
  (scope_code, label_i18n_key, module_code, resource_key, result_route, sort_order, registry_status)
VALUES
  ('dauth.search.users',  'dauth.search.users',  'dauth', 'dauth.resource.users', '/admin/dauth/users',       100, 'active'),
  ('dauth.search.roles',  'dauth.search.roles',  'dauth', 'dauth.resource.roles', '/admin/dauth/roles',       200, 'active'),
  ('dauth.search.perms',  'dauth.search.perms',  'dauth', 'dauth.resource.perms', '/admin/dauth/permissions', 300, 'active'),
  ('dauth.search.audit',  'dauth.search.audit',  'dauth', 'dauth.resource.audit', '/admin/dauth/audit',       400, 'active')
ON CONFLICT (scope_code) DO UPDATE
   SET label_i18n_key = EXCLUDED.label_i18n_key,
       module_code    = EXCLUDED.module_code,
       resource_key   = EXCLUDED.resource_key,
       result_route   = EXCLUDED.result_route,
       sort_order     = EXCLUDED.sort_order,
       registry_status= 'active';

-- =====================================================================
-- 9. AI tips — §26.6 (dauth overview recommendations)
-- =====================================================================
INSERT INTO dos.dynamic_ui_ai_tips
  (tenant_id, module_code, route, tip_code, severity, title_key, body_key,
   cta_label_key, cta_route, cta_action_id, audience_role, source, sort_order, is_active)
VALUES
  ('','dauth','/admin/dauth','tip.mfa_coverage_low',  'warning','dauth.tip.mfa.title',     'dauth.tip.mfa.body',     'dauth.tip.mfa.cta',     '/admin/dauth/users',       NULL, 'platform_admin', 'rule',      100, TRUE),
  ('','dauth','/admin/dauth','tip.stale_sessions',    'info',   'dauth.tip.stale.title',   'dauth.tip.stale.body',   'dauth.tip.stale.cta',   '/admin/dauth/audit',       NULL, 'platform_admin', 'heuristic', 200, TRUE),
  ('','dauth','/admin/dauth','tip.unused_permissions','info',   'dauth.tip.unused.title',  'dauth.tip.unused.body',  'dauth.tip.unused.cta',  '/admin/dauth/permissions', NULL, 'platform_admin', 'llm',       300, TRUE)
ON CONFLICT (tenant_id, module_code, route, tip_code) DO UPDATE
   SET severity      = EXCLUDED.severity,
       title_key     = EXCLUDED.title_key,
       body_key      = EXCLUDED.body_key,
       cta_label_key = EXCLUDED.cta_label_key,
       cta_route     = EXCLUDED.cta_route,
       audience_role = EXCLUDED.audience_role,
       source        = EXCLUDED.source,
       sort_order    = EXCLUDED.sort_order,
       is_active     = TRUE;

-- =====================================================================
-- 10. i18n keys for every label introduced above (EN+AR)
-- =====================================================================
INSERT INTO dos.dynamic_ui_i18n_keys (module_code, key_path, en, ar) VALUES
  ('dauth','dauth.eyebrow.platform',   'Platform identity',          'هوية المنصة'),
  ('dauth','dauth.eyebrow.directory',  'Directory',                  'الدليل'),
  ('dauth','dauth.eyebrow.forensic',   'Forensic',                   'تحقيقي'),
  ('dauth','dauth.badge.live',         'Live',                       'مباشر'),
  -- users grid
  ('dauth','dauth.col.user.avatar',    '',                           ''),
  ('dauth','dauth.col.user.name',      'Name',                       'الاسم'),
  ('dauth','dauth.col.user.email',     'Email',                      'البريد الإلكتروني'),
  ('dauth','dauth.col.user.role',      'Role',                       'الدور'),
  ('dauth','dauth.col.user.status',    'Status',                     'الحالة'),
  ('dauth','dauth.col.user.mfa',       'MFA',                        'التحقق متعدد العوامل'),
  ('dauth','dauth.col.user.last',      'Last login',                 'آخر تسجيل دخول'),
  ('dauth','dauth.col.user.created',   'Created',                    'تاريخ الإنشاء'),
  -- roles grid
  ('dauth','dauth.col.role.code',      'Code',                       'الرمز'),
  ('dauth','dauth.col.role.name',      'Name',                       'الاسم'),
  ('dauth','dauth.col.role.members',   'Members',                    'الأعضاء'),
  ('dauth','dauth.col.role.perms',     'Permissions',                'الصلاحيات'),
  ('dauth','dauth.col.role.scope',     'Scope',                      'النطاق'),
  -- permissions grid
  ('dauth','dauth.col.perm.code',      'Permission code',            'رمز الصلاحية'),
  ('dauth','dauth.col.perm.title',     'Title',                      'العنوان'),
  ('dauth','dauth.col.perm.risk',      'Risk',                       'الخطورة'),
  ('dauth','dauth.col.perm.roles',     'Used by',                    'يُستخدم في'),
  -- audit grid
  ('dauth','dauth.col.audit.time',     'Time',                       'الوقت'),
  ('dauth','dauth.col.audit.actor',    'Actor',                      'المنفِّذ'),
  ('dauth','dauth.col.audit.action',   'Action',                     'الإجراء'),
  ('dauth','dauth.col.audit.target',   'Target',                     'الهدف'),
  ('dauth','dauth.col.audit.result',   'Result',                     'النتيجة'),
  -- command palette
  ('dauth','dauth.cmd.open_users',     'Open users',                 'فتح المستخدمين'),
  ('dauth','dauth.cmd.open_roles',     'Open roles',                 'فتح الأدوار'),
  ('dauth','dauth.cmd.open_perms',     'Open permissions',           'فتح الصلاحيات'),
  ('dauth','dauth.cmd.open_audit',     'Open audit',                 'فتح التدقيق'),
  ('dauth','dauth.cmd.create_user',    'New user',                   'مستخدم جديد'),
  ('dauth','dauth.cmd.create_role',    'New role',                   'دور جديد'),
  ('dauth','dauth.cmd.export_audit',   'Export audit pack',          'تصدير حزمة التدقيق'),
  -- search scopes
  ('dauth','dauth.search.users',       'Users',                      'المستخدمون'),
  ('dauth','dauth.search.roles',       'Roles',                      'الأدوار'),
  ('dauth','dauth.search.perms',       'Permissions',                'الصلاحيات'),
  ('dauth','dauth.search.audit',       'Audit events',               'أحداث التدقيق'),
  -- AI tips
  ('dauth','dauth.tip.mfa.title',      'MFA coverage is below target','تغطية التحقق متعدد العوامل أقل من المستهدف'),
  ('dauth','dauth.tip.mfa.body',       'Enforce MFA on the remaining accounts to reduce account-takeover risk.','فعِّل التحقق متعدد العوامل على الحسابات المتبقية لتقليل مخاطر الاستيلاء على الحسابات.'),
  ('dauth','dauth.tip.mfa.cta',        'Review users without MFA',   'مراجعة المستخدمين بدون التحقق متعدد العوامل'),
  ('dauth','dauth.tip.stale.title',    'Long-lived sessions detected','رُصدت جلسات طويلة الأمد'),
  ('dauth','dauth.tip.stale.body',     'Sessions older than 14 days were observed. Consider rotating tokens.','رُصدت جلسات أقدم من 14 يومًا. يُنصح بتدوير الرموز.'),
  ('dauth','dauth.tip.stale.cta',      'Open audit',                 'فتح التدقيق'),
  ('dauth','dauth.tip.unused.title',   'Unused permissions',         'صلاحيات غير مُستخدمة'),
  ('dauth','dauth.tip.unused.body',    'Permissions assigned but unused for 90+ days are candidates for removal.','صلاحيات ممنوحة وغير مُستخدمة لأكثر من 90 يومًا مرشحة للإزالة.'),
  ('dauth','dauth.tip.unused.cta',     'Open permissions',           'فتح الصلاحيات')
ON CONFLICT (module_code, key_path) DO UPDATE
   SET en = EXCLUDED.en,
       ar = EXCLUDED.ar;

-- =====================================================================
-- 11. Post-flight Hard Gates (§7, §27, §26)
-- =====================================================================
DO $$
DECLARE bad INTEGER;
BEGIN
  -- §27 every dauth route MUST have a signature_widget after this migration
  SELECT COUNT(*) INTO bad FROM dos.dynamic_ui_routes
   WHERE module_code='dauth' AND tenant_id IS NULL AND signature_widget IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'W9 §27: % dauth routes missing signature_widget', bad;
  END IF;

  -- §7 every dauth route MUST have at least one signature widget row
  SELECT COUNT(*) INTO bad
    FROM dos.dynamic_ui_routes r
    LEFT JOIN dos.dynamic_ui_widgets w
           ON w.tenant_id IS NULL
          AND w.module_code='dauth'
          AND w.route = r.path_pattern
          AND w.is_signature = TRUE
   WHERE r.module_code='dauth' AND r.tenant_id IS NULL
     AND w.widget_key IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'W9 §7: % dauth routes missing signature widget row', bad;
  END IF;

  -- §26.1 every dauth route MUST have a page header
  SELECT COUNT(*) INTO bad
    FROM dos.dynamic_ui_routes r
    LEFT JOIN dos.dynamic_ui_page_headers h
           ON h.tenant_id = ''
          AND h.module_code='dauth'
          AND h.route = r.path_pattern
   WHERE r.module_code='dauth' AND r.tenant_id IS NULL
     AND h.route IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'W9 §26.1: % dauth routes missing page header', bad;
  END IF;

  -- §26.3 every list page MUST have grid columns (>= 4)
  SELECT COUNT(*) INTO bad
    FROM dos.dynamic_ui_routes r
   WHERE r.module_code='dauth' AND r.tenant_id IS NULL
     AND r.page_type IN ('list','audit')
     AND (
       SELECT COUNT(*) FROM dos.dynamic_ui_grid_columns g
        WHERE g.tenant_id='' AND g.module_code='dauth'
          AND g.route = r.path_pattern AND g.is_active = TRUE
     ) < 4;
  IF bad > 0 THEN
    RAISE EXCEPTION 'W9 §26.3: % dauth list/audit pages with <4 grid columns', bad;
  END IF;

  -- 6NF re-check on the new tables
  SELECT COUNT(*) INTO bad
    FROM information_schema.columns
   WHERE table_schema='dos'
     AND table_name IN ('dynamic_ui_page_headers','dynamic_ui_grid_columns','dynamic_ui_ai_tips')
     AND data_type='ARRAY';
  IF bad > 0 THEN
    RAISE EXCEPTION 'W9 6NF: ARRAY columns detected on new tables';
  END IF;
END $$;

COMMIT;
