-- =====================================================================
-- Phase WS-DB-3 — Workspace surface seed (Patch 3 of the workspace-shell
-- production-handover wave plan). Idempotent (ON CONFLICT DO NOTHING).
--
-- Seeds the platform-default rows (tenant_id IS NULL) for every catalog
-- the workspace surface composer reads. Tenant-specific overrides land
-- through `dos.workspace_shell_binding` props or a follow-up tenant-
-- scoped seed; this file establishes the floor.
--
-- Mirrors §10.2 of platform/ui-system/module_ui_os_contract-pack/
-- workspace-db-driven-rewrite-plan.md.
-- =====================================================================
BEGIN;

-- ── Setup steps ──────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_setup_steps
  (tenant_id, step_key, label_key, description_key, icon, route, sort_order, condition_kind)
VALUES
  (NULL, 'profile', 'workspace.setup.profile', NULL, 'user',     '/profile',           10, 'has_user_name'),
  (NULL, 'tenant',  'workspace.setup.tenant',  NULL, 'building', '/tenant-profile',    20, 'has_tenant_id'),
  (NULL, 'modules', 'workspace.setup.modules', NULL, 'package',  '/workspace/modules', 30, 'has_modules'),
  (NULL, 'team',    'workspace.setup.team',    NULL, 'users',    '/tenant-settings',   40, 'has_team_members')
ON CONFLICT DO NOTHING;

-- ── Quick actions ────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_quick_actions
  (tenant_id, surface_key, action_key, eyebrow_key, label_key, description_key, icon, route, sort_order, variant, tone)
VALUES
  (NULL, 'workspace.home', 'profile',         'workspace.action.account',   'workspace.action.account.title',   'workspace.action.account.desc',   'user',     '/profile',         10, 'solid',    'neutral'),
  (NULL, 'workspace.home', 'tenant-profile',  'workspace.action.workspace', 'workspace.action.workspace.title', 'workspace.action.workspace.desc', 'building', '/tenant-profile',  20, 'solid',    'neutral'),
  (NULL, 'workspace.home', 'settings',        'workspace.action.prefs',     'workspace.action.prefs.title',     'workspace.action.prefs.desc',     'settings', '/settings',        30, 'solid',    'neutral'),
  (NULL, 'workspace.home', 'ask-ai',          'workspace.action.copilot',   'workspace.action.copilot.title',   'workspace.action.copilot.desc',   'sparkle',  '/workspace/ai',    40, 'gradient', 'accent'),
  (NULL, 'workspace.home', 'invite',          'workspace.action.invite',    'workspace.action.invite.title',    'workspace.action.invite.desc',    'users',    '/tenant-settings', 50, 'solid',    'neutral'),
  (NULL, 'workspace.home', 'tenant-settings', 'workspace.action.admin',     'workspace.action.admin.title',     'workspace.action.admin.desc',     'tool',     '/tenant-settings', 60, 'solid',    'neutral')
ON CONFLICT DO NOTHING;

-- ── AI tips (workspace composer table) ───────────────────────────────
INSERT INTO dos.dynamic_ui_workspace_ai_tips
  (tenant_id, tip_key, title_key, body_key, cta_label_key, cta_route, icon, condition_kind, priority)
VALUES
  (NULL, 'setup-incomplete', 'workspace.ai.setup.title',  'workspace.ai.setup.body',  'workspace.action.open', '/workspace/setup', 'sparkle', 'setup_below',   10),
  (NULL, 'open-foundation',  'workspace.ai.module.title', 'workspace.ai.module.body', 'workspace.action.open', '/foundation',      'sparkle', 'has_modules',   30),
  (NULL, 'invite-team',      'workspace.ai.invite.title', 'workspace.ai.invite.body', 'workspace.action.open', '/tenant-settings', 'sparkle', 'tenant_admin',  50)
ON CONFLICT DO NOTHING;

-- ── Page header (for /workspace-home hero) ───────────────────────────
INSERT INTO dos.dynamic_ui_workspace_page_headers
  (route_key, variant, density, eyebrow_key, title_key, gradient_token, hairline_visible, hairline_token)
VALUES
  ('/workspace-home', 'signature', 'comfortable', 'workspace.eyebrow', 'workspace.title',
   '--dos-gradient-brand-soft', TRUE, '--dos-gradient-kpi-line')
ON CONFLICT DO NOTHING;

-- ── Grid columns (workspace.modules) ─────────────────────────────────
INSERT INTO dos.dynamic_ui_workspace_grid_columns
  (tenant_id, scope, col_key, label_key, data_field, data_kind, is_sortable, is_filterable, default_sort, sort_priority, align, is_visible, sort_order)
VALUES
  (NULL, 'workspace.modules', 'title',       'workspace.col.module',      'title.value',       'text',        TRUE,  TRUE,  'asc',  1, 'start', TRUE, 10),
  (NULL, 'workspace.modules', 'code',        'workspace.col.code',        'moduleCode',        'code',        TRUE,  TRUE,  NULL,   0, 'start', TRUE, 20),
  (NULL, 'workspace.modules', 'description', 'workspace.col.description', 'description.value', 'text',        FALSE, FALSE, NULL,   0, 'start', TRUE, 30),
  (NULL, 'workspace.modules', 'status',      'workspace.col.status',      'status',            'status_pill', TRUE,  FALSE, NULL,   0, 'start', TRUE, 40)
ON CONFLICT DO NOTHING;

-- ── Empty states ─────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_empty_states
  (state_key, title_key, description_key, tone, primary_label_key, primary_route)
VALUES
  ('workspace.tasks.empty',     'workspace.empty.tasks.title',     NULL,                                    'info',    'workspace.action.view_all', '/workspace/tasks'),
  ('workspace.approvals.empty', 'workspace.empty.approvals.title', NULL,                                    'warning', 'workspace.action.view_all', '/workspace/approvals'),
  ('workspace.activity.empty',  'workspace.empty.activity.title',  NULL,                                    'success', 'workspace.action.view_all', '/workspace/activity'),
  ('workspace.modules.empty',   'workspace.empty.modules.title',   'workspace.empty.modules.description',   'brand',   'workspace.action.ask_ai',   '/workspace/ai')
ON CONFLICT DO NOTHING;

-- ── Health probes (admin-only readiness) ─────────────────────────────
INSERT INTO dos.dynamic_ui_health_probes
  (probe_key, label_key, source_endpoint, source_kind, sort_order)
VALUES
  ('dna-modules',    'workspace.health.dna',      '/api/health/dna',      'http_status', 10),
  ('entitled-count', 'workspace.health.entitled', '/api/health/entitled', 'count',       20),
  ('openfga-seed',   'workspace.health.openfga',  '/api/health/openfga',  'http_status', 30),
  ('trial-status',   'workspace.health.trial',    '/api/health/trial',    'signal',      40)
ON CONFLICT DO NOTHING;

-- ── Trial banner rules (severity escalation) ────────────────────────
INSERT INTO dos.dynamic_ui_trial_banner_rules
  (tenant_id, threshold_days_min, threshold_days_max, severity, title_key, message_key, cta_label_key, cta_route, dismissible, sort_order)
VALUES
  (NULL,  0,   3, 'danger',  'shell.banner.trial_expired.title', 'shell.banner.trial_expired.message', 'shell.banner.trial_expired.action', '/tenant-settings', FALSE, 10),
  (NULL,  4,   7, 'warning', 'shell.banner.trial_expired.title', 'shell.banner.trial_expired.message', 'shell.banner.trial_expired.action', '/tenant-settings', TRUE,  20),
  (NULL,  8,  30, 'info',    'shell.banner.trial_expired.title', 'shell.banner.trial_expired.message', 'shell.banner.trial_expired.action', '/tenant-settings', TRUE,  30)
ON CONFLICT DO NOTHING;

-- ── Tabs (workspace-home in-page tab strip) ──────────────────────────
INSERT INTO dos.ui_route_tab (route, tab_id, sort_order, label_en, label_ar, permission)
VALUES
  ('/workspace-home', 'overview',  10, 'Overview',  'نظرة عامة',   NULL),
  ('/workspace-home', 'tasks',     20, 'My Tasks',  'مهامي',        'tasks.read'),
  ('/workspace-home', 'approvals', 30, 'Approvals', 'الموافقات',    'workflow.read'),
  ('/workspace-home', 'activity',  40, 'Activity',  'النشاط',       'audit_trail.read'),
  ('/workspace-home', 'modules',   50, 'Modules',   'الوحدات',      NULL)
ON CONFLICT (route, tab_id) DO NOTHING;

-- ── KPIs (workspace-home masthead strip) ─────────────────────────────
-- The existing template-binding row for /workspace-home already lives in
-- dos.ui_route_template_binding (archetype=command-home). KPIs attach by
-- route only.
INSERT INTO dos.ui_route_kpi (route, sort_order, label_en, label_ar, source_path, format)
VALUES
  ('/workspace-home', 10, 'Tenant',           'المستأجر',         'tenant.name',        'text'),
  ('/workspace-home', 20, 'Status',           'الحالة',            'tenant.status',      'status_pill'),
  ('/workspace-home', 30, 'Your Role',        'دورك',              'membership.roleCode','text'),
  ('/workspace-home', 40, 'Modules Entitled', 'الوحدات المخصصة',  'modules.length',     'number')
ON CONFLICT DO NOTHING;

COMMIT;
