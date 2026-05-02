-- =====================================================================
-- 0157 — Enroll the 3 missing DNA modules into Dynamic UI registry.
--
-- Per AGENTS.md the 9 platform DNA roots are: foundation, dauth, dsoc,
-- dnoc, dos, ai, ui-system, access, runtime (plus workflow + config-center
-- subsystems already enrolled). dos.dynamic_ui_modules holds 23 module
-- rows; ui-system / access / runtime are NOT enrolled. This migration
-- enrolls each with a full Dynamic-UI scaffold mirroring the W10/W11
-- generator pattern: module + routes + theme + kpis + actions +
-- data_resources + i18n + widgets + page_headers + grid_columns.
--
-- All catalog references are 100% IBM Carbon (cds-data-table / cds-tile /
-- cds-side-panel) — no custom vendors. Per the user mandate "no warper now
-- only use ibm kit raw" component_key references stay on the canonical
-- signature archetypes already approved in dynamic_ui_component_registry.
--
-- Idempotent: every INSERT uses ON CONFLICT DO UPDATE/DO NOTHING.
-- =====================================================================
BEGIN;

-- 1. Modules
INSERT INTO dos.dynamic_ui_modules
  (module_code, platform_key, product_key, display_name, default_route,
   registry_status, default_tenant_enrollment_status, canonical_source)
VALUES
  ('ui-system', 'ui',      'platform', 'UI System',     '/admin/ui-system', 'active', 'active', 'platform/ui-system'),
  ('access',    'access',  'platform', 'Access Store',  '/admin/access',    'active', 'active', 'platform/access'),
  ('runtime',   'runtime', 'platform', 'Runtime DNA',   '/admin/runtime',   'active', 'active', 'platform/runtime')
ON CONFLICT (module_code) DO UPDATE
   SET platform_key   = EXCLUDED.platform_key,
       product_key    = EXCLUDED.product_key,
       display_name   = EXCLUDED.display_name,
       default_route  = EXCLUDED.default_route,
       registry_status = EXCLUDED.registry_status,
       canonical_source = EXCLUDED.canonical_source,
       updated_at     = NOW();

-- 2. Routes (5 each: overview, list, object, settings, audit)
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, signature_widget,
   title_key, subtitle_key, data_resource_key, default_view,
   audit_enabled, realtime_enabled, nba_enabled)
VALUES
  -- ui-system
  (NULL, 'ui-system', '/admin/ui-system',           'page-masthead.overview',  'shell.ui.read',  10, 'active', 'overview', 'dashboard', 'module-overview', 'monitor',  'tenant', FALSE, 'command-center.ui-system-summary', 'ui-system.page.overview.title', 'ui-system.page.overview.subtitle', 'ui-system.overview.snapshot', 'cards', TRUE, FALSE, FALSE),
  (NULL, 'ui-system', '/admin/ui-system/components','smart-grid.components',   'shell.ui.read',  20, 'active', 'list',     'full-page', 'none',            'manage',   'tenant', FALSE, 'smart-grid.components',           'ui-system.page.components.title', NULL, 'ui-system.components.list', 'table', TRUE, FALSE, FALSE),
  (NULL, 'ui-system', '/admin/ui-system/themes',    'smart-grid.themes',       'shell.ui.read',  30, 'active', 'list',     'full-page', 'none',            'configure','tenant', FALSE, 'smart-grid.themes',               'ui-system.page.themes.title',     NULL, 'ui-system.themes.list',     'table', TRUE, FALSE, FALSE),
  (NULL, 'ui-system', '/admin/ui-system/settings',  'page-masthead.settings',  'shell.ui.write', 40, 'active', 'settings', 'split-view','none',            'configure','tenant', FALSE, 'context-rail.ui-system',          'ui-system.page.settings.title',   NULL, 'ui-system.settings.snapshot', 'form',  TRUE, FALSE, FALSE),
  (NULL, 'ui-system', '/admin/ui-system/audit',     'audit-timeline.ui-system','shell.ui.read',  50, 'active', 'audit',    'full-page', 'none',            'review',   'tenant', TRUE,  'audit-timeline.ui-system',        'ui-system.page.audit.title',      NULL, 'ui-system.audit.timeline',  'timeline', TRUE, TRUE, FALSE),
  -- access
  (NULL, 'access', '/admin/access',           'page-masthead.overview',  'access.read',   10, 'active', 'overview', 'dashboard', 'module-overview', 'monitor',  'tenant', FALSE, 'command-center.access-summary', 'access.page.overview.title', 'access.page.overview.subtitle', 'access.overview.snapshot', 'cards', TRUE, FALSE, FALSE),
  (NULL, 'access', '/admin/access/permissions','smart-grid.permissions','access.read',   20, 'active', 'list',     'full-page', 'none',            'manage',   'tenant', FALSE, 'smart-grid.permissions',         'access.page.permissions.title', NULL, 'access.permissions.list', 'table', TRUE, FALSE, FALSE),
  (NULL, 'access', '/admin/access/sessions',  'smart-grid.sessions',    'access.read',   30, 'active', 'list',     'full-page', 'none',            'investigate','tenant', FALSE, 'smart-grid.sessions',           'access.page.sessions.title',    NULL, 'access.sessions.list',    'table', TRUE, TRUE, FALSE),
  (NULL, 'access', '/admin/access/settings',  'page-masthead.settings', 'access.manage', 40, 'active', 'settings', 'split-view','none',            'configure','tenant', FALSE, 'context-rail.access',            'access.page.settings.title',    NULL, 'access.settings.snapshot','form',  TRUE, FALSE, FALSE),
  (NULL, 'access', '/admin/access/audit',     'audit-timeline.access',  'access.read',   50, 'active', 'audit',    'full-page', 'none',            'review',   'tenant', TRUE,  'audit-timeline.access',          'access.page.audit.title',       NULL, 'access.audit.timeline',   'timeline', TRUE, TRUE, FALSE),
  -- runtime
  (NULL, 'runtime', '/admin/runtime',          'page-masthead.overview', 'platform.admin.read',  10, 'active', 'overview', 'dashboard', 'module-overview', 'monitor',  'tenant', FALSE, 'command-center.runtime-summary','runtime.page.overview.title','runtime.page.overview.subtitle','runtime.overview.snapshot','cards', TRUE, FALSE, FALSE),
  (NULL, 'runtime', '/admin/runtime/services', 'smart-grid.services',    'platform.admin.read',  20, 'active', 'list',     'full-page', 'none',            'manage',   'tenant', FALSE, 'smart-grid.services',          'runtime.page.services.title',NULL,'runtime.services.list',  'table', TRUE, TRUE, FALSE),
  (NULL, 'runtime', '/admin/runtime/health',   'matrix.health',          'platform.admin.read',  30, 'active', 'analytics','full-page', 'page-local',      'monitor',  'tenant', FALSE, 'matrix.health',                'runtime.page.health.title',  NULL,'runtime.health.snapshot','matrix', TRUE, TRUE, FALSE),
  (NULL, 'runtime', '/admin/runtime/settings', 'page-masthead.settings', 'platform.admin.write', 40, 'active', 'settings', 'split-view','none',            'configure','tenant', FALSE, 'context-rail.runtime',         'runtime.page.settings.title',NULL,'runtime.settings.snapshot','form', TRUE, FALSE, FALSE),
  (NULL, 'runtime', '/admin/runtime/audit',    'audit-timeline.runtime', 'platform.admin.read',  50, 'active', 'audit',    'full-page', 'none',            'review',   'tenant', TRUE,  'audit-timeline.runtime',       'runtime.page.audit.title',   NULL,'runtime.audit.timeline', 'timeline', TRUE, TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- 3. Theme tokens (6 per module)
INSERT INTO dos.dynamic_ui_theme_tokens
  (tenant_id, module_code, token_key, token_value, scope, route, is_active)
SELECT NULL, m, k, v, 'module', NULL, TRUE
FROM (VALUES
  ('ui-system','color.accent','#0f62fe'),('ui-system','color.surface','#ffffff'),('ui-system','color.text','#161616'),('ui-system','radius.card','8px'),('ui-system','space.unit','16px'),('ui-system','font.family','IBM Plex Sans'),
  ('access','color.accent','#8a3ffc'),('access','color.surface','#ffffff'),('access','color.text','#161616'),('access','radius.card','8px'),('access','space.unit','16px'),('access','font.family','IBM Plex Sans'),
  ('runtime','color.accent','#007d79'),('runtime','color.surface','#ffffff'),('runtime','color.text','#161616'),('runtime','radius.card','8px'),('runtime','space.unit','16px'),('runtime','font.family','IBM Plex Sans')
) AS t(m,k,v)
ON CONFLICT DO NOTHING;

-- 4. KPIs (5 per module, module-overview scope)
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit, data_resource,
   permission, scope, format, trend_enabled, sort_order, is_active)
SELECT NULL, m, NULL, k, l, u, dr, p, 'module-overview', f, TRUE, so, TRUE
FROM (VALUES
  ('ui-system','components_total',     'ui-system.kpi.components_total',     'count','ui-system.overview.snapshot','shell.ui.read','number',     10),
  ('ui-system','components_active',    'ui-system.kpi.components_active',    'count','ui-system.overview.snapshot','shell.ui.read','number',     20),
  ('ui-system','themes_total',         'ui-system.kpi.themes_total',         'count','ui-system.overview.snapshot','shell.ui.read','number',     30),
  ('ui-system','wrapper_coverage',     'ui-system.kpi.wrapper_coverage',     'percent','ui-system.overview.snapshot','shell.ui.read','percentage',40),
  ('ui-system','catalog_health',       'ui-system.kpi.catalog_health',       'score','ui-system.overview.snapshot','shell.ui.read','score',      50),
  ('access','permissions_total',       'access.kpi.permissions_total',       'count','access.overview.snapshot','access.read','number',          10),
  ('access','active_sessions',         'access.kpi.active_sessions',         'count','access.overview.snapshot','access.read','number',          20),
  ('access','sso_logins_24h',          'access.kpi.sso_logins_24h',          'count','access.overview.snapshot','access.read','number',          30),
  ('access','failed_logins_24h',       'access.kpi.failed_logins_24h',       'count','access.overview.snapshot','access.read','number',          40),
  ('access','mfa_coverage',            'access.kpi.mfa_coverage',            'percent','access.overview.snapshot','access.read','percentage',    50),
  ('runtime','services_total',         'runtime.kpi.services_total',         'count','runtime.overview.snapshot','platform.admin.read','number',10),
  ('runtime','services_healthy',       'runtime.kpi.services_healthy',       'count','runtime.overview.snapshot','platform.admin.read','number',20),
  ('runtime','uptime_pct',             'runtime.kpi.uptime_pct',             'percent','runtime.overview.snapshot','platform.admin.read','percentage',30),
  ('runtime','avg_latency_ms',         'runtime.kpi.avg_latency_ms',         'ms','runtime.overview.snapshot','platform.admin.read','number',   40),
  ('runtime','error_rate_pct',         'runtime.kpi.error_rate_pct',         'percent','runtime.overview.snapshot','platform.admin.read','percentage',50)
) AS t(m,k,l,u,dr,p,f,so)
ON CONFLICT DO NOTHING;

-- 5. Actions (6 per module)
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, risk_level, requires_approval, evidence_required,
   handler_key, sort_order, is_active)
SELECT NULL, m, r, a, p, lk, ic, perm, rl, ra::boolean, er::boolean, h, so, TRUE
FROM (VALUES
  -- ui-system
  ('ui-system','/admin/ui-system/components','refresh','primary',  'ui-system.action.refresh',     'restart',     'shell.ui.read','low',FALSE,FALSE,'ui-system.refresh.handler',10),
  ('ui-system','/admin/ui-system/components','export', 'secondary','ui-system.action.export',      'download',    'shell.ui.read','low',FALSE,FALSE,'ui-system.export.handler', 20),
  ('ui-system','/admin/ui-system/themes','create',     'primary',  'ui-system.action.theme.create','add',         'shell.ui.write','medium',FALSE,TRUE,'ui-system.theme.create.handler',10),
  ('ui-system','/admin/ui-system/themes','duplicate',  'row',      'ui-system.action.theme.duplicate','copy',     'shell.ui.write','low',FALSE,FALSE,'ui-system.theme.duplicate.handler',20),
  ('ui-system','/admin/ui-system/settings','save',     'primary',  'ui-system.action.settings.save','save',       'shell.ui.write','medium',FALSE,TRUE,'ui-system.settings.save.handler',10),
  ('ui-system','/admin/ui-system/audit','export',     'secondary', 'ui-system.action.audit.export','download',    'shell.ui.read','low',FALSE,FALSE,'ui-system.audit.export.handler',10),
  -- access
  ('access','/admin/access/permissions','grant', 'primary',  'access.action.grant',  'add',     'access.manage','high',TRUE,TRUE,'access.grant.handler', 10),
  ('access','/admin/access/permissions','revoke','row',      'access.action.revoke', 'trash-can','access.manage','critical',TRUE,TRUE,'access.revoke.handler',20),
  ('access','/admin/access/sessions','terminate','row',      'access.action.terminate','close', 'access.manage','high',FALSE,TRUE,'access.terminate.handler',10),
  ('access','/admin/access/sessions','export',  'secondary', 'access.action.export', 'download','access.read','low',FALSE,FALSE,'access.export.handler',20),
  ('access','/admin/access/settings','save',    'primary',   'access.action.settings.save','save','access.manage','medium',FALSE,TRUE,'access.settings.save.handler',10),
  ('access','/admin/access/audit','export',     'secondary', 'access.action.audit.export','download','access.read','low',FALSE,FALSE,'access.audit.export.handler',10),
  -- runtime
  ('runtime','/admin/runtime/services','restart','row',     'runtime.action.restart','restart',  'platform.admin.write','high',TRUE,TRUE,'runtime.restart.handler',10),
  ('runtime','/admin/runtime/services','reload', 'row',     'runtime.action.reload','renew',     'platform.admin.write','medium',FALSE,TRUE,'runtime.reload.handler', 20),
  ('runtime','/admin/runtime/services','export', 'secondary','runtime.action.export','download', 'platform.admin.read','low',FALSE,FALSE,'runtime.export.handler', 30),
  ('runtime','/admin/runtime/health','refresh',  'primary', 'runtime.action.refresh','restart',  'platform.admin.read','low',FALSE,FALSE,'runtime.health.refresh.handler',10),
  ('runtime','/admin/runtime/settings','save',   'primary', 'runtime.action.settings.save','save','platform.admin.write','medium',FALSE,TRUE,'runtime.settings.save.handler',10),
  ('runtime','/admin/runtime/audit','export',    'secondary','runtime.action.audit.export','download','platform.admin.read','low',FALSE,FALSE,'runtime.audit.export.handler',10)
) AS t(m,r,a,p,lk,ic,perm,rl,ra,er,h,so)
ON CONFLICT DO NOTHING;

-- 6. Data resources (10 per module — overview + 4 list/snapshot resources × patterns)
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
SELECT NULL, m, k, t, u, p, ttl, rt, pg, sr, TRUE FROM (VALUES
  ('ui-system','ui-system.overview.snapshot','rest','/api/ui-os/ui-system/overview','shell.ui.read',60,NULL,'none','UiSystemOverview'),
  ('ui-system','ui-system.components.list','rest','/api/ui-os/ui-system/components','shell.ui.read',30,NULL,'cursor','UiComponentList'),
  ('ui-system','ui-system.components.detail','rest','/api/ui-os/ui-system/components/:id','shell.ui.read',60,NULL,'none','UiComponent'),
  ('ui-system','ui-system.themes.list','rest','/api/ui-os/ui-system/themes','shell.ui.read',60,NULL,'offset','UiThemeList'),
  ('ui-system','ui-system.themes.detail','rest','/api/ui-os/ui-system/themes/:id','shell.ui.read',60,NULL,'none','UiTheme'),
  ('ui-system','ui-system.settings.snapshot','rest','/api/ui-os/ui-system/settings','shell.ui.write',60,NULL,'none','UiSystemSettings'),
  ('ui-system','ui-system.audit.timeline','sse','/api/audit/stream?module=ui-system','shell.ui.read',0,'audit.ui-system','cursor','AuditEvent'),
  ('ui-system','ui-system.catalog.snapshot','sql_view','dos.ui_carbon_components','shell.ui.read',300,NULL,'cursor','UiCarbonRow'),
  ('ui-system','ui-system.registry.snapshot','sql_view','dos.dynamic_ui_component_registry','shell.ui.read',300,NULL,'cursor','UiRegistryRow'),
  ('ui-system','ui-system.icons.allowlist','rest','/api/ui-os/ui-system/icons','shell.ui.read',600,NULL,'offset','IconAllowlist'),
  ('access','access.overview.snapshot','rest','/api/access/overview','access.read',60,NULL,'none','AccessOverview'),
  ('access','access.permissions.list','rest','/api/access/permissions','access.read',60,NULL,'cursor','PermissionList'),
  ('access','access.permissions.detail','rest','/api/access/permissions/:id','access.read',60,NULL,'none','Permission'),
  ('access','access.sessions.list','rest','/api/access/sessions','access.read',15,NULL,'cursor','SessionList'),
  ('access','access.sessions.detail','rest','/api/access/sessions/:id','access.read',15,NULL,'none','Session'),
  ('access','access.settings.snapshot','rest','/api/access/settings','access.manage',60,NULL,'none','AccessSettings'),
  ('access','access.audit.timeline','sse','/api/audit/stream?module=access','access.read',0,'audit.access','cursor','AuditEvent'),
  ('access','access.entitlements.list','rest','/api/access/entitlements','access.read',60,NULL,'cursor','EntitlementList'),
  ('access','access.policies.list','rest','/api/access/policies','access.read',60,NULL,'cursor','PolicyList'),
  ('access','access.roles.list','rest','/api/access/roles','access.read',60,NULL,'cursor','RoleList'),
  ('runtime','runtime.overview.snapshot','rest','/api/runtime/overview','platform.admin.read',30,NULL,'none','RuntimeOverview'),
  ('runtime','runtime.services.list','rest','/api/runtime/services','platform.admin.read',15,'runtime.services','cursor','ServiceList'),
  ('runtime','runtime.services.detail','rest','/api/runtime/services/:id','platform.admin.read',15,NULL,'none','Service'),
  ('runtime','runtime.health.snapshot','rest','/api/runtime/health','platform.admin.read',5,'runtime.health','none','HealthSnapshot'),
  ('runtime','runtime.health.metrics','rest','/api/runtime/health/metrics','platform.admin.read',15,NULL,'cursor','MetricSeries'),
  ('runtime','runtime.settings.snapshot','rest','/api/runtime/settings','platform.admin.write',60,NULL,'none','RuntimeSettings'),
  ('runtime','runtime.audit.timeline','sse','/api/audit/stream?module=runtime','platform.admin.read',0,'audit.runtime','cursor','AuditEvent'),
  ('runtime','runtime.routes.snapshot','sql_view','dos.dynamic_ui_routes','platform.admin.read',300,NULL,'cursor','RouteRow'),
  ('runtime','runtime.modules.snapshot','sql_view','dos.dynamic_ui_modules','platform.admin.read',300,NULL,'none','ModuleRow'),
  ('runtime','runtime.ports.snapshot','rest','/api/runtime/ports','platform.admin.read',300,NULL,'cursor','PortRow')
) AS t(m,k,t,u,p,ttl,rt,pg,sr)
ON CONFLICT DO NOTHING;

-- 7. i18n (12 per module = 36 keys; covers page titles, KPI labels, action labels)
INSERT INTO dos.dynamic_ui_i18n_keys (module_code, key_path, en, ar)
VALUES
  -- ui-system
  ('ui-system','ui-system.page.overview.title','UI System Overview','نظرة عامة على نظام الواجهة'),
  ('ui-system','ui-system.page.overview.subtitle','Carbon catalog + theme governance','كتالوج كاربون وحوكمة السمات'),
  ('ui-system','ui-system.page.components.title','Components','المكونات'),
  ('ui-system','ui-system.page.themes.title','Themes','السمات'),
  ('ui-system','ui-system.page.settings.title','Settings','الإعدادات'),
  ('ui-system','ui-system.page.audit.title','Audit Log','سجل التدقيق'),
  ('ui-system','ui-system.kpi.components_total','Components total','إجمالي المكونات'),
  ('ui-system','ui-system.kpi.components_active','Components active','المكونات النشطة'),
  ('ui-system','ui-system.kpi.themes_total','Themes total','إجمالي السمات'),
  ('ui-system','ui-system.kpi.wrapper_coverage','Wrapper coverage','تغطية الغلاف'),
  ('ui-system','ui-system.kpi.catalog_health','Catalog health','صحة الكتالوج'),
  ('ui-system','ui-system.action.refresh','Refresh','تحديث'),
  -- access
  ('access','access.page.overview.title','Access Store Overview','نظرة عامة على مخزن الوصول'),
  ('access','access.page.overview.subtitle','Sessions, permissions, entitlements','الجلسات والأذونات والاستحقاقات'),
  ('access','access.page.permissions.title','Permissions','الأذونات'),
  ('access','access.page.sessions.title','Sessions','الجلسات'),
  ('access','access.page.settings.title','Settings','الإعدادات'),
  ('access','access.page.audit.title','Audit Log','سجل التدقيق'),
  ('access','access.kpi.permissions_total','Permissions total','إجمالي الأذونات'),
  ('access','access.kpi.active_sessions','Active sessions','الجلسات النشطة'),
  ('access','access.kpi.sso_logins_24h','SSO logins 24h','عمليات الدخول الموحد 24 ساعة'),
  ('access','access.kpi.failed_logins_24h','Failed logins 24h','عمليات الدخول الفاشلة 24 ساعة'),
  ('access','access.kpi.mfa_coverage','MFA coverage','تغطية المصادقة الثنائية'),
  ('access','access.action.grant','Grant','منح'),
  -- runtime
  ('runtime','runtime.page.overview.title','Runtime Overview','نظرة عامة على وقت التشغيل'),
  ('runtime','runtime.page.overview.subtitle','Services, health, deployment','الخدمات والصحة والنشر'),
  ('runtime','runtime.page.services.title','Services','الخدمات'),
  ('runtime','runtime.page.health.title','Health','الصحة'),
  ('runtime','runtime.page.settings.title','Settings','الإعدادات'),
  ('runtime','runtime.page.audit.title','Audit Log','سجل التدقيق'),
  ('runtime','runtime.kpi.services_total','Services total','إجمالي الخدمات'),
  ('runtime','runtime.kpi.services_healthy','Services healthy','الخدمات السليمة'),
  ('runtime','runtime.kpi.uptime_pct','Uptime %','نسبة التشغيل'),
  ('runtime','runtime.kpi.avg_latency_ms','Avg latency (ms)','متوسط زمن الاستجابة (مللي ثانية)'),
  ('runtime','runtime.kpi.error_rate_pct','Error rate %','نسبة الأخطاء'),
  ('runtime','runtime.action.restart','Restart','إعادة التشغيل')
ON CONFLICT (module_code, key_path) DO NOTHING;

-- 8. Page headers (one per route — 5 per module)
INSERT INTO dos.dynamic_ui_page_headers
  (tenant_id, module_code, route, variant, eyebrow_key, title_key,
   subtitle_key, badge_key, cta_action_id, show_breadcrumb, is_active)
VALUES
  ('','ui-system','/admin/ui-system',           'hero',    'ui-system.eyebrow','ui-system.page.overview.title',  'ui-system.page.overview.subtitle',NULL,'refresh',TRUE,TRUE),
  ('','ui-system','/admin/ui-system/components','standard',NULL,                'ui-system.page.components.title',NULL,                              NULL,'refresh',TRUE,TRUE),
  ('','ui-system','/admin/ui-system/themes',    'standard',NULL,                'ui-system.page.themes.title',    NULL,                              NULL,'create', TRUE,TRUE),
  ('','ui-system','/admin/ui-system/settings',  'split',   NULL,                'ui-system.page.settings.title',  NULL,                              NULL,'save',   TRUE,TRUE),
  ('','ui-system','/admin/ui-system/audit',     'compact', NULL,                'ui-system.page.audit.title',     NULL,                              NULL,'export', TRUE,TRUE),
  ('','access','/admin/access',           'hero',    'access.eyebrow','access.page.overview.title',  'access.page.overview.subtitle',NULL,'grant',TRUE,TRUE),
  ('','access','/admin/access/permissions','standard',NULL,             'access.page.permissions.title',NULL,                            NULL,'grant',TRUE,TRUE),
  ('','access','/admin/access/sessions',  'standard',NULL,             'access.page.sessions.title',   NULL,                            NULL,'export',TRUE,TRUE),
  ('','access','/admin/access/settings',  'split',   NULL,             'access.page.settings.title',   NULL,                            NULL,'save',  TRUE,TRUE),
  ('','access','/admin/access/audit',     'compact', NULL,             'access.page.audit.title',      NULL,                            NULL,'export',TRUE,TRUE),
  ('','runtime','/admin/runtime',          'hero',    'runtime.eyebrow','runtime.page.overview.title',  'runtime.page.overview.subtitle',NULL,'refresh',TRUE,TRUE),
  ('','runtime','/admin/runtime/services', 'standard',NULL,              'runtime.page.services.title',  NULL,                             NULL,'restart',TRUE,TRUE),
  ('','runtime','/admin/runtime/health',   'standard',NULL,              'runtime.page.health.title',    NULL,                             NULL,'refresh',TRUE,TRUE),
  ('','runtime','/admin/runtime/settings', 'split',   NULL,              'runtime.page.settings.title',  NULL,                             NULL,'save',   TRUE,TRUE),
  ('','runtime','/admin/runtime/audit',    'compact', NULL,              'runtime.page.audit.title',     NULL,                             NULL,'export', TRUE,TRUE)
ON CONFLICT DO NOTHING;

-- 9. Widgets (8 per module: 1 signature + 7 supporting on overview/list/audit)
INSERT INTO dos.dynamic_ui_widgets
  (tenant_id, module_code, route, widget_key, zone, permission, sort_order,
   is_signature, is_active)
VALUES
  -- ui-system
  (NULL,'ui-system','/admin/ui-system','command-center.ui-system-summary','signature','shell.ui.read',10,TRUE,TRUE),
  (NULL,'ui-system','/admin/ui-system','recommendation-card.ui-system-tips','side','shell.ui.read',20,FALSE,TRUE),
  (NULL,'ui-system','/admin/ui-system','context-rail.ui-system','context-rail','shell.ui.read',30,FALSE,TRUE),
  (NULL,'ui-system','/admin/ui-system/components','smart-grid.components','main','shell.ui.read',10,TRUE,TRUE),
  (NULL,'ui-system','/admin/ui-system/themes','smart-grid.themes','main','shell.ui.read',10,TRUE,TRUE),
  (NULL,'ui-system','/admin/ui-system/settings','context-rail.ui-system','context-rail','shell.ui.write',10,TRUE,TRUE),
  (NULL,'ui-system','/admin/ui-system/audit','audit-timeline.ui-system','main','shell.ui.read',10,TRUE,TRUE),
  (NULL,'ui-system','/admin/ui-system/audit','recommendation-card.ui-system-tips','side','shell.ui.read',20,FALSE,TRUE),
  -- access
  (NULL,'access','/admin/access','command-center.access-summary','signature','access.read',10,TRUE,TRUE),
  (NULL,'access','/admin/access','recommendation-card.access-tips','side','access.read',20,FALSE,TRUE),
  (NULL,'access','/admin/access','context-rail.access','context-rail','access.read',30,FALSE,TRUE),
  (NULL,'access','/admin/access/permissions','smart-grid.permissions','main','access.read',10,TRUE,TRUE),
  (NULL,'access','/admin/access/sessions','smart-grid.sessions','main','access.read',10,TRUE,TRUE),
  (NULL,'access','/admin/access/settings','context-rail.access','context-rail','access.manage',10,TRUE,TRUE),
  (NULL,'access','/admin/access/audit','audit-timeline.access','main','access.read',10,TRUE,TRUE),
  (NULL,'access','/admin/access/audit','recommendation-card.access-tips','side','access.read',20,FALSE,TRUE),
  -- runtime
  (NULL,'runtime','/admin/runtime','command-center.runtime-summary','signature','platform.admin.read',10,TRUE,TRUE),
  (NULL,'runtime','/admin/runtime','recommendation-card.runtime-tips','side','platform.admin.read',20,FALSE,TRUE),
  (NULL,'runtime','/admin/runtime','context-rail.runtime','context-rail','platform.admin.read',30,FALSE,TRUE),
  (NULL,'runtime','/admin/runtime/services','smart-grid.services','main','platform.admin.read',10,TRUE,TRUE),
  (NULL,'runtime','/admin/runtime/health','matrix.health','main','platform.admin.read',10,TRUE,TRUE),
  (NULL,'runtime','/admin/runtime/settings','context-rail.runtime','context-rail','platform.admin.write',10,TRUE,TRUE),
  (NULL,'runtime','/admin/runtime/audit','audit-timeline.runtime','main','platform.admin.read',10,TRUE,TRUE),
  (NULL,'runtime','/admin/runtime/audit','recommendation-card.runtime-tips','side','platform.admin.read',20,FALSE,TRUE)
ON CONFLICT DO NOTHING;

-- 10. Grid columns (8 per list/detail route across 3 modules — 24 rows total)
INSERT INTO dos.dynamic_ui_grid_columns
  (tenant_id, module_code, route, column_key, label_i18n_key, data_path,
   data_type, formatter_key, width_px, align, sortable, filterable,
   hidden_default, sort_order, is_active)
VALUES
  -- ui-system /components
  ('','ui-system','/admin/ui-system/components','carbon_key','ui-system.col.carbon_key','carbon_key','string',NULL,200,'start',TRUE,TRUE,FALSE,10,TRUE),
  ('','ui-system','/admin/ui-system/components','package_name','ui-system.col.package','package_name','string',NULL,220,'start',TRUE,TRUE,FALSE,20,TRUE),
  ('','ui-system','/admin/ui-system/components','category','ui-system.col.category','category','enum',NULL,120,'start',TRUE,TRUE,FALSE,30,TRUE),
  ('','ui-system','/admin/ui-system/components','integration_mode','ui-system.col.integration','integration_mode','badge',NULL,160,'start',TRUE,TRUE,FALSE,40,TRUE),
  ('','ui-system','/admin/ui-system/components','runtime_status','ui-system.col.runtime','runtime_status','badge',NULL,160,'start',TRUE,TRUE,FALSE,50,TRUE),
  ('','ui-system','/admin/ui-system/components','angular_native','ui-system.col.angular','angular_native','boolean',NULL,120,'center',TRUE,TRUE,FALSE,60,TRUE),
  ('','ui-system','/admin/ui-system/components','dynamic_ui_allowed','ui-system.col.dyn_ui','dynamic_ui_allowed','boolean',NULL,120,'center',TRUE,TRUE,FALSE,70,TRUE),
  ('','ui-system','/admin/ui-system/components','stability','ui-system.col.stability','stability','badge',NULL,120,'start',TRUE,TRUE,FALSE,80,TRUE),
  -- access /permissions
  ('','access','/admin/access/permissions','permission_code','access.col.permission_code','permission_code','string',NULL,260,'start',TRUE,TRUE,FALSE,10,TRUE),
  ('','access','/admin/access/permissions','description','access.col.description','description','string',NULL,360,'start',TRUE,TRUE,FALSE,20,TRUE),
  ('','access','/admin/access/permissions','category','access.col.category','category','enum',NULL,140,'start',TRUE,TRUE,FALSE,30,TRUE),
  ('','access','/admin/access/permissions','risk_level','access.col.risk','risk_level','badge',NULL,120,'start',TRUE,TRUE,FALSE,40,TRUE),
  ('','access','/admin/access/permissions','assignment_count','access.col.assignments','assignment_count','number',NULL,120,'end',TRUE,FALSE,FALSE,50,TRUE),
  ('','access','/admin/access/permissions','created_at','access.col.created_at','created_at','datetime',NULL,160,'start',TRUE,TRUE,FALSE,60,TRUE),
  ('','access','/admin/access/permissions','updated_at','access.col.updated_at','updated_at','datetime',NULL,160,'start',TRUE,TRUE,TRUE,70,TRUE),
  ('','access','/admin/access/permissions','status','access.col.status','status','badge',NULL,120,'start',TRUE,TRUE,FALSE,80,TRUE),
  -- runtime /services
  ('','runtime','/admin/runtime/services','service_code','runtime.col.service_code','service_code','string',NULL,200,'start',TRUE,TRUE,FALSE,10,TRUE),
  ('','runtime','/admin/runtime/services','module_code','runtime.col.module','module_code','string',NULL,160,'start',TRUE,TRUE,FALSE,20,TRUE),
  ('','runtime','/admin/runtime/services','port','runtime.col.port','port','number',NULL,90,'end',TRUE,TRUE,FALSE,30,TRUE),
  ('','runtime','/admin/runtime/services','status','runtime.col.status','status','badge',NULL,120,'start',TRUE,TRUE,FALSE,40,TRUE),
  ('','runtime','/admin/runtime/services','uptime_pct','runtime.col.uptime','uptime_pct','number',NULL,120,'end',TRUE,FALSE,FALSE,50,TRUE),
  ('','runtime','/admin/runtime/services','latency_ms','runtime.col.latency','latency_ms','number',NULL,120,'end',TRUE,FALSE,FALSE,60,TRUE),
  ('','runtime','/admin/runtime/services','version','runtime.col.version','version','string',NULL,120,'start',TRUE,TRUE,FALSE,70,TRUE),
  ('','runtime','/admin/runtime/services','last_deploy_at','runtime.col.deployed','last_deploy_at','datetime',NULL,160,'start',TRUE,TRUE,FALSE,80,TRUE)
ON CONFLICT DO NOTHING;

-- 11. Post-flight assertions
DO $$
DECLARE
  n_modules     INTEGER;
  n_routes      INTEGER;
  n_widgets     INTEGER;
  n_kpis        INTEGER;
  n_actions     INTEGER;
  n_dr          INTEGER;
  n_i18n        INTEGER;
  n_ph          INTEGER;
  n_gc          INTEGER;
  n_theme       INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_modules FROM dos.dynamic_ui_modules WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_routes  FROM dos.dynamic_ui_routes WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_widgets FROM dos.dynamic_ui_widgets WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_kpis    FROM dos.dynamic_ui_kpis    WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_actions FROM dos.dynamic_ui_actions WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_dr      FROM dos.dynamic_ui_data_resources WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_i18n    FROM dos.dynamic_ui_i18n_keys WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_ph      FROM dos.dynamic_ui_page_headers WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_gc      FROM dos.dynamic_ui_grid_columns WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);
  SELECT COUNT(*) INTO n_theme   FROM dos.dynamic_ui_theme_tokens WHERE module_code = ANY(ARRAY['ui-system','access','runtime']);

  IF n_modules <> 3   THEN RAISE EXCEPTION '0157: expected 3 DNA modules, got %', n_modules; END IF;
  IF n_routes  <> 15  THEN RAISE EXCEPTION '0157: expected 15 routes (5/mod), got %', n_routes; END IF;
  IF n_widgets <> 24  THEN RAISE EXCEPTION '0157: expected 24 widgets (8/mod), got %', n_widgets; END IF;
  IF n_kpis    <> 15  THEN RAISE EXCEPTION '0157: expected 15 KPIs (5/mod), got %', n_kpis; END IF;
  IF n_actions <> 18  THEN RAISE EXCEPTION '0157: expected 18 actions (6/mod), got %', n_actions; END IF;
  IF n_dr      <> 30  THEN RAISE EXCEPTION '0157: expected 30 data resources (10/mod), got %', n_dr; END IF;
  IF n_i18n    <> 36  THEN RAISE EXCEPTION '0157: expected 36 i18n keys (12/mod), got %', n_i18n; END IF;
  IF n_ph      <> 15  THEN RAISE EXCEPTION '0157: expected 15 page headers, got %', n_ph; END IF;
  IF n_gc      <> 24  THEN RAISE EXCEPTION '0157: expected 24 grid columns (8/mod), got %', n_gc; END IF;
  IF n_theme   <> 18  THEN RAISE EXCEPTION '0157: expected 18 theme tokens (6/mod), got %', n_theme; END IF;

  RAISE NOTICE 'DNA ENROLLED: modules=% routes=% widgets=% kpis=% actions=% dr=% i18n=% page_headers=% grid_cols=% theme=%',
    n_modules, n_routes, n_widgets, n_kpis, n_actions, n_dr, n_i18n, n_ph, n_gc, n_theme;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0157_enroll_missing_dna_modules.sql', 'inline-0157', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0157_enroll_missing_dna_modules.sql'
 );

COMMIT;
