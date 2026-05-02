# Tenant Schema Table Catalog

**Source:** `migration/inventory/table-ownership-map.json` (generated 2026-04-12T05:12:21.132Z)

**Total tenant-scoped tables:** 1378 across **55 modules**

Each tenant schema (e.g. `tenant_dogan`, `tenant_51f36271df62ea3d`) contains all of these tables.

## Module summary

| Module | Owner service | Tables | Has-data | Schema-only |
|---|---|---:|---:|---:|
| `ai` | `ai-gateway-service` | 175 | 15 | 160 |
| `admin` | `tenant-service` | 147 | 45 | 102 |
| `compliance` | `compliance-controls-service` | 94 | 11 | 83 |
| `governance` | `governance-policy-service` | 86 | 6 | 80 |
| `workflow` | `workflow-service` | 83 | 22 | 61 |
| `auth` | `auth-service` | 81 | 30 | 51 |
| `qiyas` | `compliance-controls-service` | 72 | 2 | 70 |
| `evidence` | `evidence-audit-reporting-service` | 49 | 8 | 41 |
| `risk` | `risk-incident-service` | 49 | 3 | 46 |
| `foundation` | `tenant-service` | 46 | 8 | 38 |
| `integrations` | `gateway` | 38 | 4 | 34 |
| `vendor` | `risk-incident-service` | 38 | 3 | 35 |
| `onboarding` | `onboarding-service` | 34 | 6 | 28 |
| `audit` | `evidence-audit-reporting-service` | 30 | 3 | 27 |
| `incident` | `risk-incident-service` | 29 | 3 | 26 |
| `policy` | `governance-policy-service` | 29 | 5 | 24 |
| `governance-os` | `governance-policy-service` | 26 | 0 | 26 |
| `dora` | `compliance-controls-service` | 22 | 2 | 20 |
| `bcp` | `risk-incident-service` | 22 | 3 | 19 |
| `privacy` | `compliance-controls-service` | 21 | 0 | 21 |
| `agrc-engine` | `ai-gateway-service` | 20 | 6 | 14 |
| `training` | `compliance-controls-service` | 19 | 5 | 14 |
| `local-knowledge` | `compliance-controls-service` | 15 | 0 | 15 |
| `asset` | `risk-incident-service` | 12 | 2 | 10 |
| `action` | `risk-incident-service` | 11 | 3 | 8 |
| `dashboard` | `evidence-audit-reporting-service` | 9 | 2 | 7 |
| `ai-governance` | `ai-gateway-service` | 8 | 0 | 8 |
| `notification` | `notification-service` | 8 | 1 | 7 |
| `mcp` | `ai-gateway-service` | 8 | 0 | 8 |
| `navigation` | `tenant-service` | 8 | 3 | 5 |
| `workspace` | `tenant-service` | 8 | 0 | 8 |
| `proactive-leadership` | `governance-policy-service` | 7 | 0 | 7 |
| `quality-gate` | `tenant-service` | 7 | 0 | 7 |
| `ksa-regulatory` | `compliance-controls-service` | 6 | 2 | 4 |
| `analytics` | `evidence-audit-reporting-service` | 5 | 0 | 5 |
| `records` | `evidence-audit-reporting-service` | 5 | 0 | 5 |
| `exception` | `compliance-controls-service` | 5 | 1 | 4 |
| `reporting` | `evidence-audit-reporting-service` | 5 | 1 | 4 |
| `team` | `tenant-service` | 5 | 2 | 3 |
| `governance-ai` | `governance-policy-service` | 4 | 1 | 3 |
| `provisioning` | `tenant-service` | 4 | 0 | 4 |
| `remediation` | `risk-incident-service` | 4 | 1 | 3 |
| `controls` | `compliance-controls-service` | 3 | 0 | 3 |
| `delegation` | `auth-service` | 3 | 0 | 3 |
| `security` | `auth-service` | 3 | 0 | 3 |
| `widgets` | `evidence-audit-reporting-service` | 3 | 2 | 1 |
| `attestation` | `evidence-audit-reporting-service` | 2 | 0 | 2 |
| `dashboard-editor` | `evidence-audit-reporting-service` | 2 | 1 | 1 |
| `sod` | `auth-service` | 2 | 0 | 2 |
| `access` | `auth-service` | 1 | 0 | 1 |
| `connectors` | `gateway` | 1 | 0 | 1 |
| `knowledge` | `compliance-controls-service` | 1 | 0 | 1 |
| `operating` | `tenant-service` | 1 | 0 | 1 |
| `mobile` | `notification-service` | 1 | 0 | 1 |
| `webhooks` | `gateway` | 1 | 0 | 1 |
| **TOTAL** | | **1378** | | |

## Tables by module (alphabetic)

### `access` — 1 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `access_review_items` | 14 |  |  |

### `action` — 11 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `action_class_catalog` | 10 |  | ✓ |
| `action_escalation_chains` | 8 |  | ✓ |
| `action_escalation_config` | 11 |  |  |
| `action_gating_rules` | 15 |  |  |
| `action_item_templates` | 12 |  |  |
| `action_items` | 45 |  | ✓ |
| `action_items_legacy` | 19 |  |  |
| `action_sla_escalation_log` | 8 |  |  |
| `action_sla_tracking` | 18 |  |  |
| `comments` | 9 |  |  |
| `messages` | 8 |  |  |

### `admin` — 147 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `_retired_dashboard_overrides_v1` | 8 |  |  |
| `activity_feed` | 14 |  |  |
| `activity_notifications` | 7 |  |  |
| `actor_audit_log` | 12 |  |  |
| `actor_registry` | 12 |  | ✓ |
| `agrc_event_dlq` | 12 |  |  |
| `api_ai_config` | 15 |  |  |
| `api_keys` | 14 |  |  |
| `assessment_templates` | 20 |  | ✓ |
| `automation_log` | 11 |  |  |
| `automation_rules` | 24 |  | ✓ |
| `cache_dependencies` | 8 |  | ✓ |
| `cache_invalidation_log` | 7 |  |  |
| `command_palette_history` | 10 |  |  |
| `consent_records` | 7 |  |  |
| `content_pack_installations` | 6 |  |  |
| `contract_tests` | 8 |  |  |
| `cross_module_links` | 13 |  |  |
| `dos_agent_approvals` | 14 |  |  |
| `dos_agent_instructions` | 9 |  |  |
| `dos_agent_kernel_audit` | 10 |  |  |
| `dos_agent_memories` | 11 |  |  |
| `dos_agent_metrics` | 9 |  |  |
| `dos_agent_registry` | 14 |  |  |
| `dos_agent_runs` | 17 |  |  |
| `dos_agent_schedules` | 12 |  |  |
| `dos_agent_state_log` | 7 |  |  |
| `dos_agent_states` | 5 |  |  |
| `dos_agent_tasks` | 17 |  |  |
| `dos_agent_tool_audit` | 10 |  |  |
| `dos_agent_tool_calls` | 8 |  |  |
| `dos_agent_watchdog_log` | 7 |  |  |
| `email_send_log` | 13 |  |  |
| `enterprise_user_role_assignments` | 18 |  | ✓ |
| `entity_dimension_assignments` | 9 |  |  |
| `entity_instances` | 10 |  |  |
| `entity_lifecycle_log` | 11 |  |  |
| `entity_relationships` | 6 |  |  |
| `entity_routing_config` | 12 |  | ✓ |
| `entity_type_routing_config` | 10 |  | ✓ |
| `entity_types` | 9 |  | ✓ |
| `event_processing_state` | 7 |  | ✓ |
| `event_subscriptions` | 8 |  |  |
| `event_trigger_bindings` | 12 |  | ✓ |
| `explainability_packs` | 6 |  |  |
| `favorites` | 7 |  |  |
| `feature_flags` | 10 |  | ✓ |
| `file_storage` | 18 |  |  |
| `functional_roles` | 11 |  | ✓ |
| `grc_control_sector_mapping` | 6 |  |  |
| `grc_entity_profile_mapping` | 9 |  |  |
| `grc_evidence_action_mapping` | 9 |  |  |
| `grc_evidence_sector_mapping` | 6 |  |  |
| `grc_risk_sector_mapping` | 6 |  |  |
| `grc_roadmaps` | 7 |  |  |
| `grc_sector_lookup` | 7 |  | ✓ |
| `guidance_history` | 8 |  |  |
| `handoff_batches` | 11 |  | ✓ |
| `input_validation_rules` | 21 |  |  |
| `kernel_snapshots` | 4 |  |  |
| `langgraph_agent_metrics` | 30 |  | ✓ |
| `management_responses` | 10 |  |  |
| `memory_consent_log` | 8 |  |  |
| `message_read_status` | 3 |  |  |
| `metadata_records` | 9 |  |  |
| `milestone_definitions` | 13 |  |  |
| `mode_transition_audit` | 15 |  |  |
| `module_action_definitions` | 15 |  |  |
| `module_activation_events` | 8 |  |  |
| `module_activation_policies` | 8 |  | ✓ |
| `module_activation_status` | 37 |  | ✓ |
| `module_admin_config` | 8 |  |  |
| `module_approval_matrices` | 12 |  |  |
| `module_approval_matrix` | 11 |  |  |
| `module_approval_policies` | 10 |  | ✓ |
| `module_audit_config` | 12 |  | ✓ |
| `module_automation_config` | 10 |  | ✓ |
| `module_certifications` | 20 |  |  |
| `module_code_aliases` | 4 |  | ✓ |
| `module_contact_points` | 14 |  |  |
| `module_dependency_graph` | 8 |  | ✓ |
| `module_entitlement_map` | 11 |  |  |
| `module_entitlements` | 12 |  | ✓ |
| `module_entity_links` | 10 |  |  |
| `module_event_log` | 8 |  |  |
| `module_health_checks` | 7 |  |  |
| `module_health_status` | 11 |  | ✓ |
| `module_inbound_events` | 7 |  | ✓ |
| `module_kickstart_log` | 9 |  |  |
| `module_lifecycle_definitions` | 7 |  | ✓ |
| `module_lifecycle_transitions` | 13 |  | ✓ |
| `module_maturity_stages` | 11 |  |  |
| `module_metrics_snapshots` | 12 |  |  |
| `module_nav_registration` | 12 |  |  |
| `module_pages` | 16 |  | ✓ |
| `module_preflight_runs` | 9 |  |  |
| `module_readiness_results` | 8 |  |  |
| `module_readiness_thresholds` | 12 |  |  |
| `module_registry` | 19 |  | ✓ |
| `module_role_team_mappings` | 10 |  |  |
| `module_runtime_health` | 9 |  | ✓ |
| `module_settings` | 5 |  |  |
| `module_sla_tracking` | 16 |  |  |
| `module_stale_record_checks` | 7 |  |  |
| `module_user_contexts` | 8 |  |  |
| `module_workflow_profiles` | 9 |  | ✓ |
| `module_workflow_registry` | 59 |  | ✓ |
| `modules` | 25 |  |  |
| `pack_certifications` | 11 |  | ✓ |
| `pack_installations` | 11 |  |  |
| `pack_selection_decisions` | 12 |  |  |
| `pack_selection_policies` | 14 |  | ✓ |
| `pdpl_consent_records` | 16 |  |  |
| `performance_cache` | 11 |  |  |
| `permissions` | 7 |  | ✓ |
| `platform_feature_flags` | 9 |  |  |
| `platform_operation_config` | 10 |  | ✓ |
| `platform_products` | 17 |  | ✓ |
| `platform_security_config` | 14 |  | ✓ |
| `procedure_versions` | 10 |  |  |
| `profile_completeness_rules` | 12 |  |  |
| `profile_completeness_scores` | 8 |  |  |
| `rate_limit_config` | 12 |  |  |
| `role_permissions` | 2 |  | ✓ |
| `ropa_entries` | 23 |  |  |
| `route_catalog` | 15 |  |  |
| `runtime_overrides` | 10 |  |  |
| `schema_migrations` | 6 |  | ✓ |
| `search_index_config` | 8 |  |  |
| `settings` | 10 |  |  |
| `shadow_comparisons` | 16 |  |  |
| `shell_config_overrides` | 8 |  |  |
| `signal_detector_registry` | 24 |  | ✓ |
| `supervisory_reviews` | 9 |  |  |
| `system_health_snapshots` | 13 |  |  |
| `task_type_config` | 4 |  | ✓ |
| `telemetry_signals` | 8 |  |  |
| `tenant_security_config` | 9 |  | ✓ |
| `user_access_profiles` | 9 |  | ✓ |
| `user_preferences_v2` | 14 |  |  |
| `user_profiles_extended` | 23 |  |  |
| `user_sessions` | 10 |  |  |
| `webhook_deliveries` | 9 |  |  |
| `websocket_event_queue` | 7 |  |  |
| `workflow_assignments` | 16 |  |  |
| `workflow_profile_transitions` | 13 |  | ✓ |
| `workflow_sla_policies` | 13 |  |  |

### `agrc-engine` — 20 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `activity_stream` | 9 |  |  |
| `agent_handoffs` | 10 |  |  |
| `agrc_engine_dedup` | 6 |  |  |
| `agrc_engine_runs` | 16 |  |  |
| `assessment_items` | 7 |  |  |
| `bcp_plans` | 18 |  |  |
| `channels` | 5 |  |  |
| `controls` | 53 |  |  |
| `drawer_templates` | 9 |  | ✓ |
| `evidence` | 63 |  |  |
| `evidence_team_distribution` | 7 |  | ✓ |
| `framework_requirements` | 16 |  |  |
| `gate_definitions` | 22 |  | ✓ |
| `gate_validation_rules` | 12 |  |  |
| `grc_raci_assignments` | 15 |  |  |
| `member_agent_shadows` | 18 |  |  |
| `mode_operation_log` | 14 |  |  |
| `notifications` | 10 |  | ✓ |
| `policies` | 47 |  | ✓ |
| `raci_matrix` | 20 |  | ✓ |

### `ai` — 175 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `agent_action_history` | 13 |  |  |
| `agent_activation_rules` | 14 |  |  |
| `agent_activity_log` | 40 |  |  |
| `agent_anomaly_detections` | 21 |  |  |
| `agent_approvals_v2` | 6 |  |  |
| `agent_assignment_templates` | 15 |  |  |
| `agent_autonomy_policies` | 10 |  | ✓ |
| `agent_circuit_breaker` | 11 |  |  |
| `agent_collaboration_metrics` | 8 | (Platform) |  |
| `agent_conflicts` | 19 |  |  |
| `agent_context_assignments` | 16 |  |  |
| `agent_correlations` | 6 |  |  |
| `agent_cycle_memory` | 8 |  |  |
| `agent_cycle_summaries` | 9 |  | ✓ |
| `agent_dead_letter_queue` | 24 |  |  |
| `agent_delegations` | 21 |  |  |
| `agent_dependency_config` | 14 |  |  |
| `agent_discoveries` | 9 |  |  |
| `agent_eval_scores` | 11 |  |  |
| `agent_events` | 8 |  | ✓ |
| `agent_failure_patterns` | 21 |  |  |
| `agent_feedback` | 16 |  |  |
| `agent_governance_audit` | 7 |  |  |
| `agent_learning_events` | 11 |  |  |
| `agent_lesson_applications` | 8 |  |  |
| `agent_lessons_learned` | 15 |  |  |
| `agent_memories` | 19 |  |  |
| `agent_mode_overrides` | 11 |  |  |
| `agent_model_config` | 10 |  | ✓ |
| `agent_model_performance_cache` | 16 |  |  |
| `agent_patterns` | 11 |  |  |
| `agent_pending_actions` | 17 |  |  |
| `agent_process_governance_rules` | 20 |  |  |
| `agent_profiles` | 21 |  |  |
| `agent_prompt_versions` | 12 |  |  |
| `agent_proposals` | 15 |  |  |
| `agent_reasoning_chain` | 36 |  |  |
| `agent_reasoning_steps` | 11 |  | ✓ |
| `agent_reasoning_traces` | 9 |  | ✓ |
| `agent_runs` | 21 |  |  |
| `agent_runtime_config` | 14 |  |  |
| `agent_sla_activation_rules` | 15 |  |  |
| `agent_slo_definitions` | 14 |  |  |
| `agent_slo_measurements` | 16 |  |  |
| `agent_status_log` | 5 | (Platform) |  |
| `agent_steps` | 16 |  |  |
| `agent_suggestions` | 10 | (Platform) |  |
| `agent_tasks` | 18 |  |  |
| `agent_tool_permissions` | 10 |  |  |
| `agent_trigger_chains` | 9 |  | ✓ |
| `agent_user_feedback` | 8 |  |  |
| `agrc_event_log` | 13 |  | ✓ |
| `agrc_event_log_archive` | 8 |  |  |
| `agrc_metrics_snapshots` | 9 |  |  |
| `agrc_os_cycle_log` | 9 |  |  |
| `ai_action_decision_log` | 12 |  |  |
| `ai_action_policies` | 10 |  | ✓ |
| `ai_action_queue` | 14 |  |  |
| `ai_action_results` | 9 |  |  |
| `ai_agent_authority_scopes` | 15 |  |  |
| `ai_agent_bias_detection` | 21 |  |  |
| `ai_agent_chain_of_custody` | 10 |  |  |
| `ai_agent_configs` | 24 |  |  |
| `ai_agent_performance_metrics` | 13 |  |  |
| `ai_agent_registry` | 21 |  |  |
| `ai_agent_session_governance` | 19 |  |  |
| `ai_agent_status_log` | 9 | (Platform) |  |
| `ai_agent_tool_bindings` | 10 |  |  |
| `ai_agent_trust_scores` | 15 |  |  |
| `ai_alert_history` | 16 |  |  |
| `ai_alert_rules` | 12 |  |  |
| `ai_alerts` | 18 |  | ✓ |
| `ai_analysis_cache` | 11 |  |  |
| `ai_asset_inventory` | 20 |  |  |
| `ai_autonomy_state` | 6 |  |  |
| `ai_capability_registry` | 15 |  | ✓ |
| `ai_compliance_dashboard` | 18 |  |  |
| `ai_compliance_framework_mapping` | 21 |  |  |
| `ai_conformity_assessments` | 26 |  |  |
| `ai_corrective_actions` | 13 |  |  |
| `ai_counterfactual_analysis` | 12 |  |  |
| `ai_data_lineage` | 22 |  |  |
| `ai_data_minimization_config` | 11 |  |  |
| `ai_dataset_registry` | 14 |  |  |
| `ai_declarations_of_conformity` | 12 |  |  |
| `ai_dpia_assessments` | 32 |  |  |
| `ai_dpia_review_history` | 13 |  |  |
| `ai_dpia_risk_factors` | 10 |  |  |
| `ai_drift_thresholds` | 10 |  |  |
| `ai_ethics_reviews` | 13 |  |  |
| `ai_ethics_votes` | 7 |  |  |
| `ai_eu_classifications` | 9 |  |  |
| `ai_explainability_records` | 21 |  |  |
| `ai_explainability_requirements` | 14 |  |  |
| `ai_fairness_metrics` | 11 |  |  |
| `ai_fairness_scans` | 9 |  |  |
| `ai_framework_control_catalog` | 13 |  |  |
| `ai_framework_risk_classifications` | 15 |  |  |
| `ai_hitl_controls` | 15 |  |  |
| `ai_human_overrides` | 13 |  |  |
| `ai_impact_assessments` | 19 |  |  |
| `ai_incident_classifications` | 12 |  |  |
| `ai_inline_bias_checks` | 10 |  |  |
| `ai_kill_switches` | 15 |  |  |
| `ai_model_cards` | 5 |  |  |
| `ai_model_experiments` | 22 |  |  |
| `ai_model_lifecycle` | 17 |  |  |
| `ai_model_metrics` | 8 |  |  |
| `ai_model_modifications` | 13 |  |  |
| `ai_model_provenance` | 36 |  |  |
| `ai_model_registry` | 29 |  |  |
| `ai_model_risk_assessments` | 13 |  |  |
| `ai_model_risk_scores` | 13 |  |  |
| `ai_monitoring_plans` | 12 |  |  |
| `ai_observations` | 16 |  |  |
| `ai_performance_metrics` | 13 |  |  |
| `ai_policy_rule` | 13 |  |  |
| `ai_privacy_impact_register` | 21 |  |  |
| `ai_privacy_incidents` | 21 |  |  |
| `ai_profiling_register` | 15 |  |  |
| `ai_prompt_registry` | 23 |  |  |
| `ai_provider_registry` | 15 |  |  |
| `ai_red_team_schedules` | 11 |  |  |
| `ai_regulatory_changes` | 13 |  |  |
| `ai_review_queue` | 12 |  |  |
| `ai_risk_models` | 18 |  |  |
| `ai_serious_incidents` | 19 |  |  |
| `ai_stakeholder_registry` | 9 |  |  |
| `ai_summaries` | 12 |  |  |
| `ai_supplier_agreements` | 13 |  |  |
| `ai_system_logs` | 7 |  |  |
| `ai_system_registry` | 49 |  |  |
| `ai_technical_documentation` | 9 |  |  |
| `ai_training_data_registry` | 20 |  |  |
| `ai_transparency_metrics` | 18 |  |  |
| `ai_trigger_config` | 7 |  |  |
| `ai_user_complaints` | 12 |  |  |
| `ai_vendor_assessments` | 7 |  |  |
| `authz_decision_log` | 13 |  |  |
| `automated_decision_register` | 19 |  |  |
| `automated_insights` | 22 |  | ✓ |
| `autonomy_progression_log` | 11 |  |  |
| `blueprint_generation_runs` | 8 |  |  |
| `cockpit_signal` | 8 |  |  |
| `contextual_suggestions` | 14 | Contextual AI suggestions |  |
| `copilot_proposed_actions` | 30 |  |  |
| `copilot_sessions` | 5 |  |  |
| `decision_record` | 17 |  |  |
| `dogan_actions_log` | 7 |  |  |
| `dogan_learning_metrics` | 6 |  |  |
| `event_trigger_binding` | 12 |  |  |
| `explainability_links` | 9 |  |  |
| `findings` | 27 |  | ✓ |
| `frameworks` | 22 |  |  |
| `hitl_states` | 11 |  |  |
| `human_oversight_config` | 15 |  |  |
| `incidents` | 33 |  | ✓ |
| `llm_traces` | 20 |  |  |
| `llm_usage_log` | 16 |  |  |
| `memory_access_log` | 10 |  | ✓ |
| `memory_summaries` | 9 |  |  |
| `module_actions` | 15 |  |  |
| `module_activation_rules` | 12 |  |  |
| `module_ownership_rules` | 15 |  |  |
| `pending_assignment_queue` | 9 |  |  |
| `personal_agent_assignments` | 33 |  |  |
| `projects` | 38 |  |  |
| `prompt_drift_baselines` | 7 |  |  |
| `prompt_injection_log` | 9 |  |  |
| `reasoning_chain_summary` | 19 |  |  |
| `shadow_agent_config` | 20 |  |  |
| `task_route_rule` | 12 |  |  |
| `team_workload` | 20 |  |  |
| `tenant_llm_budgets` | 11 |  |  |
| `unified_squad_members` | 16 |  |  |

### `ai-governance` — 8 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `ai_governance_break_glass` | 12 |  |  |
| `ai_governance_promotions` | 10 |  |  |
| `cryptographic_inventory` | 18 |  |  |
| `pqc_test_results` | 10 |  |  |
| `quantum_migration_plans` | 19 |  |  |
| `red_team_runs` | 9 |  |  |
| `simulations` | 7 |  |  |
| `tenant_ai_allowlist` | 14 |  |  |

### `analytics` — 5 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `audit_plans` | 12 |  |  |
| `kpi_history` | 13 |  |  |
| `kpi_snapshots` | 8 |  |  |
| `remediation_tasks` | 19 |  |  |
| `user_preferences` | 13 |  |  |

### `asset` — 12 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `applications` | 27 |  |  |
| `asset_classification_scheme` | 11 |  |  |
| `asset_classifications` | 14 |  | ✓ |
| `asset_dependencies` | 14 |  |  |
| `asset_evidence_links` | 7 |  |  |
| `asset_lifecycle_events` | 10 |  |  |
| `asset_owners` | 10 |  |  |
| `asset_ownership_matrix` | 9 |  |  |
| `asset_vendor_links` | 8 |  |  |
| `assets` | 48 |  | ✓ |
| `business_services` | 23 |  |  |
| `control_asset_links` | 8 |  |  |

### `attestation` — 2 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `attestation_campaigns` | 16 |  |  |
| `attestation_records` | 12 |  |  |

### `audit` — 30 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `audit_anomalies` | 8 |  |  |
| `audit_charters` | 14 |  |  |
| `audit_engagements` | 19 |  | ✓ |
| `audit_finding_slas` | 7 |  | ✓ |
| `audit_packages` | 10 |  |  |
| `audit_qa_reviews` | 10 |  |  |
| `audit_ratings` | 9 |  |  |
| `audit_request_items` | 12 |  |  |
| `audit_requests` | 13 |  |  |
| `audit_risk_scores` | 8 |  |  |
| `audit_schedules` | 12 | (GRC) |  |
| `audit_scopes` | 9 |  |  |
| `audit_team_members` | 8 |  |  |
| `audit_templates` | 13 |  |  |
| `audit_test_plans` | 13 |  |  |
| `audit_time_entries` | 9 |  |  |
| `audit_trail` | 15 |  | ✓ |
| `audit_trail_archive` | 13 |  |  |
| `audit_universe` | 14 |  |  |
| `audit_working_papers` | 14 |  |  |
| `audits` | 16 |  |  |
| `capa_effectiveness_tests` | 10 |  |  |
| `closure_reviews` | 11 |  |  |
| `external_audit_coordination` | 14 |  |  |
| `finding_impacts` | 10 |  |  |
| `finding_root_causes` | 9 |  |  |
| `handoff_log` | 12 | Handoff logging |  |
| `intervention_audit_log` | 10 | Intervention audit logs |  |
| `regulatory_audit_requirements` | 12 |  |  |
| `repeat_findings` | 10 |  |  |

### `auth` — 81 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `actor_access_assignments` | 9 |  |  |
| `actor_role_assignments` | 11 |  |  |
| `ai_governance_roles` | 9 |  |  |
| `approval_authority_matrix` | 12 |  |  |
| `approval_chains` | 22 | Approval chain configuration |  |
| `archetype_bundle_map` | 4 |  | ✓ |
| `archetype_policy_pack_map` | 6 |  | ✓ |
| `authentication_policies` | 16 |  |  |
| `authority_level_catalog` | 9 |  | ✓ |
| `authority_levels` | 15 |  |  |
| `authorization_decision_log` | 14 |  |  |
| `authorization_mismatch_log` | 8 | Authorization mismatch logging |  |
| `authorization_permissions` | 6 |  | ✓ |
| `conditional_access_grants` | 20 |  |  |
| `dashboard_role_bindings` | 8 |  | ✓ |
| `decision_authorities` | 14 |  | ✓ |
| `defense_lines` | 6 |  | ✓ |
| `delegated_authorities` | 18 |  |  |
| `dogan_guardian_config` | 6 |  | ✓ |
| `dogan_guardian_events` | 7 |  |  |
| `external_user_scopes` | 7 |  |  |
| `field_rbac_permissions` | 17 |  |  |
| `field_rbac_role_mappings` | 7 |  | ✓ |
| `function_authorities` | 9 | Function authorities | ✓ |
| `functional_role_bundle_items` | 5 |  | ✓ |
| `functional_role_bundles` | 7 |  | ✓ |
| `guard_decision_log` | 11 |  |  |
| `iam_access_reviews` | 9 |  |  |
| `iam_connections` | 13 |  |  |
| `iam_sync_history` | 11 |  |  |
| `module_permission_definitions` | 12 |  |  |
| `module_permissions` | 13 |  |  |
| `module_role_definitions` | 17 |  |  |
| `module_role_permission_bindings` | 6 |  |  |
| `module_roles` | 11 |  |  |
| `module_sod_policies` | 8 |  | ✓ |
| `module_sod_rules` | 19 |  |  |
| `object_scopes` | 3 |  |  |
| `permission_analytics` | 18 |  |  |
| `permission_templates` | 15 |  | ✓ |
| `permissions_legacy` | 12 |  |  |
| `platform_role_tenant_role_map` | 6 |  | ✓ |
| `policy_decision_log` | 11 |  | ✓ |
| `product_user_entitlements` | 11 |  | ✓ |
| `rbac_config_audit` | 8 |  |  |
| `role_action_map` | 8 |  |  |
| `role_assignment_audit` | 10 |  |  |
| `role_assignment_history` | 11 |  |  |
| `role_defense_line_mappings` | 3 |  | ✓ |
| `role_function_map` | 10 | Role to function mappings | ✓ |
| `role_function_permissions` | 14 |  | ✓ |
| `role_function_scope_map` | 7 |  | ✓ |
| `role_functions` | 12 | Role function mappings | ✓ |
| `role_learning_states` | 7 |  |  |
| `role_nav_sections` | 8 |  | ✓ |
| `role_permission_inheritance` | 10 |  | ✓ |
| `role_permission_map` | 8 |  | ✓ |
| `role_permissions_legacy` | 8 |  |  |
| `role_profile_assignments` | 12 |  |  |
| `role_profile_mappings` | 8 |  |  |
| `role_sla_defaults` | 8 |  |  |
| `role_team_mapping` | 8 |  | ✓ |
| `role_transition_requests` | 20 |  |  |
| `role_usage_audit` | 15 |  |  |
| `roles` | 17 | System roles | ✓ |
| `route_permission_mappings` | 12 |  |  |
| `sign_off_authority_matrix` | 10 |  | ✓ |
| `tenant_role_definitions` | 16 |  | ✓ |
| `user_availability` | 11 |  |  |
| `user_certifications` | 12 |  |  |
| `user_competencies` | 15 |  |  |
| `user_function_overrides` | 13 | Function permission overrides |  |
| `user_module_permissions` | 9 |  |  |
| `user_notification_preferences` | 10 |  |  |
| `user_performance` | 21 |  |  |
| `user_responsibilities` | 11 |  |  |
| `user_roles` | 15 | User role assignments |  |
| `user_workflow_permissions` | 12 |  |  |
| `workflow_role_access` | 7 |  | ✓ |
| `workflow_step_roles` | 9 |  |  |
| `workload_snapshots` | 11 |  |  |

### `bcp` — 22 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `bcm_audit_log` | 11 |  |  |
| `bcm_dependency_edges` | 9 |  |  |
| `bcm_dependency_maps` | 11 |  |  |
| `bcm_dependency_nodes` | 14 |  |  |
| `bcm_findings` | 24 |  |  |
| `bcm_maturity_assessments` | 21 |  |  |
| `bcm_recovery_strategies` | 24 |  | ✓ |
| `bcp_activations` | 23 |  |  |
| `bcp_bia_templates` | 10 |  |  |
| `bcp_crisis_teams` | 9 |  |  |
| `bcp_exercise_results` | 13 |  |  |
| `bcp_exercise_schedule` | 13 |  |  |
| `bcp_exercises` | 34 |  |  |
| `bcp_recovery_step_tracking` | 17 |  |  |
| `bcp_rto_rpo_defaults` | 9 |  |  |
| `bcp_team_distribution` | 6 |  | ✓ |
| `bia_assessments` | 30 |  |  |
| `bia_process_impacts` | 22 |  |  |
| `crisis_comm_activations` | 13 |  |  |
| `crisis_comm_plans` | 26 |  | ✓ |
| `crisis_events` | 26 |  |  |
| `crisis_notification_tree` | 13 |  |  |

### `compliance` — 94 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `assessment_responses` | 7 |  |  |
| `assessments` | 30 |  |  |
| `ccm_cloud_mappings` | 6 |  |  |
| `ccm_cycle_log` | 7 |  |  |
| `ccm_results` | 7 |  |  |
| `change_tasks` | 16 |  |  |
| `change_triage_decisions` | 7 |  |  |
| `compliance_activity_log` | 8 |  |  |
| `compliance_assertion_evidence` | 7 |  |  |
| `compliance_assertions` | 11 |  |  |
| `compliance_assessments` | 14 |  | ✓ |
| `compliance_commitments` | 10 |  |  |
| `compliance_drift_baselines` | 6 |  |  |
| `compliance_drift_events` | 18 |  |  |
| `compliance_drift_rules` | 19 |  | ✓ |
| `compliance_findings` | 15 |  |  |
| `compliance_frameworks` | 9 |  | ✓ |
| `compliance_gap_snapshots` | 13 |  |  |
| `compliance_gaps` | 23 |  |  |
| `compliance_obligations` | 20 |  |  |
| `compliance_overview_snapshots` | 4 |  |  |
| `compliance_reviews` | 10 |  |  |
| `control_actions` | 11 |  |  |
| `control_categories` | 10 |  |  |
| `control_certification_campaigns` | 10 |  |  |
| `control_certification_requests` | 10 |  |  |
| `control_certification_responses` | 10 |  |  |
| `control_closure_reviews` | 7 |  |  |
| `control_dashboard_cache` | 6 |  |  |
| `control_dependencies` | 8 |  |  |
| `control_domains` | 6 | Control domain groupings | ✓ |
| `control_effectiveness_log` | 8 |  |  |
| `control_effectiveness_scores` | 11 |  |  |
| `control_evidence_requirements` | 11 |  |  |
| `control_failures` | 11 |  |  |
| `control_framework_mappings` | 9 |  |  |
| `control_health_snapshots` | 8 |  |  |
| `control_issues` | 13 |  |  |
| `control_mappings` | 8 |  |  |
| `control_monitoring_alerts` | 11 |  |  |
| `control_monitoring_rules` | 14 |  |  |
| `control_monitoring_signals` | 7 |  |  |
| `control_objectives` | 9 |  |  |
| `control_obligation_mappings` | 8 |  |  |
| `control_operating_tests` | 12 |  |  |
| `control_owners` | 9 |  |  |
| `control_policy_links` | 7 |  |  |
| `control_remediation_actions` | 12 |  |  |
| `control_retests` | 10 |  |  |
| `control_schedules` | 11 |  |  |
| `control_scope_links` | 7 |  |  |
| `control_status_history` | 9 |  |  |
| `control_tags` | 6 |  |  |
| `control_team_distribution` | 7 |  | ✓ |
| `control_test_procedures` | 24 |  |  |
| `control_test_results` | 18 |  |  |
| `control_tests` | 8 |  |  |
| `control_training_mappings` | 10 |  |  |
| `control_workflow_links` | 8 |  |  |
| `cross_border_transfer_rules` | 12 |  | ✓ |
| `crosswalk_mappings` | 6 |  |  |
| `csa_questionnaires` | 14 |  |  |
| `csa_responses` | 17 |  |  |
| `endpoint_config` | 16 |  |  |
| `esg_categories` | 9 |  |  |
| `esg_metrics` | 16 |  |  |
| `framework_applicability_rules` | 11 |  |  |
| `framework_cross_mappings` | 9 |  | ✓ |
| `framework_domains` | 12 |  |  |
| `framework_module_map` | 5 |  | ✓ |
| `framework_requirement_versions` | 11 |  |  |
| `grc_maturity_sync` | 11 |  |  |
| `grc_qiyas_control_feedback` | 11 |  |  |
| `instrument_versions` | 14 |  |  |
| `maturity_assessments` | 22 |  | ✓ |
| `maturity_scores` | 7 |  |  |
| `obligation_applicability_rules` | 9 |  |  |
| `obligation_assignments` | 11 |  |  |
| `obligation_control_links` | 8 |  |  |
| `obligation_due_dates` | 11 |  |  |
| `obligation_evidence_links` | 8 |  |  |
| `obligation_exemptions` | 12 |  |  |
| `obligation_scopes` | 9 |  |  |
| `obligation_status_history` | 9 |  |  |
| `obligation_templates` | 14 |  |  |
| `obligation_types` | 6 |  | ✓ |
| `obligation_versions` | 9 |  |  |
| `procedures` | 22 |  |  |
| `rcsa_campaigns` | 11 |  |  |
| `rcsa_responses` | 14 |  |  |
| `reference_categories` | 13 |  |  |
| `requirements` | 13 |  |  |
| `scoring_policies` | 8 |  | ✓ |
| `ucf_control_versions` | 13 |  |  |

### `connectors` — 1 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `connectors` | 14 |  |  |

### `controls` — 3 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `control_risk_mappings` | 8 |  |  |
| `control_transition_rules` | 8 |  |  |
| `control_transitions` | 8 |  |  |

### `dashboard` — 9 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `control_design_reviews` | 10 |  |  |
| `dashboard_configs_legacy` | 5 |  |  |
| `dashboard_layout_registry` | 14 |  |  |
| `dashboard_overrides` | 16 |  |  |
| `dashboard_registry` | 15 |  | ✓ |
| `dashboard_role_bindings_v2` | 7 |  |  |
| `dashboard_widget_registry` | 16 |  | ✓ |
| `governance_policies` | 26 |  |  |
| `inline_edit_history` | 10 |  |  |

### `dashboard-editor` — 2 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `dashboard_layouts` | 18 |  | ✓ |
| `dashboard_shares` | 12 |  |  |

### `delegation` — 3 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `delegation_chains` | 20 |  |  |
| `delegation_policies` | 24 |  |  |
| `delegation_rules` | 14 |  |  |

### `dora` — 22 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `backup_restore_points` | 11 |  |  |
| `dora_backup_configs` | 20 |  |  |
| `dora_ict_assets` | 21 |  |  |
| `dora_ict_third_party_register` | 20 |  |  |
| `dora_major_incidents` | 27 |  |  |
| `dora_resilience_tests` | 23 |  |  |
| `dora_threat_intel` | 19 |  |  |
| `ict_asset_register` | 19 |  |  |
| `ict_major_incident_reports` | 21 |  |  |
| `regulatory_bodies` | 7 |  | ✓ |
| `regulatory_calendar` | 19 |  |  |
| `regulatory_calendar_task_links` | 5 |  |  |
| `regulatory_change_impacts` | 16 |  |  |
| `regulatory_change_log` | 12 |  |  |
| `regulatory_changes` | 31 |  |  |
| `regulatory_control_mappings` | 10 |  |  |
| `regulatory_frameworks` | 18 | (GRC) |  |
| `regulatory_incident_notifications` | 16 |  |  |
| `regulatory_sla_requirements` | 18 |  | ✓ |
| `resilience_test_plans` | 13 |  |  |
| `resilience_test_results` | 14 |  |  |
| `threat_intelligence_sharing` | 12 |  |  |

### `evidence` — 49 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `artifacts` | 12 |  |  |
| `data_classifications` | 11 | Data classification levels |  |
| `digital_signatures` | 16 |  |  |
| `evidence_activity_log` | 10 |  |  |
| `evidence_admin_settings` | 6 |  | ✓ |
| `evidence_attachments` | 9 |  |  |
| `evidence_attachments_config` | 6 |  |  |
| `evidence_auto_collection` | 38 |  | ✓ |
| `evidence_catalog` | 9 |  |  |
| `evidence_collection_jobs` | 10 |  |  |
| `evidence_collection_log` | 22 |  |  |
| `evidence_collection_rules` | 9 |  |  |
| `evidence_collection_runs` | 9 |  |  |
| `evidence_confidentiality_levels` | 6 |  | ✓ |
| `evidence_cross_validation` | 16 |  |  |
| `evidence_dashboard_cache` | 5 |  |  |
| `evidence_duplicate_candidates` | 10 |  |  |
| `evidence_export_manifests` | 5 |  |  |
| `evidence_exports` | 10 |  |  |
| `evidence_freshness_records` | 10 |  |  |
| `evidence_lifecycle` | 20 | Evidence lifecycle tracking |  |
| `evidence_links` | 8 |  |  |
| `evidence_package_items` | 5 |  |  |
| `evidence_packages` | 12 |  |  |
| `evidence_provenance_records` | 8 |  |  |
| `evidence_quality_assessments` | 11 |  |  |
| `evidence_quality_rules` | 7 |  | ✓ |
| `evidence_rejection_reasons` | 6 |  | ✓ |
| `evidence_request_targets` | 7 |  |  |
| `evidence_requests` | 39 |  |  |
| `evidence_retention_rules` | 26 |  | ✓ |
| `evidence_reuse_links` | 7 |  |  |
| `evidence_reviews` | 10 |  |  |
| `evidence_schedules` | 8 |  |  |
| `evidence_scores` | 8 |  |  |
| `evidence_source_types` | 7 |  | ✓ |
| `evidence_status_log` | 7 |  |  |
| `evidence_submissions` | 9 |  |  |
| `evidence_tags` | 5 |  |  |
| `evidence_tasks` | 20 |  |  |
| `evidence_templates` | 18 |  |  |
| `evidence_type_catalog` | 16 |  |  |
| `evidence_types` | 10 |  | ✓ |
| `evidence_validation_metrics` | 30 |  |  |
| `evidence_validation_rules` | 14 |  |  |
| `evidence_verification_events` | 6 |  |  |
| `evidence_versions` | 11 |  |  |
| `pipeline_webhook_configs` | 13 |  |  |
| `pipeline_webhook_logs` | 16 |  |  |

### `exception` — 5 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `exception_approval_config` | 14 |  |  |
| `exception_gate_audit` | 11 |  |  |
| `exception_gating_rules` | 13 |  | ✓ |
| `exceptions` | 23 |  |  |
| `ucf_controls` | 21 |  |  |

### `foundation` — 46 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `access_profiles` | 8 |  | ✓ |
| `assignment_resolution_log` | 10 |  |  |
| `business_services_catalog` | 23 |  |  |
| `business_units` | 22 |  |  |
| `committees` | 6 |  |  |
| `delegations` | 14 |  |  |
| `departments` | 22 |  |  |
| `effective_user_modules` | 6 |  |  |
| `effective_user_permissions` | 8 |  |  |
| `invitations` | 10 |  |  |
| `locations` | 32 |  |  |
| `member_lifecycle_events` | 9 |  |  |
| `member_profiles` | 12 |  |  |
| `org_cost_center_assignments` | 15 |  |  |
| `org_custom_field_definitions` | 15 |  |  |
| `org_dimension_values` | 12 |  |  |
| `org_dimensions` | 12 |  | ✓ |
| `org_hierarchy_edges` | 10 |  |  |
| `org_hierarchy_nodes` | 13 |  |  |
| `org_location_assignments` | 13 |  |  |
| `org_profile` | 14 |  |  |
| `org_unit_role_assignments` | 14 |  |  |
| `org_validation_executions` | 15 |  |  |
| `org_validation_patterns` | 11 |  |  |
| `org_validation_rules` | 31 |  |  |
| `organizations` | 22 |  |  |
| `positions` | 13 |  |  |
| `product_modules` | 15 |  | ✓ |
| `product_overrides` | 5 |  |  |
| `products` | 11 |  |  |
| `sections` | 13 |  |  |
| `sector_authority_mapping` | 7 |  |  |
| `teams` | 23 |  | ✓ |
| `tenant_ai_config` | 9 |  |  |
| `tenant_archetypes` | 7 |  | ✓ |
| `tenant_blueprints` | 10 |  | ✓ |
| `tenant_config_versions` | 7 |  |  |
| `tenant_domains` | 11 |  |  |
| `tenant_email_config` | 20 |  |  |
| `tenant_module_entitlements` | 8 |  | ✓ |
| `tenant_nav_rules` | 14 |  |  |
| `tenant_page_overrides` | 6 |  |  |
| `tenant_quota_config` | 6 |  |  |
| `tenant_settings` | 11 | (Platform) | ✓ |
| `tenant_settings_history` | 7 |  |  |
| `user_lifecycle_events` | 13 |  |  |

### `governance` — 86 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `approved_pqc_algorithms` | 13 |  | ✓ |
| `authority_matrix` | 18 |  |  |
| `board_attention_items` | 13 |  |  |
| `board_pack_items` | 9 |  |  |
| `board_packs` | 13 |  |  |
| `change_management_records` | 20 |  |  |
| `committee_visibility_thresholds` | 9 |  |  |
| `control_exceptions` | 17 |  |  |
| `escalation_thresholds` | 4 |  |  |
| `ethics_actions` | 13 |  |  |
| `ethics_reports` | 17 |  |  |
| `evidence_actions` | 17 |  |  |
| `evidence_owners` | 10 |  |  |
| `evidence_sector_mapping` | 7 |  | ✓ |
| `governance_ack_campaigns` | 7 |  |  |
| `governance_action_items` | 18 |  |  |
| `governance_action_updates` | 10 |  |  |
| `governance_agenda_items` | 15 |  |  |
| `governance_authority_levels` | 8 |  |  |
| `governance_auto_fire_log` | 9 |  |  |
| `governance_bodies` | 21 |  |  |
| `governance_charters` | 22 |  |  |
| `governance_committee_members` | 14 |  |  |
| `governance_compensating_controls` | 10 |  |  |
| `governance_constitution` | 7 |  |  |
| `governance_decision_votes` | 11 |  |  |
| `governance_decisions` | 14 |  |  |
| `governance_delegations` | 21 |  |  |
| `governance_domains` | 14 |  |  |
| `governance_enforcement_log` | 13 |  |  |
| `governance_escalation_events` | 11 |  |  |
| `governance_executive_summaries` | 20 |  |  |
| `governance_health_scores` | 16 |  |  |
| `governance_health_thresholds` | 6 |  |  |
| `governance_interpreted_issues` | 16 |  | ✓ |
| `governance_mandate_sources` | 6 |  |  |
| `governance_mandates` | 17 |  |  |
| `governance_meeting_attendees` | 11 |  |  |
| `governance_meetings` | 14 |  |  |
| `governance_objectives` | 16 |  |  |
| `governance_obligation_control_links` | 5 |  |  |
| `governance_obligation_due_dates` | 6 |  |  |
| `governance_obligation_evidence_links` | 5 |  |  |
| `governance_obligation_exemptions` | 7 |  |  |
| `governance_obligations` | 15 |  |  |
| `governance_policy_acknowledgements` | 11 |  |  |
| `governance_policy_approvals` | 12 |  |  |
| `governance_policy_reviews` | 13 |  |  |
| `governance_policy_risk_links` | 9 |  |  |
| `governance_policy_versions` | 10 |  |  |
| `governance_procedure_versions` | 10 |  |  |
| `governance_procedures` | 22 |  |  |
| `governance_raci_assignments` | 6 |  |  |
| `governance_raci_templates` | 10 |  |  |
| `governance_recommendations` | 14 |  | ✓ |
| `governance_registers` | 13 |  |  |
| `governance_reporting_lines` | 13 |  |  |
| `governance_responsibilities` | 10 |  |  |
| `governance_responsibility_assignments` | 7 |  |  |
| `governance_risk_appetite` | 5 |  |  |
| `governance_score_explanations` | 11 |  |  |
| `governance_signal_events` | 6 |  |  |
| `governance_signal_rules` | 9 |  |  |
| `governance_signals` | 17 |  | ✓ |
| `grc_plans` | 10 |  |  |
| `initiative_definitions` | 24 |  |  |
| `initiative_runs` | 21 |  |  |
| `legal_entities` | 11 |  |  |
| `mandate_sources` | 10 |  |  |
| `mandates` | 15 |  |  |
| `milestone_instances` | 18 |  |  |
| `obligation_control_mappings` | 8 |  |  |
| `obligation_policy_links` | 9 |  |  |
| `outcome_links` | 10 |  |  |
| `project_assurance_links` | 9 |  |  |
| `project_deliverables` | 32 |  |  |
| `project_exceptions` | 14 |  |  |
| `project_gate_reviews` | 10 |  |  |
| `project_milestones` | 12 |  |  |
| `raci_assignments` | 15 |  |  |
| `raci_templates` | 13 |  |  |
| `resource_allocations` | 13 |  |  |
| `responsibilities` | 13 |  |  |
| `responsibility_assignments` | 13 |  |  |
| `responsibility_suggestions` | 14 |  |  |
| `team_raci_assignments` | 14 |  | ✓ |

### `governance-ai` — 4 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `compliance_score_snapshots` | 14 |  |  |
| `executive_attention_items` | 13 |  |  |
| `governance_ai_feedback` | 8 |  |  |
| `governance_ai_runs` | 8 |  | ✓ |

### `governance-os` — 26 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `enforcement_gate_log` | 13 |  |  |
| `escalation_log` | 20 |  |  |
| `escalation_statuses` | 8 |  |  |
| `exception_risk_acceptance` | 12 |  |  |
| `expert_packs` | 25 |  |  |
| `leadership_digests` | 15 |  |  |
| `module_cross_link_rules` | 14 |  |  |
| `module_table_mappings` | 14 |  |  |
| `module_task_type_mappings` | 9 |  |  |
| `module_trigger_mappings` | 9 |  |  |
| `os_approved_lessons` | 20 |  |  |
| `os_case_memory` | 20 |  |  |
| `os_case_timelines` | 7 |  |  |
| `os_digest_feedback` | 6 |  |  |
| `os_initiative_effectiveness` | 14 |  |  |
| `os_knowledge_articles` | 16 |  |  |
| `os_knowledge_links` | 7 |  |  |
| `os_learning_scores` | 11 |  |  |
| `os_lesson_candidates` | 19 |  |  |
| `os_outcome_memory` | 12 |  |  |
| `os_pattern_signals` | 11 |  |  |
| `os_recommendation_feedback` | 7 |  |  |
| `os_reflection_notes` | 10 |  |  |
| `recommendation_triggers` | 10 |  |  |
| `severity_escalation_thresholds` | 9 |  |  |
| `sop_procedures` | 15 | (GRC) |  |

### `incident` — 29 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `breach_reporting_records` | 24 |  |  |
| `case_incidents` | 6 |  |  |
| `case_notes` | 10 |  |  |
| `cases` | 20 |  |  |
| `incident_assets` | 7 |  |  |
| `incident_audit_log` | 12 |  |  |
| `incident_categories` | 9 | Incident categorization |  |
| `incident_evidence` | 12 |  |  |
| `incident_impacts` | 16 |  |  |
| `incident_lessons_learned` | 15 |  |  |
| `incident_notification_templates` | 10 |  |  |
| `incident_pir` | 28 |  |  |
| `incident_policies` | 6 |  |  |
| `incident_recurring_patterns` | 17 |  |  |
| `incident_regulatory_notifications` | 24 |  |  |
| `incident_reportable_criteria` | 10 |  | ✓ |
| `incident_response_actions` | 14 |  |  |
| `incident_response_teams` | 9 |  |  |
| `incident_risk_links` | 12 |  |  |
| `incident_root_causes` | 11 |  |  |
| `incident_severity_matrix` | 12 |  |  |
| `incident_taxonomy` | 14 |  | ✓ |
| `incident_team_distribution` | 7 |  | ✓ |
| `incident_trend_cache` | 16 |  |  |
| `incident_triage_decisions` | 14 |  |  |
| `incident_updates` | 10 |  |  |
| `incident_vendors` | 7 |  |  |
| `near_miss_reports` | 23 |  |  |
| `pir_sign_offs` | 9 |  |  |

### `integrations` — 38 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `cmdb_assets` | 18 |  |  |
| `cmdb_connections` | 13 |  |  |
| `cmdb_sync_history` | 10 |  |  |
| `connector_automation_rules` | 11 |  | ✓ |
| `connector_configs` | 14 |  |  |
| `connector_dependency_graph` | 9 |  | ✓ |
| `connector_evidence_mappings` | 10 |  | ✓ |
| `connector_executions` | 7 |  |  |
| `connector_registry` | 22 |  | ✓ |
| `connector_status_log` | 7 |  |  |
| `entity_link_metadata` | 5 | Entity link metadata |  |
| `entity_links` | 8 | Entity relationship links |  |
| `erp_connections` | 12 | (Platform) |  |
| `erp_field_mappings` | 9 | (Platform) |  |
| `erp_sync_history` | 10 | (Platform) |  |
| `external_stakeholder_profiles` | 23 |  |  |
| `iam_identities` | 17 |  |  |
| `inbound_webhook_endpoints` | 12 |  |  |
| `inbound_webhook_log` | 7 |  |  |
| `integration_configs` | 13 |  |  |
| `itsm_connections` | 14 |  |  |
| `itsm_sync_history` | 11 |  |  |
| `itsm_tickets` | 20 |  |  |
| `m365_connections` | 15 |  |  |
| `m365_evidence_items` | 17 |  |  |
| `m365_sync_history` | 10 |  |  |
| `openclaw_api_keys` | 17 |  |  |
| `powerbi_reports` | 10 |  |  |
| `siem_connections` | 14 |  |  |
| `siem_events` | 15 |  |  |
| `siem_sync_history` | 10 |  |  |
| `vuln_scan_results` | 19 |  |  |
| `vuln_scan_sync_history` | 11 |  |  |
| `vuln_scanner_connections` | 15 |  |  |
| `webhook_delivery_log` | 6 |  |  |
| `webhook_endpoints` | 13 |  |  |
| `webhook_retry_queue` | 12 |  |  |
| `webhook_subscriptions` | 9 |  |  |

### `knowledge` — 1 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `knowledge_articles` | 14 |  |  |

### `ksa-regulatory` — 6 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `compliance_scores` | 26 |  | ✓ |
| `cross_framework_mappings` | 17 |  |  |
| `obligations` | 21 |  |  |
| `regulatory_change_notifications` | 12 |  |  |
| `report_templates` | 8 |  | ✓ |
| `reports` | 13 |  |  |

### `local-knowledge` — 15 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `local_knowledge_access_log` | 17 |  |  |
| `local_knowledge_cache` | 13 |  |  |
| `local_knowledge_chunks` | 10 |  |  |
| `local_knowledge_custody_chain` | 10 |  |  |
| `local_knowledge_document_acl` | 12 |  |  |
| `local_knowledge_document_versions` | 8 |  |  |
| `local_knowledge_documents` | 26 |  |  |
| `local_knowledge_extractions` | 11 |  |  |
| `local_knowledge_index` | 8 |  |  |
| `local_knowledge_ingestion_log` | 22 |  |  |
| `local_knowledge_legal_hold_audit` | 8 |  |  |
| `local_knowledge_published` | 21 |  |  |
| `local_knowledge_source_sync_history` | 12 |  |  |
| `local_knowledge_sources` | 22 |  |  |
| `local_knowledge_storage_quota` | 10 |  |  |

### `mcp` — 8 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `mcp_agent_overrides` | 11 |  |  |
| `mcp_prompt_overrides` | 12 |  |  |
| `mcp_resource_overrides` | 10 |  |  |
| `mcp_tool_approval_requests` | 20 |  |  |
| `mcp_tool_execution_log` | 36 |  |  |
| `mcp_tool_overrides` | 17 |  |  |
| `mcp_tool_usage_counters` | 12 |  |  |
| `mcp_workflow_tool_bindings` | 28 |  |  |

### `mobile` — 1 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `push_tokens` | 6 |  |  |

### `navigation` — 8 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `navigation_audit_log` | 9 |  |  |
| `navigation_items` | 15 |  | ✓ |
| `navigation_overrides` | 12 |  |  |
| `navigation_registry` | 26 |  | ✓ |
| `navigation_role_bindings` | 5 |  | ✓ |
| `navigation_usage_aggregates` | 10 |  |  |
| `navigation_usage_log` | 8 |  |  |
| `navigation_version_history` | 8 |  |  |

### `notification` — 8 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `alert_instances` | 19 |  |  |
| `alert_rules` | 24 |  |  |
| `email_inbox` | 25 |  |  |
| `email_templates` | 17 |  |  |
| `notification_preferences` | 21 | (Platform) |  |
| `notification_preferences_legacy` | 3 |  |  |
| `notification_queue` | 34 |  | ✓ |
| `notifications_log` | 12 |  |  |

### `onboarding` — 34 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `access_review_campaigns` | 13 |  |  |
| `dashboard_configs` | 18 |  |  |
| `governance_committees` | 6 |  |  |
| `governance_context` | 12 |  |  |
| `journey_certifications` | 10 |  | ✓ |
| `journey_maturity_snapshots` | 9 |  |  |
| `journey_milestones` | 18 |  |  |
| `journey_phases` | 20 |  |  |
| `journey_progress` | 12 |  |  |
| `journey_roadmaps` | 22 |  |  |
| `module_assignments` | 20 |  |  |
| `onboarding_answers` | 8 | (Qiya) |  |
| `onboarding_assessment_drafts` | 15 |  |  |
| `onboarding_consensus` | 9 |  |  |
| `onboarding_questions` | 11 | (Qiya) |  |
| `onboarding_seed_history` | 6 |  |  |
| `onboarding_stages` | 10 | Stage configuration |  |
| `os_playbook_versions` | 11 |  |  |
| `person_profiles` | 15 |  |  |
| `plan_item_instances` | 12 |  |  |
| `qiyas_benchmark_profiles` | 11 |  |  |
| `qiyas_rating_scales` | 10 |  |  |
| `qiyas_scoring_methods` | 9 |  |  |
| `raci_matrices` | 6 |  |  |
| `regulatory_requirements` | 17 |  |  |
| `risk_appetite_config` | 13 |  |  |
| `risk_tolerance_bands` | 11 |  |  |
| `role_profiles` | 11 |  | ✓ |
| `scope_dimensions` | 6 |  |  |
| `sla_config` | 33 |  | ✓ |
| `sod_conflict_matrix` | 13 |  | ✓ |
| `team_escalation_paths` | 6 |  | ✓ |
| `user_role_assignments` | 19 |  |  |
| `workspaces` | 5 |  | ✓ |

### `operating` — 1 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `operating_packs` | 12 |  |  |

### `policy` — 29 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `policy_assessment_history` | 9 |  |  |
| `policy_categories` | 12 |  | ✓ |
| `policy_control_links` | 9 |  |  |
| `policy_control_mappings` | 6 |  |  |
| `policy_dashboard_cache` | 5 |  |  |
| `policy_delivery_records` | 14 |  |  |
| `policy_drift_events` | 9 |  |  |
| `policy_drift_snapshots` | 3 |  |  |
| `policy_exception_approvals` | 8 |  |  |
| `policy_exception_requests` | 22 |  |  |
| `policy_gaps` | 7 |  |  |
| `policy_guidance` | 14 |  |  |
| `policy_issue_links` | 8 |  |  |
| `policy_kpi_values` | 12 |  | ✓ |
| `policy_metrics` | 25 |  |  |
| `policy_mom_records` | 21 |  |  |
| `policy_pack_catalog` | 7 |  | ✓ |
| `policy_pack_rules` | 7 |  | ✓ |
| `policy_process_actions` | 15 |  |  |
| `policy_publication_audiences` | 7 |  |  |
| `policy_publications` | 15 |  |  |
| `policy_risk_links` | 9 |  |  |
| `policy_scores` | 6 |  |  |
| `policy_templates` | 20 |  |  |
| `policy_version_diffs` | 9 |  |  |
| `policy_versions` | 17 |  |  |
| `policy_workflow_tracker` | 10 |  |  |
| `policy_workflows` | 37 |  |  |
| `sod_rules` | 11 |  | ✓ |

### `privacy` — 21 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `data_asset_owners` | 9 |  |  |
| `data_asset_types` | 9 |  |  |
| `data_assets` | 14 |  |  |
| `data_domains` | 10 |  |  |
| `data_processing_register` | 21 |  |  |
| `data_quality_issues` | 12 |  |  |
| `data_quality_rules` | 10 |  |  |
| `data_sharing_approvals` | 10 |  |  |
| `data_sharing_requests` | 12 |  |  |
| `data_stewards` | 9 |  |  |
| `data_subject_requests` | 15 |  |  |
| `dpia_assessments` | 26 |  |  |
| `privacy_breaches` | 20 |  |  |
| `privacy_budget` | 7 |  |  |
| `privacy_control_links` | 8 |  |  |
| `privacy_data_subject_requests` | 11 |  |  |
| `privacy_incidents` | 15 |  |  |
| `privacy_legal_bases` | 10 |  |  |
| `privacy_quarantine_ledger` | 14 |  |  |
| `privacy_retention_policies` | 10 |  |  |
| `privacy_reviews` | 10 |  |  |

### `proactive-leadership` — 7 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `proactive_leadership_config_history` | 8 |  |  |
| `proactive_leadership_cycles` | 8 |  |  |
| `proactive_leadership_insights` | 13 |  |  |
| `proactive_leadership_patterns` | 10 |  |  |
| `proactive_leadership_thresholds` | 12 |  |  |
| `proactive_module_coverage` | 12 |  |  |
| `proactive_signal_rules` | 17 |  |  |

### `provisioning` — 4 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `ninety_day_plans` | 6 |  |  |
| `provisioning_audit` | 9 |  |  |
| `provisioning_jobs` | 17 | (Platform) |  |
| `provisioning_steps` | 8 | (Platform) |  |

### `qiyas` — 72 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `enterprise_priorities` | 13 |  |  |
| `executive_kpis` | 36 |  | ✓ |
| `metric_snapshots` | 12 |  |  |
| `qiyas_assessment_exports` | 11 |  |  |
| `qiyas_assessment_respondents` | 12 |  |  |
| `qiyas_assessment_reviews` | 11 |  |  |
| `qiyas_assessment_scopes` | 7 |  |  |
| `qiyas_assessment_status_history` | 8 |  |  |
| `qiyas_assessments` | 18 |  |  |
| `qiyas_auto_tasks` | 17 |  |  |
| `qiyas_benchmark_cohorts` | 12 |  |  |
| `qiyas_benchmark_comparisons` | 13 |  |  |
| `qiyas_benchmark_datasets` | 19 |  |  |
| `qiyas_benchmark_metrics` | 16 |  |  |
| `qiyas_benchmark_percentiles` | 8 |  |  |
| `qiyas_benchmark_results` | 11 |  |  |
| `qiyas_benchmark_trends` | 13 |  |  |
| `qiyas_calibration_log` | 9 |  |  |
| `qiyas_certification_action_plans` | 18 |  |  |
| `qiyas_certification_evidence_packs` | 18 |  |  |
| `qiyas_certification_gaps` | 14 |  |  |
| `qiyas_certification_milestones` | 14 |  |  |
| `qiyas_certification_readiness` | 16 |  |  |
| `qiyas_certification_simulations` | 12 |  |  |
| `qiyas_consensus_reviews` | 11 |  |  |
| `qiyas_dimension_scores` | 11 |  |  |
| `qiyas_dimensions` | 10 |  |  |
| `qiyas_domains` | 11 |  |  |
| `qiyas_evidence_chain_validations` | 11 |  |  |
| `qiyas_evidence_coverage_analysis` | 10 |  |  |
| `qiyas_evidence_quality_metrics` | 14 |  |  |
| `qiyas_evidence_rules` | 9 |  |  |
| `qiyas_evidence_scores` | 13 |  |  |
| `qiyas_evidence_scoring_criteria` | 12 |  |  |
| `qiyas_evidence_scoring_models` | 12 |  |  |
| `qiyas_evidence_sufficiency_rules` | 11 |  |  |
| `qiyas_gap_scores` | 10 |  |  |
| `qiyas_grc_automation_rules` | 10 |  | ✓ |
| `qiyas_grc_trigger_log` | 14 |  |  |
| `qiyas_improvement_paths` | 13 |  |  |
| `qiyas_indicator_scores` | 10 |  |  |
| `qiyas_indicators` | 13 |  |  |
| `qiyas_maturity_assessments` | 15 |  |  |
| `qiyas_maturity_dimension_results` | 10 |  |  |
| `qiyas_maturity_level_criteria` | 9 |  |  |
| `qiyas_maturity_levels` | 9 |  |  |
| `qiyas_maturity_models` | 12 |  |  |
| `qiyas_maturity_progression_history` | 10 |  |  |
| `qiyas_maturity_roadmaps` | 14 |  |  |
| `qiyas_maturity_scores` | 10 |  |  |
| `qiyas_maturity_target_profiles` | 13 |  |  |
| `qiyas_model_versions` | 10 |  |  |
| `qiyas_models` | 13 |  |  |
| `qiyas_question_mappings` | 6 |  |  |
| `qiyas_question_options` | 9 |  |  |
| `qiyas_question_weights` | 7 |  |  |
| `qiyas_questions` | 14 |  |  |
| `qiyas_recommendation_mappings` | 6 |  |  |
| `qiyas_recommendations` | 21 |  |  |
| `qiyas_response_attachments` | 10 |  |  |
| `qiyas_response_history` | 10 |  |  |
| `qiyas_responses` | 12 |  |  |
| `qiyas_score_explanations` | 10 |  |  |
| `qiyas_score_snapshots` | 11 |  |  |
| `qiyas_scores` | 12 |  |  |
| `qiyas_sections` | 12 |  |  |
| `qiyas_template_versions` | 9 |  |  |
| `qiyas_templates` | 13 |  |  |
| `risk_appetite_statements` | 16 |  |  |
| `roadmap_items` | 24 |  |  |
| `strategic_objectives` | 20 |  |  |
| `strategic_themes` | 12 |  |  |

### `quality-gate` — 7 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `qgate_ai_eval_scores` | 13 |  |  |
| `qgate_mutation_reports` | 12 |  |  |
| `qgate_runs` | 18 |  |  |
| `qgate_schema_drift_log` | 14 |  |  |
| `qgate_stage_results` | 12 |  |  |
| `qgate_thresholds` | 8 |  |  |
| `qgate_vrt_snapshots` | 10 |  |  |

### `records` — 5 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `data_retention_policies` | 11 |  |  |
| `document_reviews` | 7 |  |  |
| `document_versions` | 9 |  |  |
| `documents` | 20 |  |  |
| `retention_rules` | 9 |  |  |

### `remediation` — 4 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `remediation_plan_templates` | 11 |  |  |
| `remediation_plans` | 12 |  | ✓ |
| `remediation_sla_config` | 11 |  |  |
| `remediation_tracking` | 19 |  |  |

### `reporting` — 5 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `report_schedule_config` | 10 |  |  |
| `report_schedules` | 9 |  |  |
| `report_shares` | 6 | (GRC) |  |
| `saved_views` | 12 |  |  |
| `widget_registry` | 16 |  | ✓ |

### `risk` — 49 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `kri_breach_log` | 13 |  |  |
| `kri_data_points` | 9 |  |  |
| `kri_tracking` | 15 |  |  |
| `kri_values` | 8 |  |  |
| `mitigating_control_mappings` | 7 |  |  |
| `model_inventory` | 19 |  |  |
| `model_risk_scores` | 11 |  |  |
| `model_validations` | 10 |  |  |
| `object_mappings` | 6 |  |  |
| `preventive_control_mappings` | 7 |  |  |
| `risk_acceptance_log` | 14 |  |  |
| `risk_assessment_items` | 9 |  |  |
| `risk_assessment_responses` | 11 |  |  |
| `risk_assessment_reviews` | 7 |  |  |
| `risk_assessments` | 16 |  |  |
| `risk_asset_links` | 7 |  |  |
| `risk_campaigns` | 11 |  |  |
| `risk_categories` | 10 |  | ✓ |
| `risk_compliance_links` | 7 |  |  |
| `risk_consequences` | 11 |  |  |
| `risk_dashboard_cache` | 4 |  |  |
| `risk_dependencies` | 8 |  |  |
| `risk_escalation_log` | 9 |  |  |
| `risk_evidence_links` | 7 |  |  |
| `risk_fair_assessments` | 26 |  |  |
| `risk_impact_scales` | 11 |  |  |
| `risk_indicator_templates` | 13 |  |  |
| `risk_kris` | 22 |  |  |
| `risk_likelihood_scales` | 10 |  |  |
| `risk_owners` | 9 |  |  |
| `risk_policy_links` | 7 |  |  |
| `risk_review_log` | 9 |  |  |
| `risk_scenario_reviews` | 8 |  |  |
| `risk_scenarios` | 16 |  |  |
| `risk_score_history` | 7 |  |  |
| `risk_scoring_models` | 11 |  | ✓ |
| `risk_sector_applicability` | 8 |  |  |
| `risk_status_history` | 11 |  |  |
| `risk_taxonomy` | 9 |  |  |
| `risk_team_distribution` | 7 |  | ✓ |
| `risk_threats` | 10 |  |  |
| `risk_treatment_actions` | 12 |  |  |
| `risk_treatment_reviews` | 7 |  |  |
| `risk_treatments` | 24 |  |  |
| `risk_velocity_scales` | 10 |  |  |
| `risk_vendor_links` | 7 |  |  |
| `risks` | 54 |  |  |
| `vulnerabilities` | 21 |  |  |
| `vulnerability_findings_map` | 8 |  |  |

### `security` — 3 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `security_compliance_attestations` | 13 |  |  |
| `security_events` | 15 |  |  |
| `security_posture_snapshots` | 10 |  |  |

### `sod` — 2 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `sod_conflict_log` | 16 |  |  |
| `sod_conflict_resolution_history` | 13 |  |  |

### `team` — 5 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `team_collaboration_matrix` | 26 |  | ✓ |
| `team_function_mappings` | 6 |  | ✓ |
| `team_handoffs` | 28 |  |  |
| `team_members` | 13 |  |  |
| `team_operation_modes` | 8 |  |  |

### `training` — 19 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `phishing_campaigns` | 33 |  |  |
| `phishing_user_results` | 13 |  |  |
| `sector_training_paths` | 8 |  | ✓ |
| `training_assignments` | 27 |  |  |
| `training_audit_log` | 11 |  |  |
| `training_campaigns` | 36 |  |  |
| `training_catalog` | 20 |  |  |
| `training_certificates` | 8 |  |  |
| `training_certification_audit` | 7 |  |  |
| `training_certification_requirements` | 10 |  | ✓ |
| `training_certifications` | 17 |  |  |
| `training_completion_snapshots` | 20 |  |  |
| `training_completions` | 10 |  |  |
| `training_content` | 31 |  | ✓ |
| `training_enrollments` | 13 |  |  |
| `training_programs` | 10 |  |  |
| `training_team_distribution` | 6 |  | ✓ |
| `training_user_progress` | 14 |  |  |
| `vendors` | 40 |  | ✓ |

### `vendor` — 38 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `contract_control_links` | 8 |  |  |
| `contracts` | 14 |  |  |
| `vendor_admin_config` | 8 |  | ✓ |
| `vendor_assessments` | 12 |  |  |
| `vendor_audit_log` | 11 |  |  |
| `vendor_bcp_requirements` | 11 |  |  |
| `vendor_benchmark_cohorts` | 11 |  |  |
| `vendor_concentration_analysis` | 18 |  |  |
| `vendor_contacts` | 10 |  |  |
| `vendor_crypto_assessment` | 13 |  |  |
| `vendor_dd_steps` | 16 |  |  |
| `vendor_documents` | 21 |  |  |
| `vendor_due_diligence` | 22 |  |  |
| `vendor_due_diligence_checklists` | 8 |  |  |
| `vendor_engagement_milestones` | 10 |  |  |
| `vendor_engagements` | 19 |  |  |
| `vendor_exceptions` | 19 |  |  |
| `vendor_findings` | 19 |  |  |
| `vendor_fourth_party_risk` | 20 |  |  |
| `vendor_issues` | 20 |  |  |
| `vendor_monitoring_signals` | 20 |  |  |
| `vendor_obligations` | 12 |  |  |
| `vendor_offboarding` | 22 |  |  |
| `vendor_offboarding_checklist` | 15 |  |  |
| `vendor_portal_messages` | 13 |  |  |
| `vendor_portal_tokens` | 8 |  |  |
| `vendor_questionnaire_submissions` | 11 |  |  |
| `vendor_questionnaire_templates` | 12 |  |  |
| `vendor_risk_assessments` | 20 |  |  |
| `vendor_risks` | 12 |  |  |
| `vendor_shared_responsibility` | 17 |  |  |
| `vendor_sla_breach_log` | 19 |  |  |
| `vendor_sla_definitions` | 18 |  |  |
| `vendor_sla_measurements` | 16 |  |  |
| `vendor_subcontractors` | 17 |  |  |
| `vendor_team_distribution` | 6 |  | ✓ |
| `vendor_tier_config` | 4 |  | ✓ |
| `vendor_training_requirements` | 10 |  |  |

### `webhooks` — 1 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `webhooks` | 7 |  |  |

### `widgets` — 3 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `widgets_bundles` | 14 |  | ✓ |
| `widgets_registry` | 20 |  | ✓ |
| `widgets_render_log` | 7 |  |  |

### `workflow` — 83 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `agrc_runbooks` | 13 | AGRC runbooks |  |
| `ai_step_executions` | 15 |  |  |
| `ai_step_feedback` | 8 |  |  |
| `approval_history` | 20 |  |  |
| `approval_packs` | 13 |  |  |
| `approval_requests` | 22 |  |  |
| `approvals` | 10 |  |  |
| `approver_resolution_cache` | 8 |  |  |
| `auto_approval_config` | 9 |  | ✓ |
| `automation_rules_legacy` | 14 |  |  |
| `autonomous_workflow_config` | 8 | (Platform) |  |
| `cadence_tasks` | 11 |  |  |
| `cep_event_windows` | 9 |  |  |
| `cep_pattern_definitions` | 17 |  | ✓ |
| `default_automation_templates` | 9 |  | ✓ |
| `event_consumer_cursors` | 5 |  |  |
| `event_entity_sequences` | 4 |  |  |
| `event_idempotency_log` | 3 |  | ✓ |
| `event_type_registry` | 12 |  |  |
| `inbound_handler_registry` | 10 |  | ✓ |
| `process_audit_trail` | 12 |  |  |
| `process_metrics` | 31 |  |  |
| `process_tasks` | 34 |  |  |
| `process_templates` | 9 |  |  |
| `processes` | 10 |  |  |
| `sla_auto_setup_log` | 25 |  |  |
| `sla_breaches` | 14 |  |  |
| `sla_definitions` | 16 |  |  |
| `sla_predictions` | 16 |  |  |
| `sla_priority_config` | 6 |  | ✓ |
| `task_auto_resolution_rules` | 11 |  | ✓ |
| `task_routing_rules` | 19 |  | ✓ |
| `wf_approval_decisions` | 13 |  |  |
| `workflow_acl` | 7 |  |  |
| `workflow_agent_tool_policy` | 9 |  |  |
| `workflow_ai_agents` | 10 |  | ✓ |
| `workflow_ai_budget` | 13 |  |  |
| `workflow_ai_notes` | 17 |  |  |
| `workflow_ai_policy` | 11 |  |  |
| `workflow_attachments` | 13 |  |  |
| `workflow_auto_initiation` | 22 |  |  |
| `workflow_categories` | 11 |  | ✓ |
| `workflow_chain_definitions` | 8 |  | ✓ |
| `workflow_chain_instances` | 11 |  |  |
| `workflow_chain_step_log` | 11 |  |  |
| `workflow_comments` | 16 |  |  |
| `workflow_conditions` | 10 |  |  |
| `workflow_decision_log` | 15 |  |  |
| `workflow_draft_actions` | 18 |  |  |
| `workflow_escalation_policies` | 13 |  |  |
| `workflow_events` | 12 |  |  |
| `workflow_executions` | 17 |  |  |
| `workflow_executions_archive` | 14 |  |  |
| `workflow_forbidden_boundaries` | 9 |  | ✓ |
| `workflow_graph_versions` | 9 |  |  |
| `workflow_instance_steps` | 15 |  |  |
| `workflow_instances` | 23 |  |  |
| `workflow_intervention_log` | 10 |  |  |
| `workflow_kill_switch` | 10 |  |  |
| `workflow_lookup_options` | 13 |  | ✓ |
| `workflow_mandatory_review` | 8 |  | ✓ |
| `workflow_mandatory_review_points` | 9 |  | ✓ |
| `workflow_profile_catalog` | 11 |  | ✓ |
| `workflow_profile_states` | 12 |  | ✓ |
| `workflow_raci_config` | 6 |  | ✓ |
| `workflow_recommendation_catalog` | 11 |  | ✓ |
| `workflow_retention_policies` | 8 |  |  |
| `workflow_rollback_log` | 13 |  |  |
| `workflow_rules` | 14 |  |  |
| `workflow_schedules` | 13 |  |  |
| `workflow_state_history` | 15 |  |  |
| `workflow_step_autonomy` | 10 |  | ✓ |
| `workflow_steps` | 32 |  |  |
| `workflow_subscribers` | 8 |  |  |
| `workflow_task_assignments` | 13 |  |  |
| `workflow_tasks` | 16 |  |  |
| `workflow_templates` | 13 |  |  |
| `workflow_timeline_entries` | 15 | Workflow timeline tracking |  |
| `workflow_transitions` | 13 |  |  |
| `workflow_triggers` | 23 |  | ✓ |
| `workflow_versions` | 14 |  |  |
| `workflow_webhooks` | 13 |  |  |
| `workflows` | 17 |  | ✓ |

### `workspace` — 8 tables

| Table | Cols | Function / purpose | Has data |
|---|---:|---|:-:|
| `workspace_feature_overrides` | 3 |  |  |
| `workspace_profile` | 14 |  |  |
| `workspace_profiles` | 7 |  |  |
| `workspace_provisioning_runs` | 8 |  |  |
| `workspace_provisioning_steps` | 11 |  |  |
| `workspace_seeds` | 13 |  |  |
| `workspace_state_history` | 6 |  |  |
| `workspace_states` | 5 |  |  |

