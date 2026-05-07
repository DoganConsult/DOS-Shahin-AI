-- AI Module Wave Enforcement - Phase 2
-- Seed AI Governance pages (Policies, Models, Assessments)
-- Owner: ui-os-service
--
-- This migration seeds the AI Governance UI pages:
-- 1. /ai/governance/policies - AI Governance policies
-- 2. /ai/governance/models - Model registry and model cards
-- 3. /ai/governance/assessments - Governance assessments
-- 4. /ai/governance/bias - Bias reports
-- 5. /ai/governance/fairness - Fairness metrics
-- 6. /ai/governance/ethical - Ethical reviews
-- 7. /ai/governance/impact - Impact assessments
-- 8. /ai/governance/audit - Governance audit log
-- 9. /ai/governance/data-lineage - Data lineage
-- 10. /ai/governance/explainability - Explainability reports
-- 11. /ai/governance/transparency - Transparency reports
-- 12. /ai/governance/use-cases - Use cases
-- 13. /ai/governance/validation - Validation results
-- 14. /ai/governance/inventory - Governance inventory
-- 15. /ai/governance/monitoring - Monitoring alerts
-- 16. /ai/governance/risk - Risk assessments
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- 1. COMPONENT REGISTRY - AI Governance Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('ai.governance.policies.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.models.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.assessments.page', 'ibm-carbon', 'progress-indicator', 'approved'),
  ('ai.governance.bias.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.governance.fairness.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.governance.ethical.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.impact.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.audit.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.data_lineage.page', 'ibm-carbon', 'structured-list', 'approved'),
  ('ai.governance.explainability.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.governance.transparency.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.governance.use_cases.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.validation.page', 'ibm-carbon', 'table', 'approved'),
  ('ai.governance.inventory.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.governance.monitoring.page', 'ibm-carbon', 'grid', 'approved'),
  ('ai.governance.risk.page', 'ibm-carbon', 'table', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. DYNAMIC UI ROUTES - AI Governance Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, x.module_code, x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, x.scope, x.evidence,
       x.title_key, x.subtitle_key, x.data_resource, x.def_view,
       TRUE, TRUE
  FROM (VALUES
    ('ai-os', '/ai/governance/policies', 'ai.governance.policies.page', 'ai.governance.policies.read',
     600, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.policies.title', 'ai.governance.policies.subtitle',
     'ai.resource.governance.policies', 'table'),
    ('ai-os', '/ai/governance/models', 'ai.governance.models.page', 'ai.governance.models.read',
     610, 'list', 'full-page', 'none', 'view', 'tenant',
     TRUE, 'ai.governance.models.title', 'ai.governance.models.subtitle',
     'ai.resource.governance.models', 'table'),
    ('ai-os', '/ai/governance/assessments', 'ai.governance.assessments.page', 'ai.governance.assessments.read',
     620, 'workflow', 'full-page', 'none', 'execute', 'tenant',
     TRUE, 'ai.governance.assessments.title', 'ai.governance.assessments.subtitle',
     'ai.resource.governance.assessments', 'timeline'),
    ('ai-os', '/ai/governance/bias', 'ai.governance.bias.page', 'ai.governance.bias.read',
     630, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     FALSE, 'ai.governance.bias.title', 'ai.governance.bias.subtitle',
     'ai.resource.governance.bias', 'tiles'),
    ('ai-os', '/ai/governance/fairness', 'ai.governance.fairness.page', 'ai.governance.fairness.read',
     640, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     FALSE, 'ai.governance.fairness.title', 'ai.governance.fairness.subtitle',
     'ai.resource.governance.fairness', 'tiles'),
    ('ai-os', '/ai/governance/ethical', 'ai.governance.ethical.page', 'ai.governance.ethical.read',
     650, 'list', 'full-page', 'none', 'view', 'tenant',
     TRUE, 'ai.governance.ethical.title', 'ai.governance.ethical.subtitle',
     'ai.resource.governance.ethical', 'table'),
    ('ai-os', '/ai/governance/impact', 'ai.governance.impact.page', 'ai.governance.impact.read',
     660, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.impact.title', 'ai.governance.impact.subtitle',
     'ai.resource.governance.impact', 'table'),
    ('ai-os', '/ai/governance/audit', 'ai.governance.audit.page', 'ai.governance.audit.read',
     670, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.audit.title', 'ai.governance.audit.subtitle',
     'ai.resource.governance.audit', 'table'),
    ('ai-os', '/ai/governance/data-lineage', 'ai.governance.data_lineage.page', 'ai.governance.data_lineage.read',
     680, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.data_lineage.title', 'ai.governance.data_lineage.subtitle',
     'ai.resource.governance.data_lineage', 'structured-list'),
    ('ai-os', '/ai/governance/explainability', 'ai.governance.explainability.page', 'ai.governance.explainability.read',
     690, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     FALSE, 'ai.governance.explainability.title', 'ai.governance.explainability.subtitle',
     'ai.resource.governance.explainability', 'tiles'),
    ('ai-os', '/ai/governance/transparency', 'ai.governance.transparency.page', 'ai.governance.transparency.read',
     700, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     FALSE, 'ai.governance.transparency.title', 'ai.governance.transparency.subtitle',
     'ai.resource.governance.transparency', 'tiles'),
    ('ai-os', '/ai/governance/use-cases', 'ai.governance.use_cases.page', 'ai.governance.use_cases.read',
     710, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.use_cases.title', 'ai.governance.use_cases.subtitle',
     'ai.resource.governance.use_cases', 'table'),
    ('ai-os', '/ai/governance/validation', 'ai.governance.validation.page', 'ai.governance.validation.read',
     720, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.validation.title', 'ai.governance.validation.subtitle',
     'ai.resource.governance.validation', 'table'),
    ('ai-os', '/ai/governance/inventory', 'ai.governance.inventory.page', 'ai.governance.inventory.read',
     730, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     FALSE, 'ai.governance.inventory.title', 'ai.governance.inventory.subtitle',
     'ai.resource.governance.inventory', 'tiles'),
    ('ai-os', '/ai/governance/monitoring', 'ai.governance.monitoring.page', 'ai.governance.monitoring.read',
     740, 'overview', 'dashboard', 'module-overview', 'monitor', 'tenant',
     FALSE, 'ai.governance.monitoring.title', 'ai.governance.monitoring.subtitle',
     'ai.resource.governance.monitoring', 'tiles'),
    ('ai-os', '/ai/governance/risk', 'ai.governance.risk.page', 'ai.governance.risk.read',
     750, 'list', 'full-page', 'none', 'view', 'tenant',
     FALSE, 'ai.governance.risk.title', 'ai.governance.risk.subtitle',
     'ai.resource.governance.risk', 'table')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, evidence, title_key, subtitle_key, data_resource, def_view)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = x.module_code
    AND r.path_pattern = x.path
);

-- =====================================================================
-- 3. NAVIGATION - AI Governance Pages (Hierarchical)
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'ai-os', 'AI Governance Hub', '/ai-governance', 530, NULL, 'active'),
  (NULL, 'ai-os', 'Policies', '/ai/governance/policies', 531, NULL, 'active'),
  (NULL, 'ai-os', 'Model Registry', '/ai/governance/models', 532, NULL, 'active'),
  (NULL, 'ai-os', 'Assessments', '/ai/governance/assessments', 533, NULL, 'active'),
  (NULL, 'ai-os', 'Bias Reports', '/ai/governance/bias', 534, NULL, 'active'),
  (NULL, 'ai-os', 'Fairness Metrics', '/ai/governance/fairness', 535, NULL, 'active'),
  (NULL, 'ai-os', 'Ethical Reviews', '/ai/governance/ethical', 536, NULL, 'active'),
  (NULL, 'ai-os', 'Impact Assessments', '/ai/governance/impact', 537, NULL, 'active'),
  (NULL, 'ai-os', 'Audit Log', '/ai/governance/audit', 538, NULL, 'active'),
  (NULL, 'ai-os', 'Data Lineage', '/ai/governance/data-lineage', 539, NULL, 'active'),
  (NULL, 'ai-os', 'Explainability', '/ai/governance/explainability', 540, NULL, 'active'),
  (NULL, 'ai-os', 'Transparency Reports', '/ai/governance/transparency', 541, NULL, 'active'),
  (NULL, 'ai-os', 'Use Cases', '/ai/governance/use-cases', 542, NULL, 'active'),
  (NULL, 'ai-os', 'Validation Results', '/ai/governance/validation', 543, NULL, 'active'),
  (NULL, 'ai-os', 'Governance Inventory', '/ai/governance/inventory', 544, NULL, 'active'),
  (NULL, 'ai-os', 'Monitoring Alerts', '/ai/governance/monitoring', 545, NULL, 'active'),
  (NULL, 'ai-os', 'Risk Assessments', '/ai/governance/risk', 546, NULL, 'active')
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
    ('ai-os', '/ai/governance/policies', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.policies.read', 1),
    ('ai-os', '/ai/governance/models', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.models.read', 1),
    ('ai-os', '/ai/governance/assessments', 'A09', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.assessments.read', 1),
    ('ai-os', '/ai/governance/bias', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.bias.read', 1),
    ('ai-os', '/ai/governance/fairness', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.fairness.read', 1),
    ('ai-os', '/ai/governance/ethical', 'A09', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.ethical.read', 1),
    ('ai-os', '/ai/governance/impact', 'A04', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.impact.read', 1),
    ('ai-os', '/ai/governance/audit', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.audit.read', 1),
    ('ai-os', '/ai/governance/monitoring', 'A08', TRUE, 'panel', ARRAY['ai_admin'], 'ai.governance.monitoring.read', 1)
  ) AS x(module_code, route, agent_id, is_primary, presentation, profiles, permission, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_page_agents p
  WHERE p.tenant_id IS NULL
    AND p.module_code = x.module_code
    AND p.route = x.route
    AND p.agent_id = x.agent_id
);

COMMIT;

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================
-- Verify 16 governance pages seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE path_pattern LIKE '/ai/governance/%';
-- Expected: 16

-- Verify governance navigation entries:
-- SELECT COUNT(*) FROM dos.dynamic_ui_navigation WHERE route LIKE '/ai/governance%';
-- Expected: 17 (hub + 16 pages)

-- Verify AI component keys registered:
-- SELECT COUNT(*) FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'ai.governance.%';
-- Expected: 16
