-- AI Module Wave Enforcement - Phase 4
-- Seed Prompt and Context Source pages
-- Owner: ui-os-service
--
-- This migration seeds the Prompt and Context Source UI pages:
-- 1. /ai/prompts - Prompt template management
-- 2. /ai/context-sources - Context source management
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. COMPONENT REGISTRY - Prompt and Context Source Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('ai.prompts.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.context_sources.page', 'ibm-carbon', 'table', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. DYNAMIC UI ROUTES - Prompt and Context Source Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, x.module_code, x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, x.scope, FALSE,
       x.title_key, x.subtitle_key, x.data_resource, x.def_view,
       TRUE, FALSE
  FROM (VALUES
    ('ai-os', '/ai/prompts', 'ai.prompts.page', 'ai.prompts.read',
     570, 'list', 'full-page', 'none', 'view', 'tenant',
     'ai.prompts.title', 'ai.prompts.subtitle',
     'ai.resource.prompts', 'table'),
    ('ai-os', '/ai/context-sources', 'ai.context_sources.page', 'ai.context_sources.read',
     580, 'list', 'full-page', 'none', 'view', 'tenant',
     'ai.context_sources.title', 'ai.context_sources.subtitle',
     'ai.resource.context_sources', 'table')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, title_key, subtitle_key, data_resource, def_view)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 3. NAVIGATION - Prompt and Context Source Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'ai-os', 'Prompts', '/ai/prompts', 570, NULL, 'active'),
  (NULL, 'ai-os', 'Context Sources', '/ai/context-sources', 580, NULL, 'active')
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      updated_at = NOW();

-- =====================================================================
-- 4. ACTIONS - Prompt and Context Source Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, profiles, risk_level, requires_approval, workflow_code,
   evidence_required, handler_key, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.action_id, x.position, x.label_key,
       x.icon, x.permission, x.profiles, x.risk_level, x.requires_approval,
       x.workflow_code, x.evidence_required, x.handler_key, x.sort, TRUE
  FROM (VALUES
    -- Prompt Actions
    ('ai-os', '/ai/prompts', 'create_prompt', 'toolbar', 'actions.create_prompt', 'add',
     'ai.prompts.write', ARRAY['ai_admin'], 'medium', FALSE, 'ai_prompt_lifecycle', FALSE, 'create_prompt', 1),
    ('ai-os', '/ai/prompts', 'edit_prompt', 'row', 'actions.edit_prompt', 'edit',
     'ai.prompts.write', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'edit_prompt', 2),
    ('ai-os', '/ai/prompts', 'test_prompt', 'row', 'actions.test_prompt', 'play',
     'ai.prompts.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'test_prompt', 3),
    ('ai-os', '/ai/prompts', 'publish_prompt', 'row', 'actions.publish_prompt', 'check',
     'ai.prompts.write', ARRAY['ai_admin'], 'medium', TRUE, 'ai_prompt_lifecycle', TRUE, 'publish_prompt', 4),
    -- Context Source Actions
    ('ai-os', '/ai/context-sources', 'add_context_source', 'toolbar', 'actions.add_context_source', 'add',
     'ai.context_sources.write', ARRAY['ai_admin'], 'medium', FALSE, NULL, FALSE, 'add_context_source', 1),
    ('ai-os', '/ai/context-sources', 'remove_context_source', 'row', 'actions.remove_context_source', 'delete',
     'ai.context_sources.write', ARRAY['ai_admin'], 'high', TRUE, NULL, TRUE, 'remove_context_source', 2),
    ('ai-os', '/ai/context-sources', 'test_connection', 'row', 'actions.test_connection', 'check',
     'ai.context_sources.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'test_connection', 3)
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
-- 5. PAGE AGENTS - Agent Placement
-- =====================================================================
INSERT INTO dos.dynamic_ui_page_agents
  (tenant_id, module_code, route, agent_id, is_primary, presentation,
   profiles, permission, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.agent_id, x.is_primary, x.presentation,
       x.profiles, x.permission, x.sort, TRUE
  FROM (VALUES
    ('ai-os', '/ai/prompts', 'A01', TRUE, 'panel', ARRAY['ai_admin'], 'ai.prompts.read', 1),
    ('ai-os', '/ai/context-sources', 'A02', TRUE, 'panel', ARRAY['ai_admin'], 'ai.context_sources.read', 1)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

-- =====================================================================
-- 6. DATA RESOURCES - Prompt and Context Source Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.prompts', 'api', '/api/ai/prompts',
   'ai.prompts.read', 300, 'ai.prompts.changed',
   '{"limit":50,"offset":0}'::jsonb, 'PromptDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.prompt_templates', 'api', '/api/ai/prompt-templates',
   'ai.prompts.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'PromptTemplateDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.context_sources', 'api', '/api/ai/context-sources',
   'ai.context_sources.read', 300, 'ai.context_sources.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ContextSourceDTO', TRUE)
ON CONFLICT (module_code, resource_key, COALESCE(tenant_id, '*')) DO UPDATE
  SET url_or_query = EXCLUDED.url_or_query,
      permission = EXCLUDED.permission,
      cache_ttl_sec = EXCLUDED.cache_ttl_sec,
      realtime_topic = EXCLUDED.realtime_topic,
      shape_ref = EXCLUDED.shape_ref;

COMMIT;

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================
-- Verify 2 pages seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE path_pattern IN ('/ai/prompts','/ai/context-sources');
-- Expected: 2

-- Verify prompt and context actions:
-- SELECT COUNT(*) FROM dos.dynamic_ui_actions WHERE route IN ('/ai/prompts','/ai/context-sources');
-- Expected: 7
