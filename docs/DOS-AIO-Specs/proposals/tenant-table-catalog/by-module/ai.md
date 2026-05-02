# Module: `ai`

**Owner service:** `ai-gateway-service` -- **Tables:** 175 -- **Has-data:** 15 -- **Schema-only:** 160

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `agent_action_history` | 13 | Ai -- Agent Action: Historical change records | P |  |
| 2 | `agent_activation_rules` | 14 | Ai -- Agent Activation: Rules/policy definitions | P |  |
| 3 | `agent_activity_log` | 40 | Ai -- Agent Activity: Activity/audit log records | P |  |
| 4 | `agent_anomaly_detections` | 21 | Ai -- AI agent record (Agent Anomaly Detections) | T |  |
| 5 | `agent_approvals_v2` | 6 | Ai -- AI agent record (Agent Approvals V2) | T |  |
| 6 | `agent_assignment_templates` | 15 | Ai -- Agent Assignment: Template catalog | P |  |
| 7 | `agent_autonomy_policies` | 10 | Ai -- AI agent record (Agent Autonomy Policies) | T | ✓ |
| 8 | `agent_circuit_breaker` | 11 | Ai -- AI agent record (Agent Circuit Breaker) | T |  |
| 9 | `agent_collaboration_metrics` | 8 | Ai -- Agent Collaboration: Metric data points | P |  |
| 10 | `agent_conflicts` | 19 | Ai -- AI agent record (Agent Conflicts) | T |  |
| 11 | `agent_context_assignments` | 16 | Ai -- Agent Context: Assignment mapping (X to Y) | P |  |
| 12 | `agent_correlations` | 6 | Ai -- AI agent record (Agent Correlations) | T |  |
| 13 | `agent_cycle_memory` | 8 | Ai -- AI agent record (Agent Cycle Memory) | T |  |
| 14 | `agent_cycle_summaries` | 9 | Ai -- Agent Cycle: Aggregated summary records | P | ✓ |
| 15 | `agent_dead_letter_queue` | 24 | Ai -- AI agent record (Agent Dead Letter Queue) | T |  |
| 16 | `agent_delegations` | 21 | Ai -- AI agent record (Agent Delegations) | T |  |
| 17 | `agent_dependency_config` | 14 | Ai -- Agent Dependency: Configuration values | P |  |
| 18 | `agent_discoveries` | 9 | Ai -- AI agent record (Agent Discoveries) | T |  |
| 19 | `agent_eval_scores` | 11 | Ai -- AI agent record (Agent Eval Scores) | T |  |
| 20 | `agent_events` | 8 | Ai -- Agent: Domain event records | P | ✓ |
| 21 | `agent_failure_patterns` | 21 | Ai -- AI agent record (Agent Failure Patterns) | T |  |
| 22 | `agent_feedback` | 16 | Ai -- AI agent record (Agent Feedback) | T |  |
| 23 | `agent_governance_audit` | 7 | Ai -- Agent Governance: Audit-trail entries | P |  |
| 24 | `agent_learning_events` | 11 | Ai -- Agent Learning: Domain event records | P |  |
| 25 | `agent_lesson_applications` | 8 | Ai -- AI agent record (Agent Lesson Applications) | T |  |
| 26 | `agent_lessons_learned` | 15 | Ai -- AI agent record (Agent Lessons Learned) | T |  |
| 27 | `agent_memories` | 19 | Ai -- AI agent record (Agent Memories) | T |  |
| 28 | `agent_mode_overrides` | 11 | Ai -- AI agent record (Agent Mode Overrides) | T |  |
| 29 | `agent_model_config` | 10 | Ai -- Agent Model: Configuration values | P | ✓ |
| 30 | `agent_model_performance_cache` | 16 | Ai -- Agent Model Performance: Cached values | P |  |
| 31 | `agent_patterns` | 11 | Ai -- AI agent record (Agent Patterns) | T |  |
| 32 | `agent_pending_actions` | 17 | Ai -- Agent Pending: Action/operation catalog | P |  |
| 33 | `agent_process_governance_rules` | 20 | Ai -- Agent Process Governance: Rules/policy definitions | P |  |
| 34 | `agent_profiles` | 21 | Ai -- AI agent record (Agent Profiles) | T |  |
| 35 | `agent_prompt_versions` | 12 | Ai -- Agent Prompt: Versioned record history | P |  |
| 36 | `agent_proposals` | 15 | Ai -- AI agent record (Agent Proposals) | T |  |
| 37 | `agent_reasoning_chain` | 36 | Ai -- AI agent record (Agent Reasoning Chain) | T |  |
| 38 | `agent_reasoning_steps` | 11 | Ai -- Agent Reasoning: Execution step records | P | ✓ |
| 39 | `agent_reasoning_traces` | 9 | Ai -- AI agent record (Agent Reasoning Traces) | T | ✓ |
| 40 | `agent_runs` | 21 | Ai -- Agent: Execution run records | P |  |
| 41 | `agent_runtime_config` | 14 | Ai -- Agent Runtime: Configuration values | P |  |
| 42 | `agent_sla_activation_rules` | 15 | Ai -- Agent Sla Activation: Rules/policy definitions | P |  |
| 43 | `agent_slo_definitions` | 14 | Ai -- Agent Slo: Definition catalog | P |  |
| 44 | `agent_slo_measurements` | 16 | Ai -- AI agent record (Agent Slo Measurements) | T |  |
| 45 | `agent_status_log` | 5 | Ai -- Agent Status: Activity/audit log records | P |  |
| 46 | `agent_steps` | 16 | Ai -- Agent: Execution step records | P |  |
| 47 | `agent_suggestions` | 10 | Ai -- AI agent record (Agent Suggestions) | T |  |
| 48 | `agent_tasks` | 18 | Ai -- Agent: Task records | P |  |
| 49 | `agent_tool_permissions` | 10 | Ai -- Agent Tool: Permission grants | P |  |
| 50 | `agent_trigger_chains` | 9 | Ai -- AI agent record (Agent Trigger Chains) | T | ✓ |
| 51 | `agent_user_feedback` | 8 | Ai -- AI agent record (Agent User Feedback) | T |  |
| 52 | `agrc_event_log` | 13 | Ai -- Agrc Event: Activity/audit log records | P | ✓ |
| 53 | `agrc_event_log_archive` | 8 | Ai -- Agrc Event Log Archive | N |  |
| 54 | `agrc_metrics_snapshots` | 9 | Ai -- Agrc Metrics: Point-in-time snapshots | P |  |
| 55 | `agrc_os_cycle_log` | 9 | Ai -- Agrc Os Cycle: Activity/audit log records | P |  |
| 56 | `ai_action_decision_log` | 12 | Ai -- Ai Action Decision: Activity/audit log records | P |  |
| 57 | `ai_action_policies` | 10 | Ai -- Ai Action Policies | N | ✓ |
| 58 | `ai_action_queue` | 14 | Ai -- Work queue records (Ai Action Queue) | T |  |
| 59 | `ai_action_results` | 9 | Ai -- Ai Action Results | N |  |
| 60 | `ai_agent_authority_scopes` | 15 | Ai -- AI agent record (Ai Agent Authority Scopes) | T |  |
| 61 | `ai_agent_bias_detection` | 21 | Ai -- AI agent record (Ai Agent Bias Detection) | T |  |
| 62 | `ai_agent_chain_of_custody` | 10 | Ai -- AI agent record (Ai Agent Chain Of Custody) | T |  |
| 63 | `ai_agent_configs` | 24 | Ai -- AI agent record (Ai Agent Configs) | T |  |
| 64 | `ai_agent_performance_metrics` | 13 | Ai -- Ai Agent Performance: Metric data points | P |  |
| 65 | `ai_agent_registry` | 21 | Ai -- AI agent record (Ai Agent Registry) | T |  |
| 66 | `ai_agent_session_governance` | 19 | Ai -- AI agent record (Ai Agent Session Governance) | T |  |
| 67 | `ai_agent_status_log` | 9 | Ai -- Ai Agent Status: Activity/audit log records | P |  |
| 68 | `ai_agent_tool_bindings` | 10 | Ai -- AI agent record (Ai Agent Tool Bindings) | T |  |
| 69 | `ai_agent_trust_scores` | 15 | Ai -- AI agent record (Ai Agent Trust Scores) | T |  |
| 70 | `ai_alert_history` | 16 | Ai -- Ai Alert: Historical change records | P |  |
| 71 | `ai_alert_rules` | 12 | Ai -- Ai Alert: Rules/policy definitions | P |  |
| 72 | `ai_alerts` | 18 | Ai -- Ai: Alert records | P | ✓ |
| 73 | `ai_analysis_cache` | 11 | Ai -- Ai Analysis: Cached values | P |  |
| 74 | `ai_asset_inventory` | 20 | Ai -- Asset record (Ai Asset Inventory) | T |  |
| 75 | `ai_autonomy_state` | 6 | Ai -- Ai Autonomy: State-machine state | P |  |
| 76 | `ai_capability_registry` | 15 | Ai -- Ai Capability Registry | N | ✓ |
| 77 | `ai_compliance_dashboard` | 18 | Ai -- Compliance record (Ai Compliance Dashboard) | T |  |
| 78 | `ai_compliance_framework_mapping` | 21 | Ai -- Ai Compliance Framework: Cross-entity mapping | P |  |
| 79 | `ai_conformity_assessments` | 26 | Ai -- Ai Conformity Assessments | N |  |
| 80 | `ai_corrective_actions` | 13 | Ai -- Ai Corrective: Action/operation catalog | P |  |
| 81 | `ai_counterfactual_analysis` | 12 | Ai -- Ai Counterfactual Analysis | N |  |
| 82 | `ai_data_lineage` | 22 | Ai -- Ai Data Lineage | N |  |
| 83 | `ai_data_minimization_config` | 11 | Ai -- Ai Data Minimization: Configuration values | P |  |
| 84 | `ai_dataset_registry` | 14 | Ai -- Ai Dataset Registry | N |  |
| 85 | `ai_declarations_of_conformity` | 12 | Ai -- Ai Declarations Of Conformity | N |  |
| 86 | `ai_dpia_assessments` | 32 | Ai -- Ai Dpia Assessments | N |  |
| 87 | `ai_dpia_review_history` | 13 | Ai -- Ai Dpia Review: Historical change records | P |  |
| 88 | `ai_dpia_risk_factors` | 10 | Ai -- Risk record (Ai Dpia Risk Factors) | T |  |
| 89 | `ai_drift_thresholds` | 10 | Ai -- Ai Drift: Threshold definitions | P |  |
| 90 | `ai_ethics_reviews` | 13 | Ai -- Ai Ethics Reviews | N |  |
| 91 | `ai_ethics_votes` | 7 | Ai -- Ai Ethics Votes | N |  |
| 92 | `ai_eu_classifications` | 9 | Ai -- Ai Eu Classifications | N |  |
| 93 | `ai_explainability_records` | 21 | Ai -- Ai Explainability Records | N |  |
| 94 | `ai_explainability_requirements` | 14 | Ai -- Ai Explainability Requirements | N |  |
| 95 | `ai_fairness_metrics` | 11 | Ai -- Ai Fairness: Metric data points | P |  |
| 96 | `ai_fairness_scans` | 9 | Ai -- Ai Fairness Scans | N |  |
| 97 | `ai_framework_control_catalog` | 13 | Ai -- Framework definition (Ai Framework Control Catalog) | T |  |
| 98 | `ai_framework_risk_classifications` | 15 | Ai -- Framework definition (Ai Framework Risk Classifications) | T |  |
| 99 | `ai_hitl_controls` | 15 | Ai -- Control record (Ai Hitl Controls) | T |  |
| 100 | `ai_human_overrides` | 13 | Ai -- Ai Human Overrides | N |  |
| 101 | `ai_impact_assessments` | 19 | Ai -- Ai Impact Assessments | N |  |
| 102 | `ai_incident_classifications` | 12 | Ai -- Incident record (Ai Incident Classifications) | T |  |
| 103 | `ai_inline_bias_checks` | 10 | Ai -- Ai Inline Bias Checks | N |  |
| 104 | `ai_kill_switches` | 15 | Ai -- Ai Kill Switches | N |  |
| 105 | `ai_model_cards` | 5 | Ai -- Ai Model Cards | N |  |
| 106 | `ai_model_experiments` | 22 | Ai -- Ai Model Experiments | N |  |
| 107 | `ai_model_lifecycle` | 17 | Ai -- Ai Model Lifecycle | N |  |
| 108 | `ai_model_metrics` | 8 | Ai -- Ai Model: Metric data points | P |  |
| 109 | `ai_model_modifications` | 13 | Ai -- Ai Model Modifications | N |  |
| 110 | `ai_model_provenance` | 36 | Ai -- Ai Model Provenance | N |  |
| 111 | `ai_model_registry` | 29 | Ai -- Ai Model Registry | N |  |
| 112 | `ai_model_risk_assessments` | 13 | Ai -- Risk record (Ai Model Risk Assessments) | T |  |
| 113 | `ai_model_risk_scores` | 13 | Ai -- Risk record (Ai Model Risk Scores) | T |  |
| 114 | `ai_monitoring_plans` | 12 | Ai -- Ai Monitoring Plans | N |  |
| 115 | `ai_observations` | 16 | Ai -- Ai Observations | N |  |
| 116 | `ai_performance_metrics` | 13 | Ai -- Ai Performance: Metric data points | P |  |
| 117 | `ai_policy_rule` | 13 | Ai -- Ai Policy: Rule/policy definition | P |  |
| 118 | `ai_privacy_impact_register` | 21 | Ai -- Ai Privacy Impact Register | N |  |
| 119 | `ai_privacy_incidents` | 21 | Ai -- Incident record (Ai Privacy Incidents) | T |  |
| 120 | `ai_profiling_register` | 15 | Ai -- Ai Profiling Register | N |  |
| 121 | `ai_prompt_registry` | 23 | Ai -- Prompt template/log (Ai Prompt Registry) | T |  |
| 122 | `ai_provider_registry` | 15 | Ai -- Ai Provider Registry | N |  |
| 123 | `ai_red_team_schedules` | 11 | Ai -- Team record (Ai Red Team Schedules) | T |  |
| 124 | `ai_regulatory_changes` | 13 | Ai -- Ai Regulatory Changes | N |  |
| 125 | `ai_review_queue` | 12 | Ai -- Work queue records (Ai Review Queue) | T |  |
| 126 | `ai_risk_models` | 18 | Ai -- Risk record (Ai Risk Models) | T |  |
| 127 | `ai_serious_incidents` | 19 | Ai -- Incident record (Ai Serious Incidents) | T |  |
| 128 | `ai_stakeholder_registry` | 9 | Ai -- Ai Stakeholder Registry | N |  |
| 129 | `ai_summaries` | 12 | Ai -- Ai: Aggregated summary records | P |  |
| 130 | `ai_supplier_agreements` | 13 | Ai -- Ai Supplier Agreements | N |  |
| 131 | `ai_system_logs` | 7 | Ai -- Ai System Logs | N |  |
| 132 | `ai_system_registry` | 49 | Ai -- Ai System Registry | N |  |
| 133 | `ai_technical_documentation` | 9 | Ai -- Ai Technical Documentation | N |  |
| 134 | `ai_training_data_registry` | 20 | Ai -- Ai Training Data Registry | N |  |
| 135 | `ai_transparency_metrics` | 18 | Ai -- Ai Transparency: Metric data points | P |  |
| 136 | `ai_trigger_config` | 7 | Ai -- Ai Trigger: Configuration values | P |  |
| 137 | `ai_user_complaints` | 12 | Ai -- User record (Ai User Complaints) | T |  |
| 138 | `ai_vendor_assessments` | 7 | Ai -- Vendor/third-party record (Ai Vendor Assessments) | T |  |
| 139 | `authz_decision_log` | 13 | Ai -- Authz Decision: Activity/audit log records | P |  |
| 140 | `automated_decision_register` | 19 | Ai -- Decision record (Automated Decision Register) | T |  |
| 141 | `automated_insights` | 22 | Ai -- Automated Insights | N | ✓ |
| 142 | `autonomy_progression_log` | 11 | Ai -- Autonomy Progression: Activity/audit log records | P |  |
| 143 | `blueprint_generation_runs` | 8 | Ai -- Blueprint Generation: Execution run records | P |  |
| 144 | `cockpit_signal` | 8 | Ai -- Cockpit Signal | N |  |
| 145 | `contextual_suggestions` | 14 | Contextual AI suggestions | R |  |
| 146 | `copilot_proposed_actions` | 30 | Ai -- Copilot Proposed: Action/operation catalog | P |  |
| 147 | `copilot_sessions` | 5 | Ai -- Copilot session/turn record (Copilot Sessions) | T |  |
| 148 | `decision_record` | 17 | Ai -- Decision record (Decision Record) | T |  |
| 149 | `dogan_actions_log` | 7 | Ai -- Dogan Actions: Activity/audit log records | P |  |
| 150 | `dogan_learning_metrics` | 6 | Ai -- Dogan Learning: Metric data points | P |  |
| 151 | `event_trigger_binding` | 12 | Ai -- Event Trigger Binding | N |  |
| 152 | `explainability_links` | 9 | Ai -- Explainability: Cross-table link records | P |  |
| 153 | `findings` | 27 | Ai -- Finding record (Findings) | T | ✓ |
| 154 | `frameworks` | 22 | Ai -- Framework definition (Frameworks) | T |  |
| 155 | `hitl_states` | 11 | Ai -- Hitl: State-machine state catalog | P |  |
| 156 | `human_oversight_config` | 15 | Ai -- Human Oversight: Configuration values | P |  |
| 157 | `incidents` | 33 | Ai -- Incident record (Incidents) | T | ✓ |
| 158 | `llm_traces` | 20 | Ai -- Llm Traces | N |  |
| 159 | `llm_usage_log` | 16 | Ai -- Llm Usage: Activity/audit log records | P |  |
| 160 | `memory_access_log` | 10 | Ai -- Memory Access: Activity/audit log records | P | ✓ |
| 161 | `memory_summaries` | 9 | Ai -- Memory: Aggregated summary records | P |  |
| 162 | `module_actions` | 15 | Ai -- Module: Action/operation catalog | P |  |
| 163 | `module_activation_rules` | 12 | Ai -- Module Activation: Rules/policy definitions | P |  |
| 164 | `module_ownership_rules` | 15 | Ai -- Module Ownership: Rules/policy definitions | P |  |
| 165 | `pending_assignment_queue` | 9 | Ai -- Work queue records (Pending Assignment Queue) | T |  |
| 166 | `personal_agent_assignments` | 33 | Ai -- Personal Agent: Assignment mapping (X to Y) | P |  |
| 167 | `projects` | 38 | Ai -- Projects | N |  |
| 168 | `prompt_drift_baselines` | 7 | Ai -- Prompt template/log (Prompt Drift Baselines) | T |  |
| 169 | `prompt_injection_log` | 9 | Ai -- Prompt Injection: Activity/audit log records | P |  |
| 170 | `reasoning_chain_summary` | 19 | Ai -- Reasoning Chain: Aggregated summary view | P |  |
| 171 | `shadow_agent_config` | 20 | Ai -- Shadow Agent: Configuration values | P |  |
| 172 | `task_route_rule` | 12 | Ai -- Task Route: Rule/policy definition | P |  |
| 173 | `team_workload` | 20 | Ai -- Team record (Team Workload) | T |  |
| 174 | `tenant_llm_budgets` | 11 | Ai -- Tenant Llm Budgets | N |  |
| 175 | `unified_squad_members` | 16 | Ai -- Unified Squad: Member records | P |  |
