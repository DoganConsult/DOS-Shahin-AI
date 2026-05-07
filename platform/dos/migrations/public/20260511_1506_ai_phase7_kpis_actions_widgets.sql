-- AI Module Wave Enforcement - Phase 7
-- Add all missing KPIs, Actions, Widgets for existing pages
-- Owner: ui-os-service
--
-- This migration adds additional KPIs, Actions, and Widgets to existing AI pages
-- that were seeded in earlier phases but need more comprehensive coverage.
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. ADDITIONAL KPIS - Gateway, Engine, Governance Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit,
   data_resource, permission, profiles, scope, format, trend_enabled,
   threshold, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.kpi_key, x.label_key, x.unit,
       x.data_resource, x.permission, x.profiles, x.scope, x.format,
       x.trend_enabled, x.threshold, x.sort, TRUE
  FROM (VALUES
    -- Additional Gateway KPIs
    ('ai-os', '/ai/gateway', 'rate_limit_hits', 'kpi.ai.rate_limit_hits', 'count',
     'ai.resource.gateway.stats', 'ai.gateway.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":100,"critical":500}'::jsonb, 5),
    -- Additional Engine KPIs
    ('ai-os', '/ai/engine', 'temporal_workflows', 'kpi.ai.temporal_workflows', 'count',
     'ai.resource.engine.workflows', 'ai.engine.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 5),
    -- Governance KPIs
    ('ai-os', '/ai/governance', 'models_registered', 'kpi.ai.models_registered', 'count',
     'ai.resource.governance.models', 'ai.governance.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     NULL::jsonb, 1),
    ('ai-os', '/ai/governance', 'assessments_pending', 'kpi.ai.assessments_pending', 'count',
     'ai.resource.governance.assessments', 'ai.governance.read', ARRAY['ai_admin'], 'page', 'number', FALSE,
     '{"warning":5,"critical":10}'::jsonb, 2),
    ('ai-os', '/ai/governance/bias', 'bias_alerts', 'kpi.ai.bias_alerts', 'count',
     'ai.resource.governance.bias', 'ai.governance.bias.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":1,"critical":5}'::jsonb, 1),
    ('ai-os', '/ai/governance/fairness', 'fairness_score', 'kpi.ai.fairness_score', 'score',
     'ai.resource.governance.fairness', 'ai.governance.fairness.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":0.7,"critical":0.5}'::jsonb, 1),
    ('ai-os', '/ai/governance/ethical', 'ethical_reviews_pending', 'kpi.ai.ethical_reviews_pending', 'count',
     'ai.resource.governance.ethical', 'ai.governance.ethical.read', ARRAY['ai_admin'], 'page', 'number', FALSE,
     '{"warning":3,"critical":10}'::jsonb, 1),
    ('ai-os', '/ai/governance/impact', 'governance_score', 'kpi.ai.governance_score', 'score',
     'ai.resource.governance.impact', 'ai.governance.impact.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":0.7,"critical":0.5}'::jsonb, 1),
    ('ai-os', '/ai/governance/monitoring', 'monitoring_alerts', 'kpi.ai.monitoring_alerts', 'count',
     'ai.resource.governance.monitoring', 'ai.governance.monitoring.read', ARRAY['ai_admin'], 'page', 'number', TRUE,
     '{"warning":5,"critical":20}'::jsonb, 1)
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
-- 2. ADDITIONAL ACTIONS - Gateway, Engine, Governance Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_actions
  (tenant_id, module_code, route, action_id, position, label_key, icon,
   permission, profiles, risk_level, requires_approval, workflow_code,
   evidence_required, handler_key, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.action_id, x.position, x.label_key,
       x.icon, x.permission, x.profiles, x.risk_level, x.requires_approval,
       x.workflow_code, x.evidence_required, x.handler_key, x.sort, TRUE
  FROM (VALUES
    -- Gateway Actions
    ('ai-os', '/ai/gateway', 'update_quota', 'toolbar', 'actions.update_quota', 'edit',
     'ai.gateway.admin', ARRAY['ai_admin'], 'medium', TRUE, 'ai_quota_update', TRUE, 'update_quota', 1),
    ('ai-os', '/ai/gateway', 'configure_routing', 'toolbar', 'actions.configure_routing', 'settings',
     'ai.gateway.admin', ARRAY['ai_admin'], 'high', TRUE, 'ai_routing_config', TRUE, 'configure_routing', 2),
    ('ai-os', '/ai/gateway', 'toggle_rate_limit', 'toolbar', 'actions.toggle_rate_limit', 'switch',
     'ai.gateway.admin', ARRAY['ai_admin'], 'medium', FALSE, NULL, FALSE, 'toggle_rate_limit', 3),
    ('ai-os', '/ai/gateway', 'view_cost_report', 'toolbar', 'actions.view_cost_report', 'document',
     'ai.gateway.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_cost_report', 4),
    -- Engine Actions
    ('ai-os', '/ai/engine', 'start_agent', 'toolbar', 'actions.start_agent', 'play',
     'ai.engine.write', ARRAY['ai_admin'], 'medium', TRUE, 'ai_agent_lifecycle', TRUE, 'start_agent', 1),
    ('ai-os', '/ai/engine', 'stop_agent', 'row', 'actions.stop_agent', 'stop',
     'ai.engine.write', ARRAY['ai_admin'], 'high', TRUE, 'ai_agent_lifecycle', TRUE, 'stop_agent', 2),
    ('ai-os', '/ai/engine', 'restart_kernel', 'toolbar', 'actions.restart_kernel', 'refresh',
     'ai.engine.admin', ARRAY['ai_admin'], 'high', TRUE, 'ai_kernel_restart', TRUE, 'restart_kernel', 3),
    ('ai-os', '/ai/engine', 'view_process_table', 'toolbar', 'actions.view_process_table', 'table',
     'ai.engine.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_process_table', 4),
    ('ai-os', '/ai/engine', 'execute_workflow', 'toolbar', 'actions.execute_workflow', 'play',
     'ai.engine.write', ARRAY['ai_admin'], 'medium', FALSE, NULL, TRUE, 'execute_workflow', 5),
    -- Budget Actions
    ('ai-os', '/ai/budgets', 'set_budget_limit', 'toolbar', 'actions.set_budget_limit', 'edit',
     'ai.budgets.admin', ARRAY['ai_admin'], 'high', TRUE, 'ai_budget_allocation', TRUE, 'set_budget_limit', 1),
    ('ai-os', '/ai/budgets', 'adjust_allocation', 'toolbar', 'actions.adjust_allocation', 'split',
     'ai.budgets.admin', ARRAY['ai_admin'], 'medium', TRUE, 'ai_budget_allocation', TRUE, 'adjust_allocation', 2),
    ('ai-os', '/ai/budgets', 'view_cost_breakdown', 'toolbar', 'actions.view_cost_breakdown', 'chart',
     'ai.budgets.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_cost_breakdown', 3),
    -- Kill Switch Actions
    ('ai-os', '/ai/kill-switches', 'activate_kill_switch', 'row', 'actions.activate_kill_switch', 'stop',
     'ai.kill_switches.admin', ARRAY['ai_admin'], 'high', TRUE, 'ai_kill_switch_activation', TRUE, 'activate_kill_switch', 1),
    ('ai-os', '/ai/kill-switches', 'deactivate_kill_switch', 'row', 'actions.deactivate_kill_switch', 'play',
     'ai.kill_switches.admin', ARRAY['ai_admin'], 'high', TRUE, 'ai_kill_switch_activation', TRUE, 'deactivate_kill_switch', 2),
    ('ai-os', '/ai/kill-switches', 'configure_circuit_breaker', 'toolbar', 'actions.configure_circuit_breaker', 'settings',
     'ai.kill_switches.admin', ARRAY['ai_admin'], 'high', TRUE, NULL, TRUE, 'configure_circuit_breaker', 3),
    -- Governance Actions
    ('ai-os', '/ai/governance/models', 'register_model', 'toolbar', 'actions.register_model', 'add',
     'ai.governance.models.write', ARRAY['ai_admin'], 'high', TRUE, 'ai_governance_model_approval', TRUE, 'register_model', 1),
    ('ai-os', '/ai/governance/assessments', 'run_assessment', 'toolbar', 'actions.run_assessment', 'play',
     'ai.governance.assessments.write', ARRAY['ai_admin'], 'medium', TRUE, 'ai_governance_assessment', TRUE, 'run_assessment', 1),
    ('ai-os', '/ai/governance/bias', 'view_bias_report', 'row', 'actions.view_bias_report', 'document',
     'ai.governance.bias.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_bias_report', 1),
    ('ai-os', '/ai/governance/fairness', 'view_fairness_metrics', 'row', 'actions.view_fairness_metrics', 'chart',
     'ai.governance.fairness.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_fairness_metrics', 1),
    ('ai-os', '/ai/governance/ethical', 'request_ethical_review', 'toolbar', 'actions.request_ethical_review', 'check',
     'ai.governance.ethical.write', ARRAY['ai_admin'], 'medium', TRUE, 'ai_governance_ethical_review', TRUE, 'request_ethical_review', 1),
    ('ai-os', '/ai/governance/impact', 'view_impact_assessment', 'row', 'actions.view_impact_assessment', 'document',
     'ai.governance.impact.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_impact_assessment', 1),
    ('ai-os', '/ai/governance/audit', 'view_audit_log', 'toolbar', 'actions.view_audit_log', 'document',
     'ai.governance.audit.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_audit_log', 1),
    ('ai-os', '/ai/governance/data-lineage', 'view_data_lineage', 'toolbar', 'actions.view_data_lineage', 'tree',
     'ai.governance.data_lineage.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_data_lineage', 1),
    ('ai-os', '/ai/governance/explainability', 'view_explainability_report', 'row', 'actions.view_explainability_report', 'document',
     'ai.governance.explainability.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_explainability_report', 1),
    ('ai-os', '/ai/governance/transparency', 'view_transparency_report', 'row', 'actions.view_transparency_report', 'document',
     'ai.governance.transparency.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_transparency_report', 1),
    ('ai-os', '/ai/governance/validation', 'view_validation_results', 'row', 'actions.view_validation_results', 'check',
     'ai.governance.validation.read', ARRAY['ai_admin'], 'low', FALSE, NULL, FALSE, 'view_validation_results', 1)
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
-- 3. ADDITIONAL WIDGETS - Gateway, Engine, Governance Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_widgets
  (tenant_id, module_code, route, widget_key, zone, permission,
   profiles, config, sort_order, is_signature, is_active)
SELECT NULL, x.module_code, x.route, x.widget_key, x.zone, x.permission,
       x.profiles, x.config, x.sort, FALSE, TRUE
  FROM (VALUES
    -- Additional Gateway Widgets
    ('ai-os', '/ai/gateway', 'cost_widget', 'kpi-strip', 'ai.gateway.read',
     ARRAY['ai_admin'], '{"kpis":["cost_today","cost_this_month","cost_projection"]}'::jsonb, 4),
    -- Additional Engine Widgets
    ('ai-os', '/ai/engine', 'workflow_timeline', 'main', 'ai.engine.read',
     ARRAY['ai_admin'], '{"showProgress":true}'::jsonb, 4),
    ('ai-os', '/ai/engine', 'agent_activity', 'main', 'ai.engine.read',
     ARRAY['ai_admin'], '{"type":"timeline","metric":"agent_activity"}'::jsonb, 5),
    -- Budget Widgets
    ('ai-os', '/ai/budgets', 'budget_chart', 'main', 'ai.budgets.read',
     ARRAY['ai_admin'], '{"type":"line","metric":"budget_trend"}'::jsonb, 1),
    ('ai-os', '/ai/budgets', 'cost_breakdown', 'main', 'ai.budgets.read',
     ARRAY['ai_admin'], '{"type":"pie","metric":"cost_by_service"}'::jsonb, 2),
    ('ai-os', '/ai/budgets', 'projection_widget', 'main', 'ai.budgets.read',
     ARRAY['ai_admin'], '{"type":"forecast","metric":"cost_projection"}'::jsonb, 3),
    -- Kill Switch Widgets
    ('ai-os', '/ai/kill-switches', 'kill_switch_status', 'main', 'ai.kill_switches.read',
     ARRAY['ai_admin'], '{"showStatus":true}'::jsonb, 1),
    ('ai-os', '/ai/kill-switches', 'circuit_breaker_status', 'main', 'ai.kill_switches.read',
     ARRAY['ai_admin'], '{"showStatus":true}'::jsonb, 2),
    ('ai-os', '/ai/kill-switches', 'blocked_requests_chart', 'main', 'ai.kill_switches.read',
     ARRAY['ai_admin'], '{"type":"line","metric":"blocked_requests"}'::jsonb, 3),
    -- Governance Widgets
    ('ai-os', '/ai/governance/models', 'model_registry', 'main', 'ai.governance.models.read',
     ARRAY['ai_admin'], '{"columns":["model_id","provider","status","governance_score"]}'::jsonb, 1),
    ('ai-os', '/ai/governance/assessments', 'assessment_timeline', 'main', 'ai.governance.assessments.read',
     ARRAY['ai_admin'], '{"showProgress":true}'::jsonb, 1),
    ('ai-os', '/ai/governance/bias', 'bias_heatmap', 'main', 'ai.governance.bias.read',
     ARRAY['ai_admin'], '{"type":"heatmap","metric":"bias_score"}'::jsonb, 1),
    ('ai-os', '/ai/governance/fairness', 'fairness_chart', 'main', 'ai.governance.fairness.read',
     ARRAY['ai_admin'], '{"type":"bar","metric":"fairness_score"}'::jsonb, 1),
    ('ai-os', '/ai/governance/ethical', 'ethical_review_queue', 'main', 'ai.governance.ethical.read',
     ARRAY['ai_admin'], '{"columns":["review_id","model_id","status","due_date"]}'::jsonb, 1),
    ('ai-os', '/ai/governance/impact', 'impact_assessment_chart', 'main', 'ai.governance.impact.read',
     ARRAY['ai_admin'], '{"type":"radar","metric":"impact_dimensions"}'::jsonb, 1),
    ('ai-os', '/ai/governance/audit', 'governance_audit_log', 'main', 'ai.governance.audit.read',
     ARRAY['ai_admin'], '{"columns":["timestamp","event","user","outcome"]}'::jsonb, 1),
    ('ai-os', '/ai/governance/data-lineage', 'data_lineage_graph', 'main', 'ai.governance.data_lineage.read',
     ARRAY['ai_admin'], '{"type":"graph","direction":"horizontal"}'::jsonb, 1),
    ('ai-os', '/ai/governance/explainability', 'explainability_report', 'main', 'ai.governance.explainability.read',
     ARRAY['ai_admin'], '{"type":"tree","metric":"feature_importance"}'::jsonb, 1),
    ('ai-os', '/ai/governance/transparency', 'transparency_report', 'main', 'ai.governance.transparency.read',
     ARRAY['ai_admin'], '{"type":"timeline","metric":"model_transparency"}'::jsonb, 1),
    ('ai-os', '/ai/governance/inventory', 'governance_inventory', 'main', 'ai.governance.inventory.read',
     ARRAY['ai_admin'], '{"columns":["asset_id","type","governance_status","owner"]}'::jsonb, 1),
    ('ai-os', '/ai/governance/monitoring', 'monitoring_alerts', 'main', 'ai.governance.monitoring.read',
     ARRAY['ai_admin'], '{"columns":["alert_id","severity","metric","timestamp"]}'::jsonb, 1)
  ) AS x(module_code, route, widget_key, zone, permission, profiles, config, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_widgets w
  WHERE w.tenant_id IS NULL
    AND w.module_code = x.module_code
    AND w.route = x.route
    AND w.widget_key = x.widget_key
);

COMMIT;

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================
-- Verify 25+ AI KPIs seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_kpis WHERE module_code='ai-os';
-- Expected: 25+

-- Verify 40+ AI actions seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_actions WHERE module_code='ai-os';
-- Expected: 40+

-- Verify 25+ AI widgets seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_widgets WHERE module_code='ai-os';
-- Expected: 25+
