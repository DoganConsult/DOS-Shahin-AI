-- AI Module Wave Enforcement - Phase 6
-- Seed Code Search pages
-- Owner: ui-os-service
--
-- This migration seeds the Code Search UI page:
-- 1. /ai/code-search - Code search engine registry
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. COMPONENT REGISTRY - Code Search Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('ai.code_search.page', 'ibm-carbon', 'grid', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. DYNAMIC UI ROUTES - Code Search Page
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
    ('ai-os', '/ai/code-search', 'ai.code_search.page', 'ai.code_search.read',
     610, 'overview', 'dashboard', 'module-overview', 'view', 'tenant',
     'ai.code_search.title', 'ai.code_search.subtitle',
     'ai.resource.code_search.engines', 'tiles')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, title_key, subtitle_key, data_resource, def_view)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 3. NAVIGATION - Code Search Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'ai-os', 'Code Search', '/ai/code-search', 610, NULL, 'active')
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      updated_at = NOW();

-- =====================================================================
-- 4. ACTIONS - Code Search Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, profiles, risk_level, requires_approval, workflow_code,
   evidence_required, handler_key, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.action_id, x.position, x.label_key,
       x.icon, x.permission, x.profiles, x.risk_level, x.requires_approval,
       x.workflow_code, x.evidence_required, x.handler_key, x.sort, TRUE
  FROM (VALUES
    ('ai-os', '/ai/code-search', 'register_engine', 'toolbar', 'actions.register_engine', 'add',
     'ai.code_search.write', ARRAY['ai_admin'], 'medium', FALSE, NULL, FALSE, 'register_engine', 1),
    ('ai-os', '/ai/code-search', 'index_surface', 'toolbar', 'actions.index_surface', 'database',
     'ai.code_search.write', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'index_surface', 2),
    ('ai-os', '/ai/code-search', 'remove_index', 'row', 'actions.remove_index', 'delete',
     'ai.code_search.write', ARRAY['ai_admin'], 'medium', FALSE, NULL, TRUE, 'remove_index', 3),
    ('ai-os', '/ai/code-search', 'reindex_all', 'toolbar', 'actions.reindex_all', 'refresh',
     'ai.code_search.admin', ARRAY['ai_admin'], 'high', TRUE, NULL, TRUE, 'reindex_all', 4)
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
-- 5. WIDGETS - Code Search Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_widgets
  (tenant_id, module_code, route, widget_key, zone, permission,
   profiles, config, sort_order, is_signature, is_active)
SELECT NULL, x.module_code, x.route, x.widget_key, x.zone, x.permission,
       x.profiles, x.config, x.sort, FALSE, TRUE
  FROM (VALUES
    ('ai-os', '/ai/code-search', 'engine_registry', 'main', 'ai.code_search.read',
     ARRAY['ai_admin'], '{"columns":["engine_id","name","status","indexed_surfaces"]}'::jsonb, 1),
    ('ai-os', '/ai/code-search', 'indexed_surfaces', 'main', 'ai.code_search.read',
     ARRAY['ai_admin'], '{"columns":["surface_id","name","last_indexed","document_count"]}'::jsonb, 2),
    ('ai-os', '/ai/code-search', 'search_stats', 'kpi-strip', 'ai.code_search.read',
     ARRAY['ai_admin'], '{"kpis":["indexed_surfaces","search_queries","search_latency"]}'::jsonb, 3)
  ) AS x(module_code, route, widget_key, zone, permission, profiles, config, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_widgets w
  WHERE w.tenant_id IS NULL
    AND w.module_code = x.module_code
    AND w.route = x.route
    AND w.widget_key = x.widget_key
);

-- =====================================================================
-- 6. KPIS - Code Search Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit,
   data_resource, permission, profiles, scope, format, trend_enabled,
   threshold, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.kpi_key, x.label_key, x.unit,
       x.data_resource, x.permission, x.profiles, x.scope, x.format,
       x.trend_enabled, x.threshold, x.sort, TRUE
  FROM (VALUES
    ('ai-os', '/ai/code-search', 'indexed_surfaces', 'kpi.ai.indexed_surfaces', 'count',
     'ai.resource.code_search.surfaces', 'ai.code_search.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('ai-os', '/ai/code-search', 'search_queries', 'kpi.ai.search_queries', 'count',
     'ai.resource.code_search.engines', 'ai.code_search.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 2),
    ('ai-os', '/ai/code-search', 'search_latency', 'kpi.ai.search_latency', 'ms',
     'ai.resource.code_search.engines', 'ai.code_search.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":500,"critical":1000}'::jsonb, 3)
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
-- 7. PAGE AGENTS - Agent Placement
-- =====================================================================
INSERT INTO dos.dynamic_ui_page_agents
  (tenant_id, module_code, route, agent_id, is_primary, presentation,
   profiles, permission, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.agent_id, x.is_primary, x.presentation,
       x.profiles, x.permission, x.sort, TRUE
  FROM (VALUES
    ('ai-os', '/ai/code-search', 'A01', TRUE, 'panel', ARRAY['ai_admin'], 'ai.code_search.read', 1)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

-- =====================================================================
-- 8. DATA RESOURCES - Code Search Page
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.code_search.engines', 'api', '/api/ai/code-search/engines',
   'ai.code_search.read', 300, 'ai.code_search.engines.changed',
   '{"limit":50,"offset":0}'::jsonb, 'SearchEngineDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.code_search.surfaces', 'api', '/api/ai/code-search/surfaces',
   'ai.code_search.read', 300, 'ai.code_search.surfaces.changed',
   '{"limit":50,"offset":0}'::jsonb, 'IndexedSurfaceDTO', TRUE)
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
-- Verify 1 page seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE path_pattern='/ai/code-search';
-- Expected: 1

-- Verify code search data resources:
-- SELECT COUNT(*) FROM dos.dynamic_ui_data_resources WHERE resource_key LIKE 'ai.resource.code_search%';
-- Expected: 2
