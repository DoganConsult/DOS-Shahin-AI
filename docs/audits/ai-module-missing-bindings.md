# AI Module - Missing Bindings Analysis

**Gap analysis between AI module contract and Dynamic UI OS bindings**

---

## AI Module Contract Declaration

### Module Manifest: `platform/ai/module.manifest.json`

**Module Code**: `ai-os`
**Display Name**: AI-OS — Platform AI Plane
**Lifecycle Stage**: GA
**Owner**: `platform-ai`

### Declared API Routes
```
/api/ai              - AI Gateway (provider routing, quota, cost, rate limit)
/api/ai-engine      - AI Engine (inference, agents, kernel, Temporal, LangGraph)
/api/ai-governance  - AI Governance (policy, safety, audit, redaction, evals)
```

### Declared Services
- `ai-gateway-service`    - `/api/ai`
- `ai-engine-service`     - `/api/ai-engine`
- `ai-governance-service` - `/api/ai-governance`

### Declared Database Tables (46 tables in platform_ai schema)

**Core AI Tables (15)**:
- `ai_agents`
- `ai_agent_configs`
- `ai_budgets`
- `ai_execution_log`
- `ai_kill_switches`
- `ai_boundaries`
- `ai_autonomy_levels`
- `ai_notes`
- `ai_drafts`
- `ai_interventions`
- `ai_model_configs`
- `ai_prompt_templates`
- `ai_context_sources`
- `agent_model_config`
- `prompt_injection_log`

**Agent Tables (11)**:
- `agent_delegations`
- `agent_governance_audit`
- `hitl_states`
- `guard_decision_log`
- `personal_agent_assignments`
- `agent_activity_log`
- `agent_cycle_summaries`
- `agent_handoffs`
- `agent_discoveries`
- `agent_tool_permissions`
- `hitl_gates`

**Code Search Tables (2)**:
- `code_search_engine_registry`
- `code_search_indexed_surface`

**AI Governance Tables (18)**:
- `ai_gov_assessments`
- `ai_gov_audit_log`
- `ai_gov_bias_reports`
- `ai_gov_data_lineage`
- `ai_gov_ethical_reviews`
- `ai_gov_explainability_reports`
- `ai_gov_fairness_metrics`
- `ai_gov_impact_assessments`
- `ai_gov_inventory`
- `ai_gov_model_cards`
- `ai_gov_monitoring_alerts`
- `ai_gov_policies`
- `ai_gov_registry`
- `ai_gov_risk_assessments`
- `ai_gov_transparency_reports`
- `ai_gov_use_cases`
- `ai_gov_validation_results`

### Declared Events (34 publishes, 12 subscribes)

**Publishes**:
- `ai.agent.started`, `ai.agent.completed`, `ai.agent.failed`
- `ai.proposal.created`, `ai.proposal.approved`, `ai.proposal.rejected`
- `ai.delegation.granted`, `ai.delegation.revoked`, `ai.delegation.action_executed`
- `ai.copilot.action`, `ai.copilot.suggestion`
- `ai.circuit_breaker.opened`, `ai.circuit_breaker.closed`
- `ai.drift.detected`
- `ai.cost.threshold_exceeded`
- `ai.kill_switch.activated`
- `ai.autonomy.level_changed`
- `ai.code_search.queried`, `ai.code_search.engine_health_checked`, `ai.code_search.engine_registered`, `ai.code_search.engine_status_changed`, `ai.code_search.surface_indexed`
- `ai_governance.model_registered`, `ai_governance.assessment_completed`, `ai_governance.bias_detected`, `ai_governance.fairness_scored`, `ai_governance.ethical_review_completed`, `ai_governance.impact_assessed`, `ai_governance.monitoring_alert`, `ai_governance.policy_violated`, `ai_governance.transparency_report_generated`, `ai_governance.validation_completed`

**Subscribes**:
- `risk.record.created`, `risk.record.updated`
- `compliance.assessment.completed`, `compliance.gap.detected`, `compliance.posture_changed`
- `policy.document.approved`
- `audit.finding.created`, `audit.finding_created`
- `workflow.status.changed`, `workflow.status_changed`
- `governance.health.updated`
- `risk.score_changed`

### Declared Required Reference Data
- `ai_model_configs`
- `ai_agent_templates`
- `ai_model_categories`
- `fairness_metrics`
- `ethical_review_templates`

---

## Currently Seeded Dynamic UI Bindings

### From: `20260511_1400_dynamic_ui_complete_contract_binding.sql`

**AI-OS Module Entry**:
- `module_code`: `ai-os`
- `default_route`: `/workspace-home`

**Navigation Entries Seeded**:
- `/ai-hub` - AI Hub
- `/ai/agents` - Agents
- `/ai-governance` - AI Governance
- `/ai/models` - AI Models

**Routes Seeded**:
- `/ai-hub` - Component: `module.dashboard.page`
- `/ai/agents` - Component: `module.records.page`
- `/ai-governance` - Component: `module.records.page`
- `/ai/models` - Component: `module.records.page`

**Agents Seeded**:
- A01 (autonomous) - placed on `/ai-hub`, `/ai/agents`, `/ai/models`
- A08 (governance) - placed on `/ai-governance`

**Actions Seeded**:
- `register_agent` on `/ai/agents`
- `add_model` on `/ai/models`

**Widgets Seeded**:
- `ai_overview` on `/ai-hub`
- `agents_table` on `/ai/agents`
- `models_table` on `/ai/models`

**KPIs Seeded**:
- `active_agents` on `/ai-hub`
- `model_usage` on `/ai/hub`

**Data Resources Seeded**:
- `ai.resource.agents` - `/api/ai/agents`
- `ai.resource.models` - `/api/ai/models`

---

## Missing Bindings - Gap Analysis

### 1. Missing Routes (UI Pages)

**Declared API Routes vs Seeded UI Routes**:

| API Route | UI Route Needed | Status |
|-----------|-----------------|--------|
| `/api/ai` | `/ai/gateway` | ❌ MISSING |
| `/api/ai-engine` | `/ai/engine` | ❌ MISSING |
| `/api/ai-governance` | `/ai/governance` | ✓ SEEDED (but may need governance-specific pages) |

**Additional UI Pages Needed**:
- `/ai/gateway` - AI Gateway management (provider routing, quota, cost, rate limit)
- `/ai/engine` - AI Engine management (inference, agents, kernel, Temporal, LangGraph)
- `/ai/kernel` - AI-OS Kernel status (process table, scheduler, IPC, memory, log)
- `/ai/budgets` - Budget management (ai_budgets table)
- `/ai/kill-switches` - Kill switch management (ai_kill_switches table)
- `/ai/prompts` - Prompt template management (ai_prompt_templates table)
- `/ai/context-sources` - Context source management (ai_context_sources table)
- `/ai/notes` - AI notes management (ai_notes table)
- `/ai/drafts` - AI drafts management (ai_drafts table)
- `/ai/delegations` - Agent delegation management (agent_delegations table)
- `/ai/hitl` - HITL state management (hitl_states, hitl_gates tables)
- `/ai/governance/policies` - AI Governance policies (ai_gov_policies table)
- `/ai/governance/models` - AI Governance model registry (ai_gov_registry, ai_gov_model_cards tables)
- `/ai/governance/assessments` - AI Governance assessments (ai_gov_assessments table)
- `/ai/governance/bias` - Bias reports (ai_gov_bias_reports table)
- `/ai/governance/fairness` - Fairness metrics (ai_gov_fairness_metrics table)
- `/ai/governance/ethical` - Ethical reviews (ai_gov_ethical_reviews table)
- `/ai/governance/impact` - Impact assessments (ai_gov_impact_assessments table)
- `/ai/governance/risk` - Risk assessments (ai_gov_risk_assessments table)
- `/ai/governance/audit` - Governance audit log (ai_gov_audit_log table)
- `/ai/governance/data-lineage` - Data lineage (ai_gov_data_lineage table)
- `/ai/governance/explainability` - Explainability reports (ai_gov_explainability_reports table)
- `/ai/governance/transparency` - Transparency reports (ai_gov_transparency_reports table)
- `/ai/governance/use-cases` - Use cases (ai_gov_use_cases table)
- `/ai/governance/validation` - Validation results (ai_gov_validation_results table)
- `/ai/governance/inventory` - Governance inventory (ai_gov_inventory table)
- `/ai/governance/monitoring` - Monitoring alerts (ai_gov_monitoring_alerts table)
- `/ai/code-search` - Code search engine registry (code_search_engine_registry, code_search_indexed_surface tables)

**Total Missing UI Routes**: 28+

---

### 2. Missing IBM Carbon Component Bindings

**Currently Seeded Components**:
- `module.dashboard.page` - used for `/ai-hub`
- `module.records.page` - used for `/ai/agents`, `/ai-governance`, `/ai/models`

**Missing Component Keys Needed**:
- `ai.gateway.page` - for `/ai/gateway`
- `ai.engine.page` - for `/ai/engine`
- `ai.kernel.page` - for `/ai/kernel`
- `ai.budgets.page` - for `/ai/budgets`
- `ai.kill_switches.page` - for `/ai/kill-switches`
- `ai.prompts.page` - for `/ai/prompts`
- `ai.context_sources.page` - for `/ai/context-sources`
- `ai.notes.page` - for `/ai/notes`
- `ai.drafts.page` - for `/ai/drafts`
- `ai.delegations.page` - for `/ai/delegations`
- `ai.hitl.page` - for `/ai/hitl`
- `ai.governance.policies.page` - for `/ai/governance/policies`
- `ai.governance.models.page` - for `/ai/governance/models`
- `ai.governance.assessments.page` - for `/ai/governance/assessments`
- `ai.governance.bias.page` - for `/ai/governance/bias`
- `ai.governance.fairness.page` - for `/ai/governance/fairness`
- `ai.governance.ethical.page` - for `/ai/governance/ethical`
- `ai.governance.impact.page` - for `/ai/governance/impact`
- `ai.governance.risk.page` - for `/ai/governance/risk`
- `ai.governance.audit.page` - for `/ai/governance/audit`
- `ai.governance.data_lineage.page` - for `/ai/governance/data-lineage`
- `ai.governance.explainability.page` - for `/ai/governance/explainability`
- `ai.governance.transparency.page` - for `/ai/governance/transparency`
- `ai.governance.use_cases.page` - for `/ai/governance/use-cases`
- `ai.governance.validation.page` - for `/ai/governance/validation`
- `ai.governance.inventory.page` - for `/ai/governance/inventory`
- `ai.governance.monitoring.page` - for `/ai/governance/monitoring`
- `ai.code_search.page` - for `/ai/code-search`

**Total Missing Component Keys**: 28+

**Carbon Keys to Reference**:
- `grid` - for tables and data grids
- `table` - for tabular data
- `tabs` - for multi-tab interfaces
- `form` - for configuration forms
- `progress-indicator` - for workflow tracking
- `structured-list` - for hierarchical data
- `tiles` - for dashboard tiles
- `timeline` - for event logs

---

### 3. Missing KPI Bindings

**Currently Seeded KPIs**:
- `active_agents` - on `/ai-hub`
- `model_usage` - on `/ai-hub`

**Missing KPIs Needed**:

**Gateway KPIs** (`/ai/gateway`):
- `total_requests` - Total API requests
- `request_latency` - Average request latency
- `quota_usage` - Quota usage percentage
- `cost_today` - Cost incurred today
- `rate_limit_hits` - Rate limit violations

**Engine KPIs** (`/ai/engine`):
- `active_inferences` - Active inference sessions
- `agent_executions` - Agent execution count
- `kernel_uptime` - Kernel uptime
- `process_count` - Active process count
- `temporal_workflows` - Active Temporal workflows

**Budget KPIs** (`/ai/budgets`):
- `budget_remaining` - Remaining budget USD
- `budget_used` - Budget used USD
- `cost_projection` - Projected cost
- `cost_trend` - Cost trend over time

**Kill Switch KPIs** (`/ai/kill-switches`):
- `active_kill_switches` - Active kill switches
- `circuit_breaker_state` - Circuit breaker state
- `blocked_requests` - Blocked request count

**Governance KPIs** (`/ai/governance/*`):
- `models_registered` - Registered models
- `assessments_pending` - Pending assessments
- `bias_alerts` - Bias detection alerts
- `fairness_score` - Average fairness score
- `ethical_reviews_pending` - Pending ethical reviews
- `governance_score` - Overall governance score
- `monitoring_alerts` - Active monitoring alerts

**Code Search KPIs** (`/ai/code-search`):
- `indexed_surfaces` - Indexed code surfaces
- `search_queries` - Search query count
- `search_latency` - Average search latency

**Total Missing KPIs**: 25+

---

### 4. Missing Action Bindings

**Currently Seeded Actions**:
- `register_agent` on `/ai/agents`
- `add_model` on `/ai/models`

**Missing Actions Needed**:

**Gateway Actions** (`/ai/gateway`):
- `update_quota` - Update quota limits
- `configure_routing` - Configure provider routing
- `toggle_rate_limit` - Toggle rate limiting
- `view_cost_report` - View cost report

**Engine Actions** (`/ai/engine`):
- `start_agent` - Start an agent
- `stop_agent` - Stop an agent
- `restart_kernel` - Restart AI kernel
- `view_process_table` - View process table
- `execute_workflow` - Execute Temporal workflow

**Budget Actions** (`/ai/budgets`):
- `set_budget_limit` - Set budget limit
- `adjust_allocation` - Adjust budget allocation
- `view_cost_breakdown` - View cost breakdown

**Kill Switch Actions** (`/ai/kill-switches`):
- `activate_kill_switch` - Activate kill switch
- `deactivate_kill_switch` - Deactivate kill switch
- `configure_circuit_breaker` - Configure circuit breaker

**Prompt Actions** (`/ai/prompts`):
- `create_prompt` - Create prompt template
- `edit_prompt` - Edit prompt template
- `test_prompt` - Test prompt template
- `publish_prompt` - Publish prompt template

**Context Source Actions** (`/ai/context-sources`):
- `add_context_source` - Add context source
- `remove_context_source` - Remove context source
- `test_connection` - Test connection

**Delegation Actions** (`/ai/delegations`):
- `grant_delegation` - Grant delegation
- `revoke_delegation` - Revoke delegation
- `view_delegation_chain` - View delegation chain

**HITL Actions** (`/ai/hitl`):
- `approve_action` - Approve HITL action
- `reject_action` - Reject HITL action
- `configure_hitl_gate` - Configure HITL gate

**Governance Actions** (`/ai/governance/*`):
- `register_model` - Register model for governance
- `run_assessment` - Run governance assessment
- `view_bias_report` - View bias report
- `view_fairness_metrics` - View fairness metrics
- `request_ethical_review` - Request ethical review
- `view_impact_assessment` - View impact assessment
- `view_data_lineage` - View data lineage
- `view_explainability_report` - View explainability report
- `view_transparency_report` - View transparency report
- `view_validation_results` - View validation results

**Code Search Actions** (`/ai/code-search`):
- `register_engine` - Register search engine
- `index_surface` - Index code surface
- `remove_index` - Remove index
- `reindex_all` - Reindex all surfaces

**Total Missing Actions**: 40+

---

### 5. Missing Widget Bindings

**Currently Seeded Widgets**:
- `ai_overview` on `/ai-hub`
- `agents_table` on `/ai/agents`
- `models_table` on `/ai/models`

**Missing Widgets Needed**:

**Gateway Widgets** (`/ai/gateway`):
- `quota_widget` - Quota usage display
- `cost_widget` - Cost display
- `request_chart` - Request chart
- `latency_chart` - Latency chart

**Engine Widgets** (`/ai/engine`):
- `kernel_status` - Kernel status
- `process_table` - Process table
- `workflow_timeline` - Workflow timeline
- `agent_activity` - Agent activity

**Budget Widgets** (`/ai/budgets`):
- `budget_chart` - Budget chart
- `cost_breakdown` - Cost breakdown
- `projection_widget` - Cost projection

**Kill Switch Widgets** (`/ai/kill-switches`):
- `kill_switch_status` - Kill switch status
- `circuit_breaker_status` - Circuit breaker status
- `blocked_requests_chart` - Blocked requests chart

**Governance Widgets** (`/ai/governance/*`):
- `model_registry` - Model registry
- `assessment_timeline` - Assessment timeline
- `bias_heatmap` - Bias heatmap
- `fairness_chart` - Fairness chart
- `ethical_review_queue` - Ethical review queue
- `impact_assessment_chart` - Impact assessment chart
- `data_lineage_graph` - Data lineage graph
- `monitoring_alerts` - Monitoring alerts

**Code Search Widgets** (`/ai/code-search`):
- `engine_registry` - Engine registry
- `indexed_surfaces` - Indexed surfaces
- `search_stats` - Search statistics

**Total Missing Widgets**: 25+

---

### 6. Missing Data Resource Bindings

**Currently Seeded Data Resources**:
- `ai.resource.agents` - `/api/ai/agents`
- `ai.resource.models` - `/api/ai/models`

**Missing Data Resources Needed**:

**Gateway Data Resources**:
- `ai.resource.gateway.stats` - `/api/ai/stats`
- `ai.resource.gateway.quota` - `/api/ai/quota`
- `ai.resource.gateway.cost` - `/api/ai/cost`

**Engine Data Resources**:
- `ai.resource.engine.status` - `/api/ai-engine/status`
- `ai.resource.engine.processes` - `/api/ai-engine/processes`
- `ai.resource.engine.workflows` - `/api/ai-engine/workflows`

**Budget Data Resources**:
- `ai.resource.budgets` - `/api/ai/budgets`
- `ai.resource.budget.usage` - `/api/ai/budgets/usage`

**Kill Switch Data Resources**:
- `ai.resource.kill_switches` - `/api/ai/kill-switches`
- `ai.resource.circuit_breaker` - `/api/ai/circuit-breaker`

**Prompt Data Resources**:
- `ai.resource.prompts` - `/api/ai/prompts`
- `ai.resource.prompt_templates` - `/api/ai/prompt-templates`

**Context Source Data Resources**:
- `ai.resource.context_sources` - `/api/ai/context-sources`

**Delegation Data Resources**:
- `ai.resource.delegations` - `/api/ai/delegations`

**HITL Data Resources**:
- `ai.resource.hitl_states` - `/api/ai/hitl/states`
- `ai.resource.hitl_gates` - `/api/ai/hitl/gates`

**Governance Data Resources**:
- `ai.resource.governance.models` - `/api/ai-governance/models`
- `ai.resource.governance.assessments` - `/api/ai-governance/assessments`
- `ai.resource.governance.bias` - `/api/ai-governance/bias`
- `ai.resource.governance.fairness` - `/api/ai-governance/fairness`
- `ai.resource.governance.ethical` - `/api/ai-governance/ethical`
- `ai.resource.governance.impact` - `/api/ai-governance/impact`
- `ai.resource.governance.audit` - `/api/ai-governance/audit`
- `ai.resource.governance.data_lineage` - `/api/ai-governance/data-lineage`
- `ai.resource.governance.explainability` - `/api/ai-governance/explainability`
- `ai.resource.governance.transparency` - `/api/ai-governance/transparency`
- `ai.resource.governance.use_cases` - `/api/ai-governance/use-cases`
- `ai.resource.governance.validation` - `/api/ai-governance/validation`
- `ai.resource.governance.inventory` - `/api/ai-governance/inventory`
- `ai.resource.governance.monitoring` - `/api/ai-governance/monitoring`

**Code Search Data Resources**:
- `ai.resource.code_search.engines` - `/api/ai/code-search/engines`
- `ai.resource.code_search.surfaces` - `/api/ai/code-search/surfaces`

**Total Missing Data Resources**: 30+

---

### 7. Missing Agent Placements

**Currently Seeded Agent Placements**:
- A01 on `/ai-hub`, `/ai/agents`, `/ai/models`
- A08 on `/ai-governance`

**Missing Agent Placements Needed**:

**Gateway Pages**:
- A01 (autonomous) on `/ai/gateway` - for quota optimization
- A07 (risk monitor) on `/ai/gateway` - for cost monitoring

**Engine Pages**:
- A01 (autonomous) on `/ai/engine` - for kernel management
- A02 (identity) on `/ai/engine` - for process management

**Budget Pages**:
- A07 (risk monitor) on `/ai/budgets` - for budget alerts
- A04 (risk) on `/ai/budgets` - for cost assessment

**Kill Switch Pages**:
- A07 (risk monitor) on `/ai/kill-switches` - for alerting
- A08 (governance) on `/ai/kill-switches` - for policy enforcement

**Prompt Pages**:
- A01 (autonomous) on `/ai/prompts` - for prompt optimization

**Context Source Pages**:
- A02 (identity) on `/ai/context-sources` - for source management

**Delegation Pages**:
- A01 (autonomous) on `/ai/delegations` - for delegation orchestration

**HITL Pages**:
- A08 (governance) on `/ai/hitl` - for policy checks

**Governance Pages**:
- A08 (governance) on `/ai/governance/policies` - for policy enforcement
- A09 (regulatory) on `/ai/governance/assessments` - for regulatory analysis
- A08 (governance) on `/ai/governance/bias` - for bias monitoring
- A08 (governance) on `/ai/governance/fairness` - for fairness monitoring
- A09 (regulatory) on `/ai/governance/ethical` - for ethical reviews
- A04 (risk) on `/ai/governance/impact` - for impact assessment
- A08 (governance) on `/ai/governance/audit` - for audit logging
- A08 (governance) on `/ai/governance/monitoring` - for monitoring alerts

**Code Search Pages**:
- A01 (autonomous) on `/ai/code-search` - for code discovery

**Total Missing Agent Placements**: 20+

---

### 8. Missing Navigation Entries

**Currently Seeded Navigation**:
- `/ai-hub` - AI Hub
- `/ai/agents` - Agents
- `/ai-governance` - AI Governance
- `/ai/models` - AI Models

**Missing Navigation Entries Needed**:

**Gateway Navigation**:
- `/ai/gateway` - AI Gateway (parent: AI Hub)

**Engine Navigation**:
- `/ai/engine` - AI Engine (parent: AI Hub)
- `/ai/kernel` - AI Kernel (parent: AI Engine)

**Budget Navigation**:
- `/ai/budgets` - Budgets (parent: AI Hub)

**Kill Switch Navigation**:
- `/ai/kill-switches` - Kill Switches (parent: AI Hub)

**Prompt Navigation**:
- `/ai/prompts` - Prompts (parent: AI Hub)

**Context Source Navigation**:
- `/ai/context-sources` - Context Sources (parent: AI Hub)

**Delegation Navigation**:
- `/ai/delegations` - Delegations (parent: AI Hub)

**HITL Navigation**:
- `/ai/hitl` - HITL (parent: AI Hub)

**Governance Navigation** (hierarchical under `/ai-governance`):
- `/ai/governance/policies` - Policies
- `/ai/governance/models` - Model Registry
- `/ai/governance/assessments` - Assessments
- `/ai/governance/bias` - Bias Reports
- `/ai/governance/fairness` - Fairness Metrics
- `/ai/governance/ethical` - Ethical Reviews
- `/ai/governance/impact` - Impact Assessments
- `/ai/governance/audit` - Audit Log
- `/ai/governance/data-lineage` - Data Lineage
- `/ai/governance/explainability` - Explainability
- `/ai/governance/transparency` - Transparency Reports
- `/ai/governance/use-cases` - Use Cases
- `/ai/governance/validation` - Validation Results
- `/ai/governance/inventory` - Inventory
- `/ai/governance/monitoring` - Monitoring Alerts

**Code Search Navigation**:
- `/ai/code-search` - Code Search (parent: AI Hub)

**Total Missing Navigation Entries**: 25+

---

### 9. Missing Metadata

**Missing i18n Keys**:
- All title_key, subtitle_key for missing routes
- All label_key for missing actions
- All label_key for missing navigation entries
- English and Arabic translations needed

**Missing Permission Keys**:
- `ai.gateway.read`, `ai.gateway.write`, `ai.gateway.admin`
- `ai.engine.read`, `ai.engine.write`, `ai.engine.admin`
- `ai.budgets.read`, `ai.budgets.write`, `ai.budgets.admin`
- `ai.kill_switches.read`, `ai.kill_switches.write`, `ai.kill_switches.admin`
- `ai.prompts.read`, `ai.prompts.write`, `ai.prompts.admin`
- `ai.context_sources.read`, `ai.context_sources.write`, `ai.context_sources.admin`
- `ai.delegations.read`, `ai.delegations.write`, `ai.delegations.admin`
- `ai.hitl.read`, `ai.hitl.write`, `ai.hitl.admin`
- `ai.governance.policies.read`, `ai.governance.policies.write`, `ai.governance.policies.admin`
- `ai.governance.models.read`, `ai.governance.models.write`, `ai.governance.models.admin`
- `ai.governance.assessments.read`, `ai.governance.assessments.write`, `ai.governance.assessments.admin`
- `ai.governance.bias.read`, `ai.governance.bias.write`, `ai.governance.bias.admin`
- `ai.governance.fairness.read`, `ai.governance.fairness.write`, `ai.governance.fairness.admin`
- `ai.governance.ethical.read`, `ai.governance.ethical.write`, `ai.governance.ethical.admin`
- `ai.governance.impact.read`, `ai.governance.impact.write`, `ai.governance.impact.admin`
- `ai.governance.audit.read`, `ai.governance.audit.write`, `ai.governance.audit.admin`
- `ai.governance.data_lineage.read`, `ai.governance.data_lineage.write`, `ai.governance.data_lineage.admin`
- `ai.governance.explainability.read`, `ai.governance.explainability.write`, `ai.governance.explainability.admin`
- `ai.governance.transparency.read`, `ai.governance.transparency.write`, `ai.governance.transparency.admin`
- `ai.governance.use_cases.read`, `ai.governance.use_cases.write`, `ai.governance.use_cases.admin`
- `ai.governance.validation.read`, `ai.governance.validation.write`, `ai.governance.validation.admin`
- `ai.governance.inventory.read`, `ai.governance.inventory.write`, `ai.governance.inventory.admin`
- `ai.governance.monitoring.read`, `ai.governance.monitoring.write`, `ai.governance.monitoring.admin`
- `ai.code_search.read`, `ai.code_search.write`, `ai.code_search.admin`

**Total Missing Permission Keys**: 60+

**Missing Workflow Codes**:
- `ai_quota_update`
- `ai_routing_config`
- `ai_agent_lifecycle`
- `ai_kernel_restart`
- `ai_budget_allocation`
- `ai_kill_switch_activation`
- `ai_prompt_lifecycle`
- `ai_delegation_workflow`
- `ai_hitl_approval`
- `ai_governance_assessment`
- `ai_governance_model_approval`
- `ai_governance_ethical_review`

**Total Missing Workflow Codes**: 12+

---

## Summary

| Category | Currently Seeded | Missing | Total Needed |
|----------|------------------|---------|--------------|
| Routes | 4 | 28+ | 32+ |
| IBM Carbon Components | 2 (generic) | 28+ | 30+ |
| KPIs | 2 | 25+ | 27+ |
| Actions | 2 | 40+ | 42+ |
| Widgets | 3 | 25+ | 28+ |
| Data Resources | 2 | 30+ | 32+ |
| Agent Placements | 2 | 20+ | 22+ |
| Navigation Entries | 4 | 25+ | 29+ |
| Permission Keys | 2 | 60+ | 62+ |
| Workflow Codes | 0 | 12+ | 12+ |
| i18n Keys | Minimal | 100+ | 100+ |

**Total Missing Bindings**: 300+

---

## Recommended Next Steps

1. **Phase 1**: Seed core AI-OS pages (Gateway, Engine, Kernel)
2. **Phase 2**: Seed AI Governance pages (Policies, Models, Assessments)
3. **Phase 3**: Seed Budget and Kill Switch pages
4. **Phase 4**: Seed Prompt and Context Source pages
5. **Phase 5**: Seed Delegation and HITL pages
6. **Phase 6**: Seed Code Search pages
7. **Phase 7**: Add all missing KPIs, Actions, Widgets
8. **Phase 8**: Add all missing Data Resources
9. **Phase 9**: Add all missing Agent Placements
10. **Phase 10**: Add all missing Navigation entries
11. **Phase 11**: Add all missing Permission keys
12. **Phase 12**: Add all missing i18n keys (English + Arabic)
13. **Phase 13**: Add all missing Workflow codes
