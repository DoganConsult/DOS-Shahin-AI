-- Wave R2 — Permissions real seed (replaces phase 11 comment-only doc).
-- Seeds dos.permissions for every ai-os permission key referenced by:
--   dos.dynamic_ui_routes / _widgets / _kpis / _actions / _page_agents /
--   _data_resources / _intents (all under module_code='ai-os').
-- Idempotent: NOT EXISTS guard on permission_code.
-- Doctrine: AGENTS.md "If runtime data is missing, store it; do not
-- patch around it in code."

BEGIN;

INSERT INTO dos.permissions
  (permission_id, permission_code, module_code, resource_type, action_type, description, created_at)
SELECT x.code, x.code, 'ai-os', x.resource, x.action, x.description, NOW()
  FROM (VALUES
    -- Gateway
    ('ai.gateway.read',                               'gateway',                 'read',  'AI Gateway: read provider routing, quota, cost, rate-limit dashboards'),
    ('ai.gateway.write',                              'gateway',                 'write', 'AI Gateway: configure routing, rate limits, quotas'),
    ('ai.gateway.admin',                              'gateway',                 'admin', 'AI Gateway: full administrative control (kill switches, provider keys)'),
    -- Engine
    ('ai.engine.read',                                'engine',                  'read',  'AI Engine: read inference + agent + workflow status'),
    ('ai.engine.write',                               'engine',                  'write', 'AI Engine: start/stop agents, dispatch jobs'),
    ('ai.engine.admin',                               'engine',                  'admin', 'AI Engine: kernel restart, full administrative control'),
    -- Kernel
    ('ai.kernel.read',                                'kernel',                  'read',  'AI Kernel: read process table, scheduler, IPC, memory, log'),
    ('ai.kernel.write',                               'kernel',                  'write', 'AI Kernel: lifecycle ops on processes'),
    -- Budgets
    ('ai.budgets.read',                               'budgets',                 'read',  'AI Budgets: read budget allocations and projections'),
    ('ai.budgets.write',                              'budgets',                 'write', 'AI Budgets: adjust allocations'),
    ('ai.budgets.admin',                              'budgets',                 'admin', 'AI Budgets: set hard limits, kill-switch on overspend'),
    -- Kill switches
    ('ai.kill_switches.read',                         'kill_switches',           'read',  'AI Kill Switches: read state and history'),
    ('ai.kill_switches.write',                        'kill_switches',           'write', 'AI Kill Switches: toggle non-critical breakers'),
    ('ai.kill_switches.admin',                        'kill_switches',           'admin', 'AI Kill Switches: activate platform-wide kill switches'),
    -- Prompts
    ('ai.prompts.read',                               'prompts',                 'read',  'AI Prompt templates: read'),
    ('ai.prompts.write',                              'prompts',                 'write', 'AI Prompt templates: create/edit'),
    ('ai.prompts.admin',                              'prompts',                 'admin', 'AI Prompt templates: publish + retire'),
    -- Context sources
    ('ai.context_sources.read',                       'context_sources',         'read',  'AI Context Sources: read'),
    ('ai.context_sources.write',                      'context_sources',         'write', 'AI Context Sources: configure'),
    -- Delegations
    ('ai.delegations.read',                           'delegations',             'read',  'AI Agent Delegations: read'),
    ('ai.delegations.write',                          'delegations',             'write', 'AI Agent Delegations: grant/revoke'),
    -- HITL
    ('ai.hitl.read',                                  'hitl',                    'read',  'AI HITL: read pending interventions'),
    ('ai.hitl.write',                                 'hitl',                    'write', 'AI HITL: approve/reject'),
    ('ai.hitl.admin',                                 'hitl',                    'admin', 'AI HITL: gate configuration'),
    -- Code search
    ('ai.code_search.read',                           'code_search',             'read',  'AI Code Search: query indexed surfaces'),
    ('ai.code_search.write',                          'code_search',             'write', 'AI Code Search: register engines, request indexing'),
    ('ai.code_search.admin',                          'code_search',             'admin', 'AI Code Search: full registry administration'),
    -- Governance — generic
    ('ai.governance.write',                           'governance',              'write', 'AI Governance: write across governance surfaces'),
    -- Governance — policies
    ('ai.governance.policies.read',                   'governance.policies',     'read',  'AI Governance Policies: read'),
    ('ai.governance.policies.write',                  'governance.policies',     'write', 'AI Governance Policies: author'),
    ('ai.governance.policies.admin',                  'governance.policies',     'admin', 'AI Governance Policies: publish'),
    -- Governance — models
    ('ai.governance.models.read',                     'governance.models',       'read',  'AI Governance Model Registry: read model cards'),
    ('ai.governance.models.write',                    'governance.models',       'write', 'AI Governance Model Registry: register models'),
    -- Governance — assessments
    ('ai.governance.assessments.read',                'governance.assessments',  'read',  'AI Governance Assessments: read'),
    ('ai.governance.assessments.write',               'governance.assessments',  'write', 'AI Governance Assessments: run'),
    -- Governance — bias
    ('ai.governance.bias.read',                       'governance.bias',         'read',  'AI Bias reports: read'),
    ('ai.governance.bias.write',                      'governance.bias',         'write', 'AI Bias reports: file'),
    -- Governance — fairness
    ('ai.governance.fairness.read',                   'governance.fairness',     'read',  'AI Fairness metrics: read'),
    -- Governance — ethical
    ('ai.governance.ethical.read',                    'governance.ethical',      'read',  'AI Ethical reviews: read'),
    ('ai.governance.ethical.write',                   'governance.ethical',      'write', 'AI Ethical reviews: request'),
    -- Governance — impact
    ('ai.governance.impact.read',                     'governance.impact',       'read',  'AI Impact assessments: read'),
    ('ai.governance.impact.write',                    'governance.impact',       'write', 'AI Impact assessments: author'),
    -- Governance — audit
    ('ai.governance.audit.read',                      'governance.audit',        'read',  'AI Governance Audit log: read'),
    -- Governance — data lineage
    ('ai.governance.data_lineage.read',               'governance.data_lineage', 'read',  'AI Data Lineage: read'),
    -- Governance — explainability
    ('ai.governance.explainability.read',             'governance.explainability','read', 'AI Explainability reports: read'),
    -- Governance — transparency
    ('ai.governance.transparency.read',               'governance.transparency', 'read',  'AI Transparency reports: read'),
    -- Governance — use cases
    ('ai.governance.use_cases.read',                  'governance.use_cases',    'read',  'AI Governance Use Cases: read'),
    ('ai.governance.use_cases.write',                 'governance.use_cases',    'write', 'AI Governance Use Cases: author'),
    -- Governance — validation
    ('ai.governance.validation.read',                 'governance.validation',   'read',  'AI Validation results: read'),
    ('ai.governance.validation.write',                'governance.validation',   'write', 'AI Validation results: file'),
    -- Governance — inventory
    ('ai.governance.inventory.read',                  'governance.inventory',    'read',  'AI Governance inventory: read'),
    -- Governance — monitoring
    ('ai.governance.monitoring.read',                 'governance.monitoring',   'read',  'AI Monitoring alerts: read'),
    -- Governance — risk
    ('ai.governance.risk.read',                       'governance.risk',         'read',  'AI Risk assessments: read'),
    ('ai.governance.risk.write',                      'governance.risk',         'write', 'AI Risk assessments: author'),
    -- Cross-cutting catalog reads (referenced by ai-os routes/widgets/kpis/intents)
    ('ai.read',                                       'ai',                      'read',  'AI plane: read aggregate AI catalog (cross-surface)'),
    ('ai.agents.read',                                'agents',                  'read',  'AI Agents: read agent registry/catalog'),
    ('ai.agents.register',                            'agents',                  'write', 'AI Agents: register/update agent definitions'),
    ('ai.models.read',                                'models',                  'read',  'AI Models: read model registry'),
    ('ai.models.add',                                 'models',                  'write', 'AI Models: add/register a model in registry')
  ) AS x(code, resource, action, description)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.permissions p WHERE p.permission_code = x.code
);

DO $$
DECLARE n INT;
BEGIN
  -- Required floor: every distinct permission referenced across AI dynamic-UI tables exists.
  SELECT COUNT(*) INTO n FROM (
    SELECT permission_key AS p FROM dos.dynamic_ui_routes
      WHERE module_code='ai-os' AND permission_key IS NOT NULL
    UNION SELECT permission FROM dos.dynamic_ui_widgets WHERE module_code='ai-os' AND permission IS NOT NULL
    UNION SELECT permission FROM dos.dynamic_ui_kpis WHERE module_code='ai-os' AND permission IS NOT NULL
    UNION SELECT permission FROM dos.dynamic_ui_actions WHERE module_code='ai-os' AND permission IS NOT NULL
    UNION SELECT permission FROM dos.dynamic_ui_page_agents WHERE module_code='ai-os' AND permission IS NOT NULL
    UNION SELECT permission FROM dos.dynamic_ui_data_resources WHERE module_code='ai-os' AND permission IS NOT NULL
    UNION SELECT permission FROM dos.dynamic_ui_intents WHERE module_code='ai-os' AND permission IS NOT NULL
  ) src
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.permissions p WHERE p.permission_code = src.p
  );
  IF n > 0 THEN
    RAISE EXCEPTION 'AI permissions referenced by dynamic UI but not seeded in dos.permissions: % missing', n;
  END IF;
END$$;

COMMIT;
