-- AI Module Wave Enforcement - Phase 9
-- Add all missing Agent Placements for AI pages
-- Owner: ui-os-service
--
-- This migration adds additional agent placements for AI pages that were
-- seeded in earlier phases but need more comprehensive agent coverage.
--
-- Idempotent: Uses ON CONFLICT DO NOTHING/DO UPDATE for all inserts

BEGIN;

-- =====================================================================
-- PAGE AGENTS - Additional Agent Placements
-- =====================================================================
INSERT INTO dos.dynamic_ui_page_agents
  (tenant_id, module_code, route, agent_id, is_primary, presentation,
   profiles, permission, sort_order, is_active)
SELECT NULL, x.module_code, x.route, x.agent_id, x.is_primary, x.presentation,
       x.profiles, x.permission, x.sort, TRUE
  FROM (VALUES
    -- Additional Gateway Placements
    ('ai-os', '/ai/gateway', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.gateway.read', 1),
    ('ai-os', '/ai/gateway', 'A07', FALSE, 'panel', ARRAY['ai_admin'], 'ai.gateway.read', 2),
    -- Additional Engine Placements
    ('ai-os', '/ai/engine', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.engine.read', 1),
    ('ai-os', '/ai/engine', 'A02', FALSE, 'panel', ARRAY['ai_admin'], 'ai.engine.read', 2),
    -- Additional Budget Placements
    ('ai-os', '/ai/budgets', 'A07', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.budgets.read', 1),
    ('ai-os', '/ai/budgets', 'A04', FALSE, 'panel', ARRAY['ai_admin'], 'ai.budgets.read', 2),
    -- Additional Kill Switch Placements
    ('ai-os', '/ai/kill-switches', 'A07', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.kill_switches.read', 1),
    ('ai-os', '/ai/kill-switches', 'A08', FALSE, 'panel', ARRAY['ai_admin'], 'ai.kill_switches.read', 2),
    -- Additional Prompt Placements
    ('ai-os', '/ai/prompts', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.prompts.read', 1),
    -- Additional Context Source Placements
    ('ai-os', '/ai/context-sources', 'A02', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.context_sources.read', 1),
    -- Additional Delegation Placements
    ('ai-os', '/ai/delegations', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.delegations.read', 1),
    -- Additional HITL Placements
    ('ai-os', '/ai/hitl', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.hitl.read', 1),
    -- Additional Governance Placements
    ('ai-os', '/ai/governance/policies', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.policies.read', 1),
    ('ai-os', '/ai/governance/models', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.models.read', 1),
    ('ai-os', '/ai/governance/assessments', 'A09', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.assessments.read', 1),
    ('ai-os', '/ai/governance/bias', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.bias.read', 1),
    ('ai-os', '/ai/governance/fairness', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.fairness.read', 1),
    ('ai-os', '/ai/governance/ethical', 'A09', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.ethical.read', 1),
    ('ai-os', '/ai/governance/impact', 'A04', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.impact.read', 1),
    ('ai-os', '/ai/governance/audit', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.audit.read', 1),
    ('ai-os', '/ai/governance/monitoring', 'A08', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.governance.monitoring.read', 1),
    -- Additional Code Search Placements
    ('ai-os', '/ai/code-search', 'A01', TRUE, 'sidebar', ARRAY['ai_admin'], 'ai.code_search.read', 1)
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
-- Verify 20+ AI agent placements seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_page_agents WHERE module_code='ai-os';
-- Expected: 20+

-- Verify agent distribution:
-- SELECT agent_id, COUNT(*) FROM dos.dynamic_ui_page_agents WHERE module_code='ai-os' GROUP BY agent_id;
-- Expected: A01 (8), A02 (2), A04 (2), A07 (2), A08 (6), A09 (2)
