-- AI Module Wave Enforcement - Phase 3
-- Seed Budget and Kill Switch pages
-- Owner: ui-os-service
--
-- This migration seeds the Budget and Kill Switch UI pages:
-- 1. /ai/budgets - Budget management
-- 2. /ai/kill-switches - Kill switch management
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. COMPONENT REGISTRY - Budget and Kill Switch Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('ai.budgets.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.kill_switches.page', 'ibm-carbon', 'grid', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. DYNAMIC UI ROUTES - Budget and Kill Switch Pages
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
    ('ai-os', '/ai/budgets', 'ai.budgets.page', 'ai.budgets.read',
     550, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     'ai.budgets.title', 'ai.budgets.subtitle',
     'ai.resource.budgets', 'tiles'),
    ('ai-os', '/ai/kill-switches', 'ai.kill_switches.page', 'ai.kill_switches.read',
     560, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     'ai.kill_switches.title', 'ai.kill_switches.subtitle',
     'ai.resource.kill_switches', 'tiles')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, title_key, subtitle_key, data_resource, def_view)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 3. NAVIGATION - Budget and Kill Switch Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'ai-os', 'Budgets', '/ai/budgets', 550, NULL, 'active'),
  (NULL, 'ai-os', 'Kill Switches', '/ai/kill-switches', 560, NULL, 'active')
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
    ('ai-os', '/ai/budgets', 'A07', TRUE, 'panel', ARRAY['ai_admin'], 'ai.budgets.read', 1),
    ('ai-os', '/ai/budgets', 'A04', FALSE, 'panel', ARRAY['ai_admin'], 'ai.budgets.read', 2),
    ('ai-os', '/ai/kill-switches', 'A07', TRUE, 'panel', ARRAY['ai_admin'], 'ai.kill_switches.read', 1),
    ('ai-os', '/ai/kill-switches', 'A08', FALSE, 'panel', ARRAY['ai_admin'], 'ai.kill_switches.read', 2)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

-- =====================================================================
-- 5. KPIS - Budget and Kill Switch Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit,
   data_resource, permission, profiles, scope, format, trend_enabled,
   threshold, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.kpi_key, x.label_key, x.unit,
       x.data_resource, x.permission, x.profiles, x.scope, x.format,
       x.trend_enabled, x.threshold, x.sort, TRUE
  FROM (VALUES
    -- Budget KPIs
    ('ai-os', '/ai/budgets', 'budget_remaining', 'kpi.ai.budget_remaining', 'usd',
     'ai.resource.budgets', 'ai.budgets.read', ARRAY['ai_admin'], 'page', 'currency', TRUE,
     '{"warning":1000,"critical":500}'::jsonb, 1),
    ('ai-os', '/ai/budgets', 'budget_used', 'kpi.ai.budget_used', 'usd',
     'ai.resource.budget.usage', 'ai.budgets.read', ARRAY['ai_admin'], 'page', 'currency', TRUE,
     NULL::jsonb, 2),
    ('ai-os', '/ai/budgets', 'cost_projection', 'kpi.ai.cost_projection', 'usd',
     'ai.resource.budget.usage', 'ai.budgets.read', ARRAY['ai_admin'], 'page', 'currency', TRUE,
     NULL::jsonb, 3),
    -- Kill Switch KPIs
    ('ai-os', '/ai/kill-switches', 'active_kill_switches', 'kpi.ai.active_kill_switches', 'count',
     'ai.resource.kill_switches', 'ai.kill_switches.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":1,"critical":5}'::jsonb, 1),
    ('ai-os', '/ai/kill-switches', 'circuit_breaker_state', 'kpi.ai.circuit_breaker_state', 'state',
     'ai.resource.circuit_breaker', 'ai.kill_switches.read', ARRAY['ai_admin'], 'page', 'text', FALSE,
     NULL::jsonb, 2),
    ('ai-os', '/ai/kill-switches', 'blocked_requests', 'kpi.ai.blocked_requests', 'count',
     'ai.resource.kill_switches', 'ai.kill_switches.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 3)
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
-- 6. DATA RESOURCES - Budget and Kill Switch Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.budgets', 'api', '/api/ai/budgets',
   'ai.budgets.read', 300, 'ai.budgets.changed',
   '{"limit":50,"offset":0}'::jsonb, 'BudgetDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.budget.usage', 'api', '/api/ai/budgets/usage',
   'ai.budgets.read', 60, 'ai.budget.usage.changed',
   '{"limit":50,"offset":0}'::jsonb, 'BudgetUsageDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.kill_switches', 'api', '/api/ai/kill-switches',
   'ai.kill_switches.read', 60, 'ai.kill_switches.changed',
   '{"limit":50,"offset":0}'::jsonb, 'KillSwitchDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.circuit_breaker', 'api', '/api/ai/circuit-breaker',
   'ai.kill_switches.read', 60, 'ai.circuit_breaker.changed',
   '{"limit":50,"offset":0}'::jsonb, 'CircuitBreakerDTO', TRUE)
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
-- SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE path_pattern IN ('/ai/budgets','/ai/kill-switches');
-- Expected: 2

-- Verify budget and kill switch KPIs:
-- SELECT COUNT(*) FROM dos.dynamic_ui_kpis WHERE route IN ('/ai/budgets','/ai/kill-switches');
-- Expected: 6
