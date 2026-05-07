-- AI Module Wave Enforcement - Phase 1
-- Seed core AI-OS pages (Gateway, Engine, Kernel)
-- Owner: ui-os-service
--
-- This migration seeds the core AI-OS UI pages:
-- 1. /ai/gateway - AI Gateway management (provider routing, quota, cost, rate limit)
-- 2. /ai/engine - AI Engine management (inference, agents, kernel, Temporal, LangGraph)
-- 3. /ai/kernel - AI-OS Kernel status (process table, scheduler, IPC, memory, log)
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. COMPONENT REGISTRY - AI Core Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('ai.gateway.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.engine.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.kernel.page', 'ibm-carbon', 'grid', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. DYNAMIC UI ROUTES - Core AI Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, x.module_code, x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, x.scope, FALSE,
       x.title_key, x.subtitle_key, x.data_resource, x.def_view,
       TRUE, TRUE
  FROM (VALUES
    ('ai-os', '/ai/gateway', 'ai.gateway.page', 'ai.gateway.read',
     500, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     'ai.gateway.title', 'ai.gateway.subtitle',
     'ai.resource.gateway.stats', 'tiles'),
    ('ai-os', '/ai/engine', 'ai.engine.page', 'ai.engine.read',
     510, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     'ai.engine.title', 'ai.engine.subtitle',
     'ai.resource.engine.status', 'tiles'),
    ('ai-os', '/ai/kernel', 'ai.kernel.page', 'ai.kernel.read',
     520, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     'ai.kernel.title', 'ai.kernel.subtitle',
     'ai.resource.engine.status', 'grid')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, title_key, subtitle_key, data_resource, def_view)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 3. NAVIGATION - Core AI Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'ai-os', 'AI Gateway', '/ai/gateway', 500, NULL, 'active'),
  (NULL, 'ai-os', 'AI Engine', '/ai/engine', 510, NULL, 'active'),
  (NULL, 'ai-os', 'AI Kernel', '/ai/kernel', 520, NULL, 'active')
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      updated_at = NOW();

-- =====================================================================
-- 4. PAGE AGENTS - Agent Placement
-- =====================================================================
INSERT INTO dos.dynamic_ui_page_agents
  (tenant_id, module_code, route, agent_id, is_primary, presentation,
   profiles, permission, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.agent_id, x.is_primary, x.presentation,
       x.profiles, x.permission, x.sort, TRUE
  FROM (VALUES
    ('ai-os', '/ai/gateway', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.gateway.read', 1),
    ('ai-os', '/ai/gateway', 'A07', FALSE, 'panel', ARRAY['ai_admin'], 'ai.gateway.read', 2),
    ('ai-os', '/ai/engine', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.engine.read', 1),
    ('ai-os', '/ai/engine', 'A02', FALSE, 'panel', ARRAY['ai_admin'], 'ai.engine.read', 2),
    ('ai-os', '/ai/kernel', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.kernel.read', 1)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

-- =====================================================================
-- 5. WIDGETS - Core AI Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_widgets
  (tenant_id, module_code, route, widget_key, zone, permission,
   profiles, config, sort_order, is_signature, is_active)
SELECT NULL, x.module_code, x.route, x.widget_key, x.zone, x.permission,
       x.profiles, x.config, x.sort, FALSE, TRUE
  FROM (VALUES
    ('ai-os', '/ai/gateway', 'gateway_overview', 'masthead', 'ai.gateway.read',
     ARRAY['ai_admin'], '{"title":"AI Gateway Overview","showStats":true}'::jsonb, 1),
    ('ai-os', '/ai/gateway', 'quota_widget', 'kpi-strip', 'ai.gateway.read',
     ARRAY['ai_admin'], '{"kpis":["quota_usage","cost_today","request_latency"]}'::jsonb, 2),
    ('ai-os', '/ai/gateway', 'request_chart', 'main', 'ai.gateway.read',
     ARRAY['ai_admin'], '{"type":"line","metric":"total_requests"}'::jsonb, 3),
    ('ai-os', '/ai/engine', 'engine_overview', 'masthead', 'ai.engine.read',
     ARRAY['ai_admin'], '{"title":"AI Engine Overview","showStats":true}'::jsonb, 1),
    ('ai-os', '/ai/engine', 'engine_kpi_strip', 'kpi-strip', 'ai.engine.read',
     ARRAY['ai_admin'], '{"kpis":["active_inferences","agent_executions","kernel_uptime"]}'::jsonb, 2),
    ('ai-os', '/ai/engine', 'process_table', 'main', 'ai.engine.read',
     ARRAY['ai_admin'], '{"columns":["process_id","agent_id","status","cpu","memory"]}'::jsonb, 3),
    ('ai-os', '/ai/kernel', 'kernel_status', 'masthead', 'ai.kernel.read',
     ARRAY['ai_admin'], '{"title":"AI-OS Kernel Status","showStats":true}'::jsonb, 1),
    ('ai-os', '/ai/kernel', 'process_table', 'main', 'ai.kernel.read',
     ARRAY['ai_admin'], '{"columns":["pid","name","state","runtime"]}'::jsonb, 2)
  ) AS x(module_code, route, widget_key, zone, permission, profiles, config, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_widgets w
  WHERE w.tenant_id IS NULL
    AND w.module_code = x.module_code
    AND w.route = x.route
    AND w.widget_key = x.widget_key
);

-- =====================================================================
-- 6. KPIS - Core AI Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit,
   data_resource, permission, profiles, scope, format, trend_enabled,
   threshold, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.kpi_key, x.label_key, x.unit,
       x.data_resource, x.permission, x.profiles, x.scope, x.format,
       x.trend_enabled, x.threshold, x.sort, TRUE
  FROM (VALUES
    -- Gateway KPIs
    ('ai-os', '/ai/gateway', 'total_requests', 'kpi.ai.total_requests', 'count',
     'ai.resource.gateway.stats', 'ai.gateway.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('ai-os', '/ai/gateway', 'request_latency', 'kpi.ai.request_latency', 'ms',
     'ai.resource.gateway.stats', 'ai.gateway.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":1000,"critical":5000}'::jsonb, 2),
    ('ai-os', '/ai/gateway', 'quota_usage', 'kpi.ai.quota_usage', 'percent',
     'ai.resource.gateway.quota', 'ai.gateway.read', ARRAY['ai_admin'], 'page', 'percentage', TRUE,
     '{"warning":80,"critical":95}'::jsonb, 3),
    ('ai-os', '/ai/gateway', 'cost_today', 'kpi.ai.cost_today', 'usd',
     'ai.resource.gateway.cost', 'ai.gateway.read', ARRAY['ai_admin'], 'page', 'currency', TRUE,
     NULL::jsonb, 4),
    -- Engine KPIs
    ('ai-os', '/ai/engine', 'active_inferences', 'kpi.ai.active_inferences', 'count',
     'ai.resource.engine.status', 'ai.engine.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('ai-os', '/ai/engine', 'agent_executions', 'kpi.ai.agent_executions', 'count',
     'ai.resource.engine.status', 'ai.engine.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 2),
    ('ai-os', '/ai/engine', 'kernel_uptime', 'kpi.ai.kernel_uptime', 'seconds',
     'ai.resource.engine.status', 'ai.engine.read', ARRAY['ai_admin'], 'page', 'number', FALSE,
     NULL::jsonb, 3),
    ('ai-os', '/ai/engine', 'process_count', 'kpi.ai.process_count', 'count',
     'ai.resource.engine.processes', 'ai.engine.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 4),
    -- Kernel KPIs
    ('ai-os', '/ai/kernel', 'kernel_processes', 'kpi.ai.kernel_processes', 'count',
     'ai.resource.engine.processes', 'ai.kernel.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('ai-os', '/ai/kernel', 'kernel_memory', 'kpi.ai.kernel_memory', 'mb',
     'ai.resource.engine.status', 'ai.kernel.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":1024,"critical":2048}'::jsonb, 2)
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
-- 7. DATA RESOURCES - Core AI Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.gateway.stats', 'api', '/api/ai/stats',
   'ai.gateway.read', 60, 'ai.gateway.stats.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GatewayStatsDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.gateway.quota', 'api', '/api/ai/quota',
   'ai.gateway.read', 300, 'ai.gateway.quota.changed',
   '{"limit":50,"offset":0}'::jsonb, 'QuotaDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.gateway.cost', 'api', '/api/ai/cost',
   'ai.gateway.read', 300, 'ai.gateway.cost.changed',
   '{"limit":50,"offset":0}'::jsonb, 'CostDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.engine.status', 'api', '/api/ai-engine/status',
   'ai.engine.read', 60, 'ai.engine.status.changed',
   '{"limit":50,"offset":0}'::jsonb, 'EngineStatusDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.engine.processes', 'api', '/api/ai-engine/processes',
   'ai.engine.read', 60, 'ai.engine.processes.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ProcessDTO', TRUE)
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
-- Verify 3 core pages seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE path_pattern IN ('/ai/gateway','/ai/engine','/ai/kernel');
-- Expected: 3

-- Verify AI component keys registered:
-- SELECT COUNT(*) FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'ai.%';
-- Expected: 3+

-- Verify navigation entries:
-- SELECT COUNT(*) FROM dos.dynamic_ui_navigation WHERE module_code='ai-os' AND route IN ('/ai/gateway','/ai/engine','/ai/kernel');
-- Expected: 3

-- Verify agent placements:
-- SELECT COUNT(*) FROM dos.dynamic_ui_page_agents WHERE module_code='ai-os' AND route IN ('/ai/gateway','/ai/engine','/ai/kernel');
-- Expected: 5

-- Verify widgets:
-- SELECT COUNT(*) FROM dos.dynamic_ui_widgets WHERE module_code='ai-os' AND route IN ('/ai/gateway','/ai/engine','/ai/kernel');
-- Expected: 8

-- Verify KPIs:
-- SELECT COUNT(*) FROM dos.dynamic_ui_kpis WHERE module_code='ai-os' AND route IN ('/ai/gateway','/ai/engine','/ai/kernel');
-- Expected: 10

-- Verify data resources:
-- SELECT COUNT(*) FROM dos.dynamic_ui_data_resources WHERE resource_key LIKE 'ai.resource.%';
-- Expected: 5
