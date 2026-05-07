-- AI Module Wave Enforcement - Phase 8
-- Add all missing Data Resources for AI pages
-- Owner: ui-os-service
--
-- This migration adds additional data resources for AI pages that were
-- seeded in earlier phases but need more comprehensive API endpoint bindings.
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- DATA RESOURCES - Additional AI API Endpoints
-- =====================================================================
INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  -- Governance Data Resources
  (NULL, 'ai-os', 'ai.resource.governance.models', 'api', '/api/ai-governance/models',
   'ai.governance.models.read', 300, 'ai.governance.models.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GovernanceModelDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.assessments', 'api', '/api/ai-governance/assessments',
   'ai.governance.assessments.read', 60, 'ai.governance.assessments.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GovernanceAssessmentDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.bias', 'api', '/api/ai-governance/bias',
   'ai.governance.bias.read', 300, 'ai.governance.bias.changed',
   '{"limit":50,"offset":0}'::jsonb, 'BiasReportDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.fairness', 'api', '/api/ai-governance/fairness',
   'ai.governance.fairness.read', 300, 'ai.governance.fairness.changed',
   '{"limit":50,"offset":0}'::jsonb, 'FairnessMetricDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.ethical', 'api', '/api/ai-governance/ethical',
   'ai.governance.ethical.read', 300, 'ai.governance.ethical.changed',
   '{"limit":50,"offset":0}'::jsonb, 'EthicalReviewDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.impact', 'api', '/api/ai-governance/impact',
   'ai.governance.impact.read', 300, 'ai.governance.impact.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ImpactAssessmentDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.audit', 'api', '/api/ai-governance/audit',
   'ai.governance.audit.read', 60, 'ai.governance.audit.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GovernanceAuditDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.data_lineage', 'api', '/api/ai-governance/data-lineage',
   'ai.governance.data_lineage.read', 300, 'ai.governance.data_lineage.changed',
   '{"limit":50,"offset":0}'::jsonb, 'DataLineageDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.explainability', 'api', '/api/ai-governance/explainability',
   'ai.governance.explainability.read', 300, 'ai.governance.explainability.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ExplainabilityReportDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.transparency', 'api', '/api/ai-governance/transparency',
   'ai.governance.transparency.read', 300, 'ai.governance.transparency.changed',
   '{"limit":50,"offset":0}'::jsonb, 'TransparencyReportDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.use_cases', 'api', '/api/ai-governance/use-cases',
   'ai.governance.use_cases.read', 300, 'ai.governance.use_cases.changed',
   '{"limit":50,"offset":0}'::jsonb, 'UseCaseDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.validation', 'api', '/api/ai-governance/validation',
   'ai.governance.validation.read', 300, 'ai.governance.validation.changed',
   '{"limit":50,"offset":0}'::jsonb, 'ValidationResultDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.inventory', 'api', '/api/ai-governance/inventory',
   'ai.governance.inventory.read', 300, 'ai.governance.inventory.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GovernanceInventoryDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.monitoring', 'api', '/api/ai-governance/monitoring',
   'ai.governance.monitoring.read', 60, 'ai.governance.monitoring.changed',
   '{"limit":50,"offset":0}'::jsonb, 'MonitoringAlertDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance.risk', 'api', '/api/ai-governance/risk',
   'ai.governance.risk.read', 300, 'ai.governance.risk.changed',
   '{"limit":50,"offset":0}'::jsonb, 'RiskAssessmentDTO', TRUE),
  -- Engine Additional Data Resources
  (NULL, 'ai-os', 'ai.resource.engine.workflows', 'api', '/api/ai-engine/workflows',
   'ai.engine.read', 60, 'ai.engine.workflows.changed',
   '{"limit":50,"offset":0}'::jsonb, 'WorkflowDTO', TRUE)
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
-- Verify 30+ AI data resources seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_data_resources WHERE module_code='ai-os';
-- Expected: 30+

-- Verify routes have data resource bindings:
-- SELECT DISTINCT data_resource_key FROM dos.dynamic_ui_routes WHERE module_code='ai-os' AND data_resource_key IS NOT NULL;
-- Expected: Multiple data resource keys
