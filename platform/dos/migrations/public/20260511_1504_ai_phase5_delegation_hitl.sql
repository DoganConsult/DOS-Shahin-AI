-- AI Module Wave Enforcement - Phase 5
-- Seed Delegation and HITL pages
-- Owner: ui-os-service
--
-- This migration seeds the Delegation and HITL UI pages:
-- 1. /ai/delegations - Agent delegation management
-- 2. /ai/hitl - HITL state management
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. COMPONENT REGISTRY - Delegation and HITL Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('ai.delegations.page', 'ibm-carbon', 'structured-list', 'approved'),
  ('ai.hitl.page', 'ibm-carbon', 'table', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. DYNAMIC UI ROUTES - Delegation and HITL Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, x.module_code, x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, x.scope, TRUE,
       x.title_key, x.subtitle_key, x.data_resource, x.def_view,
       TRUE, TRUE
  FROM (VALUES
    ('ai-os', '/ai/delegations', 'ai.delegations.page', 'ai.delegations.read',
     590, 'list', 'full-page', 'none', 'view', 'tenant',
     'ai.delegations.title', 'ai.delegations.subtitle',
     'ai.resource.delegations', 'structured-list'),
    ('ai-os', '/ai/hitl', 'ai.hitl.page', 'ai.hitl.read',
     600, 'list', 'full-page', 'none', 'view', 'tenant',
     'ai.hitl.title', 'ai.hitl.subtitle',
     'ai.resource.hitl_states', 'table')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, title_key, subtitle_key, data_resource, def_view)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 3. NAVIGATION - Delegation and HITL Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'ai-os', 'Delegations', '/ai/delegations', 590, NULL, 'active'),
  (NULL, 'ai-os', 'HITL', '/ai/hitl', 600, NULL, 'active')
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      updated_at = NOW();

-- =====================================================================
-- 4. ACTIONS - Delegation and HITL Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, profiles, risk_level, requires_approval, workflow_code,
   evidence_required, handler_key, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.action_id, x.position, x.label_key,
       x.icon, x.permission, x.profiles, x.risk_level, x.requires_approval,
       x.workflow_code, x.evidence_required, x.handler_key, x.sort, TRUE
  FROM (VALUES
    -- Delegation Actions
    ('ai-os', '/ai/delegations', 'grant_delegation', 'toolbar', 'actions.grant_delegation', 'add',
     'ai.delegations.write', ARRAY['ai_admin'], 'high', TRUE, 'ai_delegation_workflow', TRUE, 'grant_delegation', 1),
    ('ai-os', '/ai/delegations', 'revoke_delegation', 'row', 'actions.revoke_delegation', 'delete',
     'ai.delegations.write', ARRAY['ai_admin'], 'high', TRUE, 'ai_delegation_workflow', TRUE, 'revoke_delegation', 2),
    ('ai-os', '/ai/delegations', 'view_delegation_chain', 'row', 'actions.view_delegation_chain', 'tree',
     'ai.delegations.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_delegation_chain', 3),
    -- HITL Actions
    ('ai-os', '/ai/hitl', 'approve_action', 'row', 'actions.approve_action', 'check',
     'ai.hitl.write', ARRAY['ai_admin'], 'medium', TRUE, 'ai_hitl_approval', TRUE, 'approve_action', 1),
    ('ai-os', '/ai/hitl', 'reject_action', 'row', 'actions.reject_action', 'close',
     'ai.hitl.write', ARRAY['ai_admin'], 'medium', TRUE, 'ai_hitl_approval', TRUE, 'reject_action', 2),
    ('ai-os', '/ai/hitl', 'configure_hitl_gate', 'toolbar', 'actions.configure_hitl_gate', 'settings',
     'ai.hitl.admin', ARRAY['ai_admin'], 'high', TRUE, NULL, TRUE, 'configure_hitl_gate', 3)
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
    ('ai-os', '/ai/delegations', 'A01', TRUE, 'panel', ARRAY['ai_admin'], 'ai.delegations.read', 1),
    ('ai-os', '/ai/hitl', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.hitl.read', 1)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

-- =====================================================================
-- 6. DATA RESOURCES - Delegation and HITL Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.delegations', 'api', '/api/ai/delegations',
   'ai.delegations.read', 60, 'ai.delegations.changed',
   '{"limit":50,"offset":0}'::jsonb, 'DelegationDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.hitl_states', 'api', '/api/ai/hitl/states',
   'ai.hitl.read', 60, 'ai.hitl.states.changed',
   '{"limit":50,"offset":0}'::jsonb, 'HITLStateDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.hitl_gates', 'api', '/api/ai/hitl/gates',
   'ai.hitl.read', 300, NULL,
   '{"limit":50,"offset":0}'::jsonb, 'HITLGateDTO', TRUE)
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
-- SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE path_pattern IN ('/ai/delegations','/ai/hitl');
-- Expected: 2

-- Verify delegation and HITL agent placements:
-- SELECT COUNT(*) FROM dos.dynamic_ui_page_agents WHERE route IN ('/ai/delegations','/ai/hitl');
-- Expected: 2
