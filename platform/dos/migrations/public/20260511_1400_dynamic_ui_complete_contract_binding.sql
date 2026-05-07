-- Dynamic UI OS - Complete Contract Binding
-- Binds all contracts: routes, features, actions, events, agents, widgets, KPIs, navigation
-- Owner: ui-os-service
--
-- This migration creates a comprehensive binding of all Dynamic UI OS contracts:
-- 1. Routes (pages) with features and permissions
-- 2. Actions per route with risk levels and workflows
-- 3. Widgets per route with zones and configurations
-- 4. Agents (A01-A13) with page placement
-- 5. Navigation entries with hierarchy
-- 6. KPIs per page with data resources
-- 7. Data resources with permissions
-- 8. Shell layouts for modules
-- 9. Intents for voice commands
-- 10. Theme tokens for customization
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. MODULES - Platform and Business Modules
-- =====================================================================
INSERT INTO dos.dynamic_ui_modules
  (module_code, platform_key, product_key, display_name, default_route,
   registry_status, default_tenant_enrollment_status, canonical_source)
VALUES
  -- Platform Modules
  ('ai-os', 'dos-platform', 'shahin-ai', 'AI-OS Platform Plane', '/workspace-home',
   'active', 'enabled', 'platform/ai/module.manifest.json'),
  ('dauth', 'dos-platform', 'shahin-ai', 'DAuth Platform', '/workspace-home',
   'active', 'enabled', 'platform/dauth/module.manifest.json'),
  ('dos', 'dos-platform', 'shahin-ai', 'DOS Platform', '/workspace-home',
   'active', 'enabled', 'platform/dos/module.manifest.json'),
  ('dsoc', 'dos-platform', 'shahin-ai', 'DSOC Platform', '/workspace-home',
   'active', 'enabled', 'platform/dsoc/module.manifest.json'),
  ('dnoc', 'dos-platform', 'shahin-ai', 'DNOC Platform', '/workspace-home',
   'active', 'enabled', 'platform/dnoc/module.manifest.json'),
  ('foundation', 'dos-platform', 'shahin-ai', 'Foundation Platform', '/workspace-home',
   'active', 'enabled', 'platform/foundation/module.manifest.json'),
  ('dynamic-ui', 'dos-platform', 'shahin-ai', 'Dynamic UI Platform', '/workspace-home',
   'active', 'enabled', 'platform/ui-system/module.manifest.json'),
  -- Business Modules
  ('compliance', 'shahin-ai', 'shahin-ai', 'Compliance Module', '/compliance',
   'active', 'enabled', 'modules/compliance/module.manifest.json'),
  ('risk', 'shahin-ai', 'shahin-ai', 'Risk Module', '/risk',
   'active', 'enabled', 'modules/risk/module.manifest.json'),
  ('audit', 'shahin-ai', 'shahin-ai', 'Audit Module', '/audit',
   'active', 'enabled', 'modules/audit/module.manifest.json'),
  ('policy', 'shahin-ai', 'shahin-ai', 'Policy Module', '/policy',
   'active', 'enabled', 'modules/policy/module.manifest.json'),
  ('evidence', 'shahin-ai', 'shahin-ai', 'Evidence Module', '/evidence',
   'active', 'enabled', 'modules/evidence/module.manifest.json'),
  ('incident', 'shahin-ai', 'shahin-ai', 'Incident Module', '/incident',
   'active', 'enabled', 'modules/incident/module.manifest.json'),
  ('vendor', 'shahin-ai', 'shahin-ai', 'Vendor Module', '/vendor',
   'active', 'enabled', 'modules/vendor/module.manifest.json'),
  ('training', 'shahin-ai', 'shahin-ai', 'Training Module', '/training',
   'active', 'enabled', 'modules/training/module.manifest.json'),
  ('privacy', 'shahin-ai', 'shahin-ai', 'Privacy Module', '/privacy',
   'active', 'enabled', 'modules/privacy/module.manifest.json'),
  ('dora', 'shahin-ai', 'shahin-ai', 'DORA Module', '/dora',
   'active', 'enabled', 'modules/dora/module.manifest.json'),
  ('exceptions', 'shahin-ai', 'shahin-ai', 'Exceptions Module', '/exceptions',
   'active', 'enabled', 'modules/exceptions/module.manifest.json'),
  ('remediation', 'shahin-ai', 'shahin-ai', 'Remediation Module', '/remediation',
   'active', 'enabled', 'modules/remediation/module.manifest.json'),
  ('inbox', 'shahin-ai', 'shahin-ai', 'Inbox Module', '/inbox',
   'active', 'enabled', 'modules/inbox/module.manifest.json'),
  ('benchmarks', 'shahin-ai', 'shahin-ai', 'Benchmarks Module', '/benchmarks',
   'active', 'enabled', 'modules/benchmarks/module.manifest.json'),
  ('asset', 'shahin-ai', 'shahin-ai', 'Asset Module', '/asset',
   'active', 'enabled', 'modules/asset/module.manifest.json'),
  ('analytics', 'shahin-ai', 'shahin-ai', 'Analytics Module', '/analytics',
   'active', 'enabled', 'modules/analytics/module.manifest.json'),
  ('action', 'shahin-ai', 'shahin-ai', 'Action Module', '/action',
   'active', 'enabled', 'modules/action/module.manifest.json'),
  ('knowledge', 'shahin-ai', 'shahin-ai', 'Knowledge Module', '/knowledge',
   'active', 'enabled', 'modules/knowledge/module.manifest.json'),
  ('widgets', 'shahin-ai', 'shahin-ai', 'Widgets Module', '/widgets',
   'active', 'enabled', 'modules/widgets/module.manifest.json'),
  ('agrc-engine', 'shahin-ai', 'shahin-ai', 'AGRC Engine', '/agrc-engine',
   'active', 'enabled', 'modules/agrc-engine/module.manifest.json'),
  ('agrc-dashboard', 'shahin-ai', 'shahin-ai', 'AGRC Dashboard', '/agrc-dashboard',
   'active', 'enabled', 'modules/agrc-dashboard/module.manifest.json'),
  ('akb', 'shahin-ai', 'shahin-ai', 'AKB Module', '/akb',
   'active', 'enabled', 'modules/akb/module.manifest.json'),
  ('mcp', 'shahin-ai', 'shahin-ai', 'MCP Module', '/mcp',
   'active', 'enabled', 'modules/mcp/module.manifest.json'),
  ('mobile', 'shahin-ai', 'shahin-ai', 'Mobile Module', '/mobile',
   'active', 'enabled', 'modules/mobile/module.manifest.json'),
  ('qiyas', 'shahin-ai', 'shahin-ai', 'Qiyas Module', '/qiyas',
   'active', 'enabled', 'modules/qiyas/module.manifest.json'),
  ('proactive-leadership', 'shahin-ai', 'shahin-ai', 'Proactive Leadership', '/proactive-leadership',
   'active', 'enabled', 'modules/proactive-leadership/module.manifest.json'),
  ('bcp', 'shahin-ai', 'shahin-ai', 'BCP Module', '/bcp',
   'active', 'enabled', 'modules/bcp/module.manifest.json')
ON CONFLICT (module_code) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      default_route = EXCLUDED.default_route,
      registry_status = EXCLUDED.registry_status,
      updated_at = NOW();

-- =====================================================================
-- 2. NAVIGATION - Hierarchical Navigation Entries
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  -- Foundation Navigation
  (NULL, 'foundation', 'Overview', '/workspace-home', 1, NULL, 'active'),
  (NULL, 'foundation', 'Users', '/foundation/users', 10, NULL, 'active'),
  (NULL, 'foundation', 'Organizations', '/foundation/organizations', 20, NULL, 'active'),
  (NULL, 'foundation', 'Roles', '/foundation/roles', 30, NULL, 'active'),
  (NULL, 'foundation', 'Permissions', '/foundation/permissions', 40, NULL, 'active'),
  (NULL, 'foundation', 'Settings', '/foundation/settings', 50, NULL, 'active'),
  -- Compliance Navigation
  (NULL, 'compliance', 'Compliance', '/compliance', 100, NULL, 'active'),
  (NULL, 'compliance', 'Controls', '/compliance/controls', 110, NULL, 'active'),
  (NULL, 'compliance', 'Frameworks', '/compliance/frameworks', 120, NULL, 'active'),
  (NULL, 'compliance', 'Assessments', '/compliance/assessments', 130, NULL, 'active'),
  (NULL, 'compliance', 'Gaps', '/compliance/gaps', 140, NULL, 'active'),
  (NULL, 'compliance', 'Regulator', '/compliance/regulator', 150, NULL, 'active'),
  -- Risk Navigation
  (NULL, 'risk', 'Risk', '/risk', 200, NULL, 'active'),
  (NULL, 'risk', 'Risk Register', '/risk/register', 210, NULL, 'active'),
  (NULL, 'risk', 'Risk Assessment', '/risk/assessment', 220, NULL, 'active'),
  (NULL, 'risk', 'Risk Treatment', '/risk/treatment', 230, NULL, 'active'),
  -- Audit Navigation
  (NULL, 'audit', 'Audit', '/audit', 300, NULL, 'active'),
  (NULL, 'audit', 'Audit Trail', '/audit/trail', 310, NULL, 'active'),
  (NULL, 'audit', 'Audit Reports', '/audit/reports', 320, NULL, 'active'),
  -- Policy Navigation
  (NULL, 'policy', 'Policy', '/policy', 400, NULL, 'active'),
  (NULL, 'policy', 'Policy Library', '/policy/library', 410, NULL, 'active'),
  (NULL, 'policy', 'Policy Approvals', '/policy/approvals', 420, NULL, 'active'),
  -- AI-OS Navigation
  (NULL, 'ai-os', 'AI Hub', '/ai-hub', 500, NULL, 'active'),
  (NULL, 'ai-os', 'Agents', '/ai/agents', 510, NULL, 'active'),
  (NULL, 'ai-os', 'AI Governance', '/ai-governance', 520, NULL, 'active'),
  (NULL, 'ai-os', 'AI Models', '/ai/models', 530, NULL, 'active'),
  -- Config Center Navigation
  (NULL, 'config-center', 'Settings', '/settings', 600, NULL, 'active'),
  (NULL, 'config-center', 'Flags', '/flags', 610, NULL, 'active'),
  (NULL, 'config-center', 'Tokens', '/tokens', 620, NULL, 'active'),
  (NULL, 'config-center', 'Audit', '/admin/audit', 630, NULL, 'active')
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      updated_at = NOW();

-- =====================================================================
-- 3. ROUTES (Pages) - Complete Page Experience Routes
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, signature_widget, title_key,
   subtitle_key, data_resource_key, default_view, audit_enabled,
   realtime_enabled, mobile_variant, empty_state_key, error_state_key)
SELECT NULL, x.module_code, x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, x.scope, x.evidence,
       x.signature, x.title_key, x.subtitle_key, x.data_resource, x.def_view,
       x.audit, x.realtime, x.mobile, x.empty, x.error
  FROM (VALUES
    -- Foundation Routes
    ('foundation', '/workspace-home', 'module.dashboard.page', 'workspace.read',
     1, 'dashboard', 'full-page', 'module-overview', 'overview', 'tenant',
     FALSE, NULL, 'workspace.home.title', 'workspace.home.subtitle',
     'workspace.resource.home', 'grid', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'workspace.home.empty', 'workspace.home.error'),
    ('foundation', '/foundation/users', 'module.org_chart.page', 'foundation.users.read',
     10, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'foundation.users.title', 'foundation.users.subtitle',
     'foundation.resource.users', 'table', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'foundation.users.empty', 'foundation.users.error'),
    ('foundation', '/foundation/organizations', 'module.ownership_map.page', 'foundation.orgs.read',
     20, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'foundation.orgs.title', 'foundation.orgs.subtitle',
     'foundation.resource.orgs', 'table', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'foundation.orgs.empty', 'foundation.orgs.error'),
    ('foundation', '/foundation/roles', 'module.records.page', 'foundation.roles.read',
     30, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'foundation.roles.title', 'foundation.roles.subtitle',
     'foundation.resource.roles', 'table', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'foundation.roles.empty', 'foundation.roles.error'),
    ('foundation', '/foundation/permissions', 'module.records.page', 'foundation.perms.read',
     40, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'foundation.perms.title', 'foundation.perms.subtitle',
     'foundation.resource.perms', 'table', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'foundation.perms.empty', 'foundation.perms.error'),
    ('foundation', '/foundation/settings', 'module.settings.page', 'foundation.settings.read',
     50, 'settings', 'tabs', 'none', 'configure', 'tenant',
     FALSE, NULL, 'foundation.settings.title', 'foundation.settings.subtitle',
     'foundation.resource.settings', 'tabs', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'foundation.settings.empty', 'foundation.settings.error'),
    -- Compliance Routes
    ('compliance', '/compliance', 'module.posture.page', 'compliance.read',
     100, 'overview', 'dashboard', 'module-overview', 'assess', 'tenant',
     FALSE, NULL, 'compliance.home.title', 'compliance.home.subtitle',
     'compliance.resource.home', 'tiles', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'compliance.home.empty', 'compliance.home.error'),
    ('compliance', '/compliance/controls', 'module.records.page', 'compliance.controls.read',
     110, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'compliance.controls.title', 'compliance.controls.subtitle',
     'compliance.resource.controls', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'compliance.controls.empty', 'compliance.controls.error'),
    ('compliance', '/compliance/frameworks', 'module.records.page', 'compliance.frameworks.read',
     120, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'compliance.frameworks.title', 'compliance.frameworks.subtitle',
     'compliance.resource.frameworks', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'compliance.frameworks.empty', 'compliance.frameworks.error'),
    ('compliance', '/compliance/assessments', 'module.workflow_timeline.page', 'compliance.assessments.read',
     130, 'workflow', 'full-page', 'none', 'execute', 'tenant',
     TRUE, NULL, 'compliance.assessments.title', 'compliance.assessments.subtitle',
     'compliance.resource.assessments', 'timeline', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'compliance.assessments.empty', 'compliance.assessments.error'),
    ('compliance', '/compliance/gaps', 'module.records.page', 'compliance.gaps.read',
     140, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'compliance.gaps.title', 'compliance.gaps.subtitle',
     'compliance.resource.gaps', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'compliance.gaps.empty', 'compliance.gaps.error'),
    ('compliance', '/compliance/regulator', 'module.records.page', 'compliance.regulator.read',
     150, 'list', 'full-page', 'none', 'view', 'tenant',
     TRUE, 'signature_widget', 'compliance.regulator.title', 'compliance.regulator.subtitle',
     'compliance.resource.regulator', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'compliance.regulator.empty', 'compliance.regulator.error'),
    -- Risk Routes
    ('risk', '/risk', 'module.posture.page', 'risk.read',
     200, 'overview', 'dashboard', 'module-overview', 'assess', 'tenant',
     FALSE, NULL, 'risk.home.title', 'risk.home.subtitle',
     'risk.resource.home', 'tiles', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'risk.home.empty', 'risk.home.error'),
    ('risk', '/risk/register', 'module.records.page', 'risk.register.read',
     210, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'risk.register.title', 'risk.register.subtitle',
     'risk.resource.register', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'risk.register.empty', 'risk.register.error'),
    ('risk', '/risk/assessment', 'module.workflow_timeline.page', 'risk.assessment.read',
     220, 'workflow', 'full-page', 'none', 'execute', 'tenant',
     TRUE, NULL, 'risk.assessment.title', 'risk.assessment.subtitle',
     'risk.resource.assessment', 'timeline', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'risk.assessment.empty', 'risk.assessment.error'),
    ('risk', '/risk/treatment', 'module.records.page', 'risk.treatment.read',
     230, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'risk.treatment.title', 'risk.treatment.subtitle',
     'risk.resource.treatment', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'risk.treatment.empty', 'risk.treatment.error'),
    -- Audit Routes
    ('audit', '/audit', 'module.audit_trail_ledger.page', 'audit.read',
     300, 'overview', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'audit.home.title', 'audit.home.subtitle',
     'audit.resource.home', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'audit.home.empty', 'audit.home.error'),
    ('audit', '/audit/trail', 'module.audit_trail_ledger.page', 'audit.trail.read',
     310, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'audit.trail.title', 'audit.trail.subtitle',
     'audit.resource.trail', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'audit.trail.empty', 'audit.trail.error'),
    ('audit', '/audit/reports', 'module.records.page', 'audit.reports.read',
     320, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'audit.reports.title', 'audit.reports.subtitle',
     'audit.resource.reports', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'audit.reports.empty', 'audit.reports.error'),
    -- Policy Routes
    ('policy', '/policy', 'module.records.page', 'policy.read',
     400, 'overview', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'policy.home.title', 'policy.home.subtitle',
     'policy.resource.home', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'policy.home.empty', 'policy.home.error'),
    ('policy', '/policy/library', 'module.records.page', 'policy.library.read',
     410, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'policy.library.title', 'policy.library.subtitle',
     'policy.resource.library', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'policy.library.empty', 'policy.library.error'),
    ('policy', '/policy/approvals', 'module.workflow_timeline.page', 'policy.approvals.read',
     420, 'workflow', 'full-page', 'none', 'approve', 'tenant',
     TRUE, 'signature_widget', 'policy.approvals.title', 'policy.approvals.subtitle',
     'policy.resource.approvals', 'timeline', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'policy.approvals.empty', 'policy.approvals.error'),
    -- AI-OS Routes
    ('ai-os', '/ai-hub', 'module.dashboard.page', 'ai.read',
     500, 'overview', 'dashboard', 'module-overview', 'explore', 'tenant',
     FALSE, NULL, 'ai.hub.title', 'ai.hub.subtitle',
     'ai.resource.hub', 'tiles', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'ai.hub.empty', 'ai.hub.error'),
    ('ai-os', '/ai/agents', 'module.records.page', 'ai.agents.read',
     510, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'ai.agents.title', 'ai.agents.subtitle',
     'ai.resource.agents', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'ai.agents.empty', 'ai.agents.error'),
    ('ai-os', '/ai-governance', 'module.records.page', 'ai.governance.read',
     520, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'ai.governance.title', 'ai.governance.subtitle',
     'ai.resource.governance', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'ai.governance.empty', 'ai.governance.error'),
    ('ai-os', '/ai/models', 'module.records.page', 'ai.models.read',
     530, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'ai.models.title', 'ai.models.subtitle',
     'ai.resource.models', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'ai.models.empty', 'ai.models.error'),
    -- Config Center Routes
    ('config-center', '/settings', 'module.settings.page', 'config.settings.read',
     600, 'settings', 'tabs', 'none', 'configure', 'tenant',
     FALSE, NULL, 'config.settings.title', 'config.settings.subtitle',
     'config.resource.settings', 'tabs', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'config.settings.empty', 'config.settings.error'),
    ('config-center', '/flags', 'module.records.page', 'config.flags.read',
     610, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'config.flags.title', 'config.flags.subtitle',
     'config.resource.flags', 'table', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'config.flags.empty', 'config.flags.error'),
    ('config-center', '/tokens', 'module.records.page', 'config.tokens.read',
     620, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'config.tokens.title', 'config.tokens.subtitle',
     'config.resource.tokens', 'table', TRUE, FALSE,
     '{"variant":"bottom-sheet"}'::jsonb, 'config.tokens.empty', 'config.tokens.error'),
    ('config-center', '/admin/audit', 'module.audit_trail_ledger.page', 'config.audit.read',
     630, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, NULL, 'config.audit.title', 'config.audit.subtitle',
     'config.resource.audit', 'table', TRUE, TRUE,
     '{"variant":"bottom-sheet"}'::jsonb, 'config.audit.empty', 'config.audit.error')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, evidence, signature, title_key, subtitle_key, data_resource,
         def_view, audit, realtime, mobile, empty, error)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 4. AGENTS - AI Agents (A01-A13)
-- =====================================================================
INSERT INTO dos.dynamic_ui_agents
  (agent_id, module_code, name_key, description_key, level, scope,
   capabilities, allowed_page_types, allowed_actions, requires_human_approval,
   audit_required, default_risk_level, prompt_template_ref, is_active)
VALUES
  ('A01', 'ai-os', 'agents.a01.name', 'agents.a01.description', 'L4', 'global',
   '{"capabilities":["autonomous_decision","multi_agent_coordination","complex_reasoning"]}'::jsonb,
   ARRAY['dashboard','list','workflow'], ARRAY['approve','reject','delegate'],
   TRUE, TRUE, 'medium', 'templates/a01-autonomous', TRUE),
  ('A02', 'foundation', 'agents.a02.name', 'agents.a02.description', 'L2', 'page',
   '{"capabilities":["identity_provisioning","role_assignment","org_structure"]}'::jsonb,
   ARRAY['list','settings'], ARRAY['create','update','delete'],
   TRUE, TRUE, 'low', 'templates/a02-identity', TRUE),
  ('A03', 'compliance', 'agents.a03.name', 'agents.a03.description', 'L3', 'page',
   '{"capabilities":["control_assessment","gap_analysis","framework_mapping"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['assess','approve','remediate'],
   TRUE, TRUE, 'medium', 'templates/a03-compliance', TRUE),
  ('A04', 'risk', 'agents.a04.name', 'agents.a04.description', 'L3', 'page',
   '{"capabilities":["risk_assessment","risk_scoring","treatment_planning"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['assess','treat','monitor'],
   TRUE, TRUE, 'medium', 'templates/a04-risk', TRUE),
  ('A05', 'audit', 'agents.a05.name', 'agents.a05.description', 'L2', 'page',
   '{"capabilities":["audit_trail_analysis","evidence_collection","reporting"]}'::jsonb,
   ARRAY['list'], ARRAY['audit','report'],
   FALSE, TRUE, 'low', 'templates/a05-audit', TRUE),
  ('A06', 'policy', 'agents.a06.name', 'agents.a06.description', 'L2', 'page',
   '{"capabilities":["policy_review","approval_workflow","compliance_check"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['review','approve','reject'],
   TRUE, TRUE, 'medium', 'templates/a06-policy', TRUE),
  ('A07', 'risk', 'agents.a07.name', 'agents.a07.description', 'L3', 'page',
   '{"capabilities":["risk_monitoring","alerting","trend_analysis"]}'::jsonb,
   ARRAY['dashboard','list'], ARRAY['monitor','alert'],
   FALSE, TRUE, 'low', 'templates/a07-risk-monitor', TRUE),
  ('A08', 'foundation', 'agents.a08.name', 'agents.a08.description', 'L2', 'page',
   '{"capabilities":["governance_check","policy_enforcement","compliance_monitoring"]}'::jsonb,
   ARRAY['dashboard'], ARRAY['enforce','monitor'],
   FALSE, TRUE, 'low', 'templates/a08-governance', TRUE),
  ('A09', 'compliance', 'agents.a09.name', 'agents.a09.description', 'L3', 'page',
   '{"capabilities":["regulatory_analysis","report_generation","submission_prep"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['analyze','report','submit'],
   TRUE, TRUE, 'medium', 'templates/a09-regulatory', TRUE),
  ('A10', 'audit', 'agents.a10.name', 'agents.a10.description', 'L2', 'page',
   '{"capabilities":["audit_reporting","finding_tracking","remediation_tracking"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['report','track'],
   FALSE, TRUE, 'low', 'templates/a10-reporting', TRUE),
  ('A11', 'evidence', 'agents.a11.name', 'agents.a11.description', 'L2', 'page',
   '{"capabilities":["evidence_collection","classification","retention"]}'::jsonb,
   ARRAY['list'], ARRAY['collect','classify','retain'],
   FALSE, TRUE, 'low', 'templates/a11-evidence', TRUE),
  ('A12', 'incident', 'agents.a12.name', 'agents.a12.description', 'L3', 'page',
   '{"capabilities":["incident_response","coordination","escalation"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['respond','coordinate','escalate'],
   TRUE, TRUE, 'high', 'templates/a12-incident', TRUE),
  ('A13', 'remediation', 'agents.a13.name', 'agents.a13.description', 'L3', 'page',
   '{"capabilities":["remediation_planning","execution","verification"]}'::jsonb,
   ARRAY['list','workflow'], ARRAY['plan','execute','verify'],
   TRUE, TRUE, 'medium', 'templates/a13-remediation', TRUE)
ON CONFLICT (agent_id) DO UPDATE
  SET name_key = EXCLUDED.name_key,
      description_key = EXCLUDED.description_key,
      level = EXCLUDED.level,
      capabilities = EXCLUDED.capabilities,
      updated_at = NOW();

-- =====================================================================
-- 5. PAGE AGENTS - Agent Placement on Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_page_agents
  (tenant_id, module_code, route, agent_id, is_primary, presentation,
   profiles, permission, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.agent_id, x.is_primary, x.presentation,
       x.profiles, x.permission, x.sort, TRUE
  FROM (VALUES
    -- Foundation Pages
    ('foundation', '/workspace-home', 'A01', TRUE, 'sidebar', ARRAY['admin'], 'workspace.read', 1),
    ('foundation', '/foundation/users', 'A02', TRUE, 'panel', ARRAY['admin'], 'foundation.users.read', 1),
    ('foundation', '/foundation/organizations', 'A02', TRUE, 'panel', ARRAY['admin'], 'foundation.orgs.read', 1),
    ('foundation', '/foundation/roles', 'A08', TRUE, 'panel', ARRAY['admin'], 'foundation.roles.read', 1),
    ('foundation', '/foundation/permissions', 'A08', TRUE, 'panel', ARRAY['admin'], 'foundation.perms.read', 1),
    -- Compliance Pages
    ('compliance', '/compliance', 'A03', TRUE, 'sidebar', ARRAY['compliance_officer'], 'compliance.read', 1),
    ('compliance', '/compliance/controls', 'A03', TRUE, 'panel', ARRAY['compliance_officer'], 'compliance.controls.read', 1),
    ('compliance', '/compliance/frameworks', 'A03', TRUE, 'panel', ARRAY['compliance_officer'], 'compliance.frameworks.read', 1),
    ('compliance', '/compliance/assessments', 'A03', TRUE, 'panel', ARRAY['compliance_officer'], 'compliance.assessments.read', 1),
    ('compliance', '/compliance/gaps', 'A03', TRUE, 'panel', ARRAY['compliance_officer'], 'compliance.gaps.read', 1),
    ('compliance', '/compliance/regulator', 'A09', TRUE, 'panel', ARRAY['compliance_officer'], 'compliance.regulator.read', 1),
    -- Risk Pages
    ('risk', '/risk', 'A04', TRUE, 'sidebar', ARRAY['risk_manager'], 'risk.read', 1),
    ('risk', '/risk/register', 'A04', TRUE, 'panel', ARRAY['risk_manager'], 'risk.register.read', 1),
    ('risk', '/risk/assessment', 'A04', TRUE, 'panel', ARRAY['risk_manager'], 'risk.assessment.read', 1),
    ('risk', '/risk/treatment', 'A07', TRUE, 'panel', ARRAY['risk_manager'], 'risk.treatment.read', 1),
    -- Audit Pages
    ('audit', '/audit', 'A05', TRUE, 'sidebar', ARRAY['auditor'], 'audit.read', 1),
    ('audit', '/audit/trail', 'A05', TRUE, 'panel', ARRAY['auditor'], 'audit.trail.read', 1),
    ('audit', '/audit/reports', 'A10', TRUE, 'panel', ARRAY['auditor'], 'audit.reports.read', 1),
    -- Policy Pages
    ('policy', '/policy', 'A06', TRUE, 'sidebar', ARRAY['policy_manager'], 'policy.read', 1),
    ('policy', '/policy/library', 'A06', TRUE, 'panel', ARRAY['policy_manager'], 'policy.library.read', 1),
    ('policy', '/policy/approvals', 'A06', TRUE, 'panel', ARRAY['policy_manager'], 'policy.approvals.read', 1),
    -- AI-OS Pages
    ('ai-os', '/ai-hub', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.read', 1),
    ('ai-os', '/ai/agents', 'A01', TRUE, 'panel', ARRAY['ai_admin'], 'ai.agents.read', 1),
    ('ai-os', '/ai-governance', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.read', 1),
    ('ai-os', '/ai/models', 'A01', TRUE, 'panel', ARRAY['ai_admin'], 'ai.models.read', 1)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

-- =====================================================================
-- 6. ACTIONS - Page Actions with Risk Levels
-- =====================================================================
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, profiles, risk_level, requires_approval, workflow_code,
   evidence_required, handler_key, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.action_id, x.position, x.label_key,
       x.icon, x.permission, x.profiles, x.risk_level, x.requires_approval,
       x.workflow_code, x.evidence_required, x.handler_key, x.sort, TRUE
  FROM (VALUES
    -- Foundation Actions
    ('foundation', '/foundation/users', 'create_user', 'toolbar', 'actions.create_user', 'add',
     'foundation.users.create', ARRAY['admin'], 'low', FALSE, NULL, FALSE, 'create_user', 1),
    ('foundation', '/foundation/users', 'edit_user', 'row', 'actions.edit_user', 'edit',
     'foundation.users.update', ARRAY['admin'], 'low', FALSE, NULL, FALSE, 'edit_user', 2),
    ('foundation', '/foundation/users', 'delete_user', 'row', 'actions.delete_user', 'delete',
     'foundation.users.delete', ARRAY['admin'], 'high', TRUE, 'user_deletion', TRUE, 'delete_user', 3),
    -- Compliance Actions
    ('compliance', '/compliance/controls', 'create_control', 'toolbar', 'actions.create_control', 'add',
     'compliance.controls.create', ARRAY['compliance_officer'], 'medium', FALSE, NULL, FALSE, 'create_control', 1),
    ('compliance', '/compliance/controls', 'assess_control', 'row', 'actions.assess_control', 'check',
     'compliance.controls.assess', ARRAY['compliance_officer'], 'medium', FALSE, 'control_assessment', TRUE, 'assess_control', 2),
    ('compliance', '/compliance/assessments', 'start_assessment', 'toolbar', 'actions.start_assessment', 'play',
     'compliance.assessments.start', ARRAY['compliance_officer'], 'medium', FALSE, 'assessment_workflow', TRUE, 'start_assessment', 1),
    ('compliance', '/compliance/assessments', 'approve_assessment', 'row', 'actions.approve_assessment', 'check',
     'compliance.assessments.approve', ARRAY['compliance_officer'], 'high', TRUE, 'assessment_approval', TRUE, 'approve_assessment', 2),
    -- Risk Actions
    ('risk', '/risk/register', 'create_risk', 'toolbar', 'actions.create_risk', 'add',
     'risk.create', ARRAY['risk_manager'], 'medium', FALSE, NULL, FALSE, 'create_risk', 1),
    ('risk', '/risk/register', 'assess_risk', 'row', 'actions.assess_risk', 'chart',
     'risk.assess', ARRAY['risk_manager'], 'medium', FALSE, 'risk_assessment', TRUE, 'assess_risk', 2),
    ('risk', '/risk/treatment', 'create_treatment', 'toolbar', 'actions.create_treatment', 'shield',
     'risk.treatment.create', ARRAY['risk_manager'], 'high', TRUE, 'treatment_approval', TRUE, 'create_treatment', 1),
    -- Audit Actions
    ('audit', '/audit/trail', 'export_audit', 'toolbar', 'actions.export_audit', 'download',
     'audit.export', ARRAY['auditor'], 'low', FALSE, NULL, FALSE, 'export_audit', 1),
    ('audit', '/audit/reports', 'generate_report', 'toolbar', 'actions.generate_report', 'document',
     'audit.report.generate', ARRAY['auditor'], 'medium', FALSE, 'report_generation', TRUE, 'generate_report', 1),
    -- Policy Actions
    ('policy', '/policy/library', 'create_policy', 'toolbar', 'actions.create_policy', 'add',
     'policy.create', ARRAY['policy_manager'], 'medium', FALSE, NULL, FALSE, 'create_policy', 1),
    ('policy', '/policy/approvals', 'approve_policy', 'row', 'actions.approve_policy', 'check',
     'policy.approve', ARRAY['policy_manager'], 'high', TRUE, 'policy_approval', TRUE, 'approve_policy', 1),
    ('policy', '/policy/approvals', 'reject_policy', 'row', 'actions.reject_policy', 'close',
     'policy.reject', ARRAY['policy_manager'], 'high', TRUE, 'policy_approval', TRUE, 'reject_policy', 2),
    -- AI-OS Actions
    ('ai-os', '/ai/agents', 'register_agent', 'toolbar', 'actions.register_agent', 'add',
     'ai.agents.register', ARRAY['ai_admin'], 'high', TRUE, 'agent_registration', TRUE, 'register_agent', 1),
    ('ai-os', '/ai/models', 'add_model', 'toolbar', 'actions.add_model', 'add',
     'ai.models.add', ARRAY['ai_admin'], 'high', TRUE, 'model_approval', TRUE, 'add_model', 1)
  ) AS x(module_code, route, action_id, position, label_key, icon, permission,
         profiles, risk_level, requires_approval, workflow_code, evidence_required,
         handler_key, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_actions a
  WHERE a.tenant_id IS NULL
    AND a.module_code = x.module_code
    AND a.route = x.route
    AND a.action_id = x.action_id
);

-- =====================================================================
-- 7. WIDGETS - Page Widgets with Zones
-- =====================================================================
INSERT INTO dos.dynamic_ui_widgets
  (tenant_id, module_code, route, widget_key, zone, permission,
   profiles, config, sort_order, is_signature, is_active)
SELECT NULL, x.module_code, x.route, x.widget_key, x.zone, x.permission,
       x.profiles, x.config, x.sort, FALSE, TRUE
  FROM (VALUES
    -- Foundation Widgets
    ('foundation', '/workspace-home', 'workspace_overview', 'masthead', 'workspace.read',
     ARRAY['admin'], '{"title":"Workspace Overview","showKpiStrip":true}'::jsonb, 1),
    ('foundation', '/workspace-home', 'quick_actions', 'kpi-strip', 'workspace.read',
     ARRAY['admin'], '{"actions":["new_user","new_org","settings"]}'::jsonb, 2),
    ('foundation', '/workspace-home', 'recent_activity', 'main', 'workspace.read',
     ARRAY['admin'], '{"limit":10}'::jsonb, 3),
    ('foundation', '/foundation/users', 'user_table', 'main', 'foundation.users.read',
     ARRAY['admin'], '{"columns":["name","email","role","status"]}'::jsonb, 1),
    ('foundation', '/foundation/users', 'user_filters', 'toolbar', 'foundation.users.read',
     ARRAY['admin'], '{"filters":["role","status","department"]}'::jsonb, 2),
    -- Compliance Widgets
    ('compliance', '/compliance', 'compliance_posture', 'masthead', 'compliance.read',
     ARRAY['compliance_officer'], '{"showScore":true,"showTrend":true}'::jsonb, 1),
    ('compliance', '/compliance', 'compliance_kpi_strip', 'kpi-strip', 'compliance.read',
     ARRAY['compliance_officer'], '{"kpis":["controls_passed","gaps_open","assessments_pending"]}'::jsonb, 2),
    ('compliance', '/compliance/controls', 'controls_table', 'main', 'compliance.controls.read',
     ARRAY['compliance_officer'], '{"columns":["control_id","framework","status","effectiveness"]}'::jsonb, 1),
    ('compliance', '/compliance/assessments', 'assessments_timeline', 'main', 'compliance.assessments.read',
     ARRAY['compliance_officer'], '{"showProgress":true}'::jsonb, 1),
    -- Risk Widgets
    ('risk', '/risk', 'risk_posture', 'masthead', 'risk.read',
     ARRAY['risk_manager'], '{"showHeatmap":true,"showTopRisks":true}'::jsonb, 1),
    ('risk', '/risk', 'risk_kpi_strip', 'kpi-strip', 'risk.read',
     ARRAY['risk_manager'], '{"kpis":["total_risks","high_risks","mitigated_risks"]}'::jsonb, 2),
    ('risk', '/risk/register', 'risk_table', 'main', 'risk.register.read',
     ARRAY['risk_manager'], '{"columns":["risk_id","level","category","owner"]}'::jsonb, 1),
    -- Audit Widgets
    ('audit', '/audit', 'audit_summary', 'masthead', 'audit.read',
     ARRAY['auditor'], '{"showStats":true}'::jsonb, 1),
    ('audit', '/audit/trail', 'audit_table', 'main', 'audit.trail.read',
     ARRAY['auditor'], '{"columns":["timestamp","user","action","entity"]}'::jsonb, 1),
    -- Policy Widgets
    ('policy', '/policy', 'policy_summary', 'masthead', 'policy.read',
     ARRAY['policy_manager'], '{"showStats":true}'::jsonb, 1),
    ('policy', '/policy/library', 'policy_table', 'main', 'policy.library.read',
     ARRAY['policy_manager'], '{"columns":["policy_id","title","status","effective_date"]}'::jsonb, 1),
    -- AI-OS Widgets
    ('ai-os', '/ai-hub', 'ai_overview', 'masthead', 'ai.read',
     ARRAY['ai_admin'], '{"showAgentCount":true,"showModelCount":true}'::jsonb, 1),
    ('ai-os', '/ai/agents', 'agents_table', 'main', 'ai.agents.read',
     ARRAY['ai_admin'], '{"columns":["agent_id","name","level","status"]}'::jsonb, 1),
    ('ai-os', '/ai/models', 'models_table', 'main', 'ai.models.read',
     ARRAY['ai_admin'], '{"columns":["model_id","provider","status","usage"]}'::jsonb, 1)
  ) AS x(module_code, route, widget_key, zone, permission, profiles, config, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_widgets w
  WHERE w.tenant_id IS NULL
    AND w.module_code = x.module_code
    AND w.route = x.route
    AND w.widget_key = x.widget_key
);

-- =====================================================================
-- 8. KPIS - KPI Definitions per Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit,
   data_resource, permission, profiles, scope, format, trend_enabled,
   threshold, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.kpi_key, x.label_key, x.unit,
       x.data_resource, x.permission, x.profiles, x.scope, x.format,
       x.trend_enabled, x.threshold, x.sort, TRUE
  FROM (VALUES
    -- Foundation KPIs
    ('foundation', '/workspace-home', 'total_users', 'kpi.total_users', 'count',
     'workspace.resource.users', 'workspace.read', ARRAY['admin'], 'page', 'number', TRUE,
     '{"warning":1000,"critical":500}'::jsonb, 1),
    ('foundation', '/workspace-home', 'active_orgs', 'kpi.active_orgs', 'count',
     'workspace.resource.orgs', 'workspace.read', ARRAY['admin'], 'page', 'number', TRUE,
     NULL::jsonb, 2),
    ('foundation', '/foundation/users', 'user_growth', 'kpi.user_growth', 'percent',
     'workspace.resource.users', 'foundation.users.read', ARRAY['admin'], 'page', 'percentage', TRUE,
     NULL::jsonb, 1),
    -- Compliance KPIs
    ('compliance', '/compliance', 'controls_passed', 'kpi.controls_passed', 'count',
     'compliance.resource.controls', 'compliance.read', ARRAY['compliance_officer'], 'page', 'number', TRUE,
     '{"warning":80,"critical":70}'::jsonb, 1),
    ('compliance', '/compliance', 'gaps_open', 'kpi.gaps_open', 'count',
     'compliance.resource.gaps', 'compliance.read', ARRAY['compliance_officer'], 'page', 'number', TRUE,
     '{"warning":10,"critical":20}'::jsonb, 2),
    ('compliance', '/compliance', 'assessments_pending', 'kpi.assessments_pending', 'count',
     'compliance.resource.assessments', 'compliance.read', ARRAY['compliance_officer'], 'page', 'number', TRUE,
     NULL::jsonb, 3),
    -- Risk KPIs
    ('risk', '/risk', 'total_risks', 'kpi.total_risks', 'count',
     'risk.resource.register', 'risk.read', ARRAY['risk_manager'], 'page', 'number', TRUE,
     '{"warning":50,"critical":100}'::jsonb, 1),
    ('risk', '/risk', 'high_risks', 'kpi.high_risks', 'count',
     'risk.resource.register', 'risk.read', ARRAY['risk_manager'], 'page', 'number', TRUE,
     '{"warning":5,"critical":10}'::jsonb, 2),
    ('risk', '/risk', 'mitigated_risks', 'kpi.mitigated_risks', 'count',
     'risk.resource.treatment', 'risk.read', ARRAY['risk_manager'], 'page', 'number', TRUE,
     NULL::jsonb, 3),
    -- Audit KPIs
    ('audit', '/audit', 'audit_events_today', 'kpi.audit_events_today', 'count',
     'audit.resource.trail', 'audit.read', ARRAY['auditor'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('audit', '/audit', 'pending_reports', 'kpi.pending_reports', 'count',
     'audit.resource.reports', 'audit.read', ARRAY['auditor'], 'page', 'number', FALSE,
     NULL::jsonb, 2),
    -- Policy KPIs
    ('policy', '/policy', 'active_policies', 'kpi.active_policies', 'count',
     'policy.resource.library', 'policy.read', ARRAY['policy_manager'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('policy', '/policy', 'pending_approvals', 'kpi.pending_approvals', 'count',
     'policy.resource.approvals', 'policy.read', ARRAY['policy_manager'], 'page', 'number', FALSE,
     '{"warning":5,"critical":10}'::jsonb, 2),
    -- AI-OS KPIs
    ('ai-os', '/ai-hub', 'active_agents', 'kpi.active_agents', 'count',
     'ai.resource.agents', 'ai.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('ai-os', '/ai-hub', 'model_usage', 'kpi.model_usage', 'tokens',
     'ai.resource.models', 'ai.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":1000000,"critical":5000000}'::jsonb, 2)
  ) AS x(module_code, route, kpi_key, label_key, unit, data_resource, permission,
         profiles, scope, format, trend_enabled, threshold, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_kpis k
  WHERE k.tenant_id IS NULL
    AND k.module_code = x.module_code
    AND COALESCE(k.route, '*') = COALESCE(x.route, '*')
    AND k.kpi_key = x.kpi_key
);

-- =====================================================================
-- 9. DATA RESOURCES - Data Binding Definitions
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  -- Foundation Data Resources
  (NULL, 'foundation', 'workspace.resource.users', 'api', '/api/foundation/users',
   'workspace.read', 300, 'foundation.users.changed',
   '{"limit":50,"offset":0}'::jsonb, 'UserDTO', TRUE),
  (NULL, 'foundation', 'workspace.resource.orgs', 'api', '/api/foundation/organizations',
   'workspace.read', 300, 'foundation.orgs.changed',
   '{"limit":50,"offset":0}'::jsonb, 'OrganizationDTO', TRUE),
  (NULL, 'foundation', 'foundation.resource.roles', 'api', '/api/foundation/roles',
   'foundation.roles.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'RoleDTO', TRUE),
  (NULL, 'foundation', 'foundation.resource.perms', 'api', '/api/foundation/permissions',
   'foundation.perms.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'PermissionDTO', TRUE),
  -- Compliance Data Resources
  (NULL, 'compliance', 'compliance.resource.controls', 'api', '/api/compliance/controls',
   'compliance.read', 300, 'compliance.controls.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ControlDTO', TRUE),
  (NULL, 'compliance', 'compliance.resource.frameworks', 'api', '/api/compliance/frameworks',
   'compliance.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'FrameworkDTO', TRUE),
  (NULL, 'compliance', 'compliance.resource.gaps', 'api', '/api/compliance/gaps',
   'compliance.read', 300, 'compliance.gaps.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GapDTO', TRUE),
  (NULL, 'compliance', 'compliance.resource.assessments', 'api', '/api/compliance/assessments',
   'compliance.read', 300, 'compliance.assessments.changed',
   '{"limit":50,"offset":0}'::jsonb, 'AssessmentDTO', TRUE),
  -- Risk Data Resources
  (NULL, 'risk', 'risk.resource.register', 'api', '/api/risk/register',
   'risk.read', 300, 'risk.register.changed',
   '{"limit":50,"offset":0}'::jsonb, 'RiskDTO', TRUE),
  (NULL, 'risk', 'risk.resource.assessment', 'api', '/api/risk/assessment',
   'risk.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'RiskAssessmentDTO', TRUE),
  (NULL, 'risk', 'risk.resource.treatment', 'api', '/api/risk/treatment',
   'risk.read', 300, 'risk.treatment.changed',
   '{"limit":50,"offset":0}'::jsonb, 'TreatmentDTO', TRUE),
  -- Audit Data Resources
  (NULL, 'audit', 'audit.resource.trail', 'api', '/api/audit/trail',
   'audit.read', 300, 'audit.trail.changed',
   '{"limit":50,"offset":0}'::jsonb, 'AuditTrailDTO', TRUE),
  (NULL, 'audit', 'audit.resource.reports', 'api', '/api/audit/reports',
   'audit.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'AuditReportDTO', TRUE),
  -- Policy Data Resources
  (NULL, 'policy', 'policy.resource.library', 'api', '/api/policy/library',
   'policy.read', 300, 'policy.library.changed',
   '{"limit":50,"offset":0}'::jsonb, 'PolicyDTO', TRUE),
  (NULL, 'policy', 'policy.resource.approvals', 'api', '/api/policy/approvals',
   'policy.read', 300, 'policy.approvals.changed',
   '{"limit":50,"offset":0}'::jsonb, 'PolicyApprovalDTO', TRUE),
  -- AI-OS Data Resources
  (NULL, 'ai-os', 'ai.resource.agents', 'api', '/api/ai/agents',
   'ai.read', 300, 'ai.agents.changed',
   '{"limit":50,"offset":0}'::jsonb, 'AgentDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.models', 'api', '/api/ai/models',
   'ai.read', 300, 'ai.models.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ModelDTO', TRUE)
ON CONFLICT (module_code, resource_key, COALESCE(tenant_id, '*')) DO UPDATE
  SET url_or_query = EXCLUDED.url_or_query,
      permission = EXCLUDED.permission,
      cache_ttl_sec = EXCLUDED.cache_ttl_sec,
      realtime_topic = EXCLUDED.realtime_topic,
      shape_ref = EXCLUDED.shape_ref;

-- =====================================================================
-- 10. SHELL LAYOUTS - Module Shell Layouts
-- =====================================================================
INSERT INTO dos.dynamic_ui_shells
  (module_code, layout_version, layout)
VALUES
  ('foundation', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb),
  ('compliance', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb),
  ('risk', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb),
  ('audit', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb),
  ('policy', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb),
  ('ai-os', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb),
  ('config-center', 'v1',
   '{"header":{"showLogo":true,"showUserMenu":true,"showLanguageSwitch":true},"sidebar":{"showNavigation":true,"collapsible":true},"main":{"showBreadcrumbs":true},"footer":{"showVersion":true}}'::jsonb)
ON CONFLICT (module_code, layout_version) DO UPDATE
  SET layout = EXCLUDED.layout,
      updated_at = NOW();

-- =====================================================================
-- 11. INTENTS - Voice Command Intents
-- =====================================================================
INSERT INTO dos.dynamic_ui_intents
  (tenant_id, module_code, intent_key, utterance_en, utterance_ar,
   route, action_id, permission, is_active)
VALUES
  (NULL, 'foundation', 'intent.create_user', 'create a new user', 'إنشاء مستخدم جديد',
   '/foundation/users', 'create_user', 'foundation.users.create', TRUE),
  (NULL, 'foundation', 'intent.show_users', 'show me users', 'أظهر لي المستخدمين',
   '/foundation/users', NULL, 'foundation.users.read', TRUE),
  (NULL, 'compliance', 'intent.start_assessment', 'start compliance assessment', 'بدء تقييم الامتثال',
   '/compliance/assessments', 'start_assessment', 'compliance.assessments.start', TRUE),
  (NULL, 'compliance', 'intent.show_gaps', 'show compliance gaps', 'أظهر فجوات الامتثال',
   '/compliance/gaps', NULL, 'compliance.gaps.read', TRUE),
  (NULL, 'risk', 'intent.show_risks', 'show risk register', 'أظهر سجل المخاطر',
   '/risk/register', NULL, 'risk.register.read', TRUE),
  (NULL, 'risk', 'intent.assess_risk', 'assess this risk', 'قيم هذا الخطر',
   '/risk/register', 'assess_risk', 'risk.assess', TRUE),
  (NULL, 'audit', 'intent.export_audit', 'export audit trail', 'تصدير سجل التدقيق',
   '/audit/trail', 'export_audit', 'audit.export', TRUE),
  (NULL, 'policy', 'intent.create_policy', 'create new policy', 'إنشاء سياسة جديدة',
   '/policy/library', 'create_policy', 'policy.create', TRUE),
  (NULL, 'ai-os', 'intent.show_agents', 'show AI agents', 'أظهر وكلاء الذكاء الاصطناعي',
   '/ai/agents', NULL, 'ai.agents.read', TRUE),
  (NULL, 'ai-os', 'intent.register_agent', 'register new agent', 'تسجيل وكيل جديد',
   '/ai/agents', 'register_agent', 'ai.agents.register', TRUE)
ON CONFLICT (module_code, intent_key, COALESCE(tenant_id, '*')) DO UPDATE
  SET utterance_en = EXCLUDED.utterance_en,
      utterance_ar = EXCLUDED.utterance_ar,
      route = EXCLUDED.route,
      action_id = EXCLUDED.action_id;

-- =====================================================================
-- 12. THEME TOKENS - Module Theme Overrides
-- =====================================================================
INSERT INTO dos.dynamic_ui_theme_tokens
  (tenant_id, module_code, token_key, token_value, scope, route, is_active)
VALUES
  (NULL, 'compliance', 'accent-color', '#0052cc', 'global', NULL, TRUE),
  (NULL, 'compliance', 'accent-secondary', '#00b8d4', 'global', NULL, TRUE),
  (NULL, 'risk', 'accent-color', '#ff4d4f', 'global', NULL, TRUE),
  (NULL, 'risk', 'accent-secondary', '#ff9c6e', 'global', NULL, TRUE),
  (NULL, 'audit', 'accent-color', '#faad14', 'global', NULL, TRUE),
  (NULL, 'audit', 'accent-secondary', '#ffc53d', 'global', NULL, TRUE),
  (NULL, 'policy', 'accent-color', '#52c41a', 'global', NULL, TRUE),
  (NULL, 'policy', 'accent-secondary', '#95de64', 'global', NULL, TRUE),
  (NULL, 'ai-os', 'accent-color', '#722ed1', 'global', NULL, TRUE),
  (NULL, 'ai-os', 'accent-secondary', '#b37feb', 'global', NULL, TRUE)
ON CONFLICT (token_key, COALESCE(module_code, '*'), COALESCE(route, '*'), COALESCE(tenant_id, '*')) DO UPDATE
  SET token_value = EXCLUDED.token_value;

COMMIT;

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================
-- Verify module count:
-- SELECT module_code, display_name FROM dos.dynamic_ui_modules ORDER BY module_code;
-- Expected: 30+ modules

-- Verify navigation entries:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_navigation GROUP BY module_code;
-- Expected: Each module has 1-6 nav entries

-- Verify routes:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_routes GROUP BY module_code;
-- Expected: Each module has 1-6 routes

-- Verify agents:
-- SELECT agent_id, name_key FROM dos.dynamic_ui_agents ORDER BY agent_id;
-- Expected: 13 agents (A01-A13)

-- Verify page agents:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_page_agents GROUP BY module_code;
-- Expected: Foundation 5, Compliance 6, Risk 4, Audit 3, Policy 3, AI-OS 4

-- Verify actions:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_actions GROUP BY module_code;
-- Expected: Each module has 1-5 actions

-- Verify widgets:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_widgets GROUP BY module_code;
-- Expected: Each module has 1-5 widgets

-- Verify KPIs:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_kpis GROUP BY module_code;
-- Expected: Each module has 1-5 KPIs

-- Verify data resources:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_data_resources GROUP BY module_code;
-- Expected: Each module has 1-4 data resources

-- Verify shell layouts:
-- SELECT module_code, layout_version FROM dos.dynamic_ui_shells;
-- Expected: 7 modules with v1 layouts

-- Verify intents:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_intents GROUP BY module_code;
-- Expected: 10 intents across modules

-- Verify theme tokens:
-- SELECT module_code, COUNT(*) FROM dos.dynamic_ui_theme_tokens GROUP BY module_code;
-- Expected: 5 modules with theme tokens
