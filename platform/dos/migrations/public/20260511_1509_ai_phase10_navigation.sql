-- AI Module Wave Enforcement - Phase 10
-- Add all missing Navigation entries for AI pages
-- Owner: ui-os-service
--
-- This migration adds additional navigation entries for AI pages to create
-- a complete hierarchical navigation structure.
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- NAVIGATION - Complete AI Navigation Hierarchy
-- =====================================================================
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  -- AI Hub (parent for all AI pages)
  (NULL, 'ai-os', 'AI Hub', '/ai-hub', 500, NULL, 'active'),
  -- Core AI Pages (under AI Hub)
  (NULL, 'ai-os', 'AI Gateway', '/ai/gateway', 501, NULL, 'active'),
  (NULL, 'ai-os', 'AI Engine', '/ai/engine', 502, NULL, 'active'),
  (NULL, 'ai-os', 'AI Kernel', '/ai/kernel', 503, NULL, 'active'),
  -- Budget and Kill Switch (under AI Hub)
  (NULL, 'ai-os', 'Budgets', '/ai/budgets', 504, NULL, 'active'),
  (NULL, 'ai-os', 'Kill Switches', '/ai/kill-switches', 505, NULL, 'active'),
  -- Prompts and Context (under AI Hub)
  (NULL, 'ai-os', 'Prompts', '/ai/prompts', 506, NULL, 'active'),
  (NULL, 'ai-os', 'Context Sources', '/ai/context-sources', 507, NULL, 'active'),
  -- Delegation and HITL (under AI Hub)
  (NULL, 'ai-os', 'Delegations', '/ai/delegations', 508, NULL, 'active'),
  (NULL, 'ai-os', 'HITL', '/ai/hitl', 509, NULL, 'active'),
  -- Code Search (under AI Hub)
  (NULL, 'ai-os', 'Code Search', '/ai/code-search', 510, NULL, 'active'),
  -- AI Governance Hub (parent for governance pages)
  (NULL, 'ai-os', 'AI Governance', '/ai-governance', 520, NULL, 'active'),
  -- Governance Pages (under AI Governance)
  (NULL, 'ai-os', 'Policies', '/ai/governance/policies', 521, NULL, 'active'),
  (NULL, 'ai-os', 'Model Registry', '/ai/governance/models', 522, NULL, 'active'),
  (NULL, 'ai-os', 'Assessments', '/ai/governance/assessments', 523, NULL, 'active'),
  (NULL, 'ai-os', 'Bias Reports', '/ai/governance/bias', 524, NULL, 'active'),
  (NULL, 'ai-os', 'Fairness Metrics', '/ai/governance/fairness', 525, NULL, 'active'),
  (NULL, 'ai-os', 'Ethical Reviews', '/ai/governance/ethical', 526, NULL, 'active'),
  (NULL, 'ai-os', 'Impact Assessments', '/ai/governance/impact', 527, NULL, 'active'),
  (NULL, 'ai-os', 'Audit Log', '/ai/governance/audit', 528, NULL, 'active'),
  (NULL, 'ai-os', 'Data Lineage', '/ai/governance/data-lineage', 529, NULL, 'active'),
  (NULL, 'ai-os', 'Explainability', '/ai/governance/explainability', 530, NULL, 'active'),
  (NULL, 'ai-os', 'Transparency Reports', '/ai/governance/transparency', 531, NULL, 'active'),
  (NULL, 'ai-os', 'Use Cases', '/ai/governance/use-cases', 532, NULL, 'active'),
  (NULL, 'ai-os', 'Validation Results', '/ai/governance/validation', 533, NULL, 'active'),
  (NULL, 'ai-os', 'Governance Inventory', '/ai/governance/inventory', 534, NULL, 'active'),
  (NULL, 'ai-os', 'Monitoring Alerts', '/ai/governance/monitoring', 535, NULL, 'active'),
  (NULL, 'ai-os', 'Risk Assessments', '/ai/governance/risk', 536, NULL, 'active'),
  -- Existing Pages (already seeded but ensuring they're in the right order)
  (NULL, 'ai-os', 'Agents', '/ai/agents', 540, NULL, 'active'),
  (NULL, 'ai-os', 'AI Models', '/ai/models', 541, NULL, 'active')
ON CONFLICT (tenant_id, module_code, route) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      updated_at = NOW();

COMMIT;

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================
-- Verify 25+ AI navigation entries seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_navigation WHERE module_code='ai-os';
-- Expected: 25+

-- Verify navigation hierarchy:
-- SELECT label, route, sort_order FROM dos.dynamic_ui_navigation WHERE module_code='ai-os' ORDER BY sort_order;
-- Expected: Hierarchical structure with AI Hub at top
