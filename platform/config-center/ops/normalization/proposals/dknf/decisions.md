# DKNF Fix — Decision Matrix
Generated: 2026-04-20T22:40:11.554Z
Total DKNF-violating columns: **221** across 165 tables.

| Table | Layer | Column | Proposed ENUM | Values | Decision |
|---|---|---|---|---|---|
| action_ai_suggestions | tenant | status | action_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| action_register | tenant | status | action_register_status_enum | `open`, `in_progress`, `completed`, `overdue`, `cancelled` |  |
| agent_sod_policies | tenant | approver_type | agent_sod_policies_approver_type_enum | `human`, `agent`, `service_account`, `external` |  |
| agent_sod_policies | tenant | outcome | agent_sod_policies_outcome_enum | `allow`, `warn`, `escalate`, `block` |  |
| agent_sod_policies | tenant | proposer_type | agent_sod_policies_proposer_type_enum | `human`, `agent`, `service_account`, `external` |  |
| agent_tool_permissions | tenant | level | agent_tool_permissions_level_enum | `allow`, `deny`, `approval_required` |  |
| ai_activity_alerts | tenant | severity | ai_activity_alerts_severity_enum | `info`, `warning`, `critical` |  |
| ai_governance_policies | tenant | enforcement_mode | ai_governance_policies_enforcement_mode_enum | `advisory`, `blocking`, `logging` |  |
| ai_governance_policies | tenant | status | ai_governance_policies_status_enum | `draft`, `active`, `deprecated` |  |
| ai_model_lifecycle | tenant | approval_status | ai_model_lifecycle_approval_status_enum | `pending`, `approved`, `rejected`, `not_required` |  |
| ai_model_lifecycle | tenant | current_state | ai_model_lifecycle_current_state_enum | `development`, `validation`, `staging`, `production`, `deprecated`, `archived` |  |
| ai_model_risk_assessments | tenant | assessment_type | ai_model_risk_assessments_assessment_type_enum | `automated`, `manual`, `hybrid`, `external_audit` |  |
| ai_model_risk_assessments | tenant | risk_level | ai_model_risk_assessments_risk_level_enum | `low`, `medium`, `high`, `critical` |  |
| ai_risk_assessments | tenant | risk_level | ai_risk_assessments_risk_level_enum | `minimal`, `low`, `moderate`, `high`, `critical` |  |
| ai_risk_assessments | tenant | status | ai_risk_assessments_status_enum | `draft`, `completed`, `approved` |  |
| ai_system_registry | tenant | risk_level | ai_system_registry_risk_level_enum | `low`, `medium`, `high`, `critical` |  |
| ai_system_registry | tenant | status | ai_system_registry_status_enum | `active`, `inactive`, `deprecated`, `archived` |  |
| alert_definitions | public | alert_class | alert_definitions_alert_class_enum | `page`, `warn`, `info` |  |
| alert_definitions | public | comparison_operator | alert_definitions_comparison_operator_enum | `lt`, `lte`, `gt`, `gte` |  |
| alert_definitions | public | severity | alert_definitions_severity_enum | `critical`, `high`, `medium`, `low`, `info` |  |
| analytics_ai_suggestions | tenant | status | analytics_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| approval_requests | public | status | approval_requests_status_enum | `pending`, `approved`, `rejected`, `escalated` |  |
| approval_steps_log | public | action | approval_steps_log_action_enum | `submitted`, `approved`, `rejected`, `delegated`, `escalated` |  |
| as_built_ledger | public | category | as_built_ledger_category_enum | `service`, `migration`, `config`, `contract`, `schema`, `integration`, `deployment`, `other` |  |
| as_built_ledger | public | owner_layer | as_built_ledger_owner_layer_enum | `DOS`, `DAuth`, `Product`, `Module`, `AI` |  |
| asset_ai_suggestions | tenant | status | asset_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| attestation_ai_suggestions | tenant | status | attestation_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| attestation_campaigns | tenant | status | attestation_campaigns_status_enum | `draft`, `active`, `closed`, `archived` |  |
| attestation_drafts | tenant | entity_type | attestation_drafts_entity_type_enum | `framework`, `control` |  |
| attestation_drafts | tenant | status | attestation_drafts_status_enum | `draft`, `pending_review`, `approved`, `rejected` |  |
| attestation_records | tenant | status | attestation_records_status_enum | `pending`, `attested`, `declined`, `expired` |  |
| attestation_responses | tenant | decision | attestation_responses_decision_enum | `confirmed`, `exception`, `delegated` |  |
| attestation_responses | tenant | status | attestation_responses_status_enum | `pending`, `submitted`, `overdue`, `escalated` |  |
| audit_ai_suggestions | tenant | status | audit_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| audit_capa | tenant | capa_type | audit_capa_capa_type_enum | `corrective`, `preventive` |  |
| authorization_audit_log | public | decision | authorization_audit_log_decision_enum | `allow`, `deny` |  |
| bcp_ai_suggestions | tenant | status | bcp_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| bcp_crisis_teams | tenant | team_type | bcp_crisis_teams_team_type_enum | `crisis_management`, `emergency_response`, `business_recovery`, `communications`, `it_recovery` |  |
| bcp_exercise_schedule | tenant | exercise_type | bcp_exercise_schedule_exercise_type_enum | `tabletop`, `walkthrough`, `simulation`, `full_test`, `notification_drill` |  |
| bcp_exercise_schedule | tenant | status | bcp_exercise_schedule_status_enum | `scheduled`, `in_progress`, `completed`, `cancelled`, `postponed` |  |
| benchmarks_ai_suggestions | tenant | status | benchmarks_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| blockers | public | severity | blockers_severity_enum | `info`, `low`, `medium`, `high`, `critical` |  |
| board_decisions | tenant | status | board_decisions_status_enum | `draft`, `under_review`, `approved`, `rejected`, `deferred` |  |
| compliance_ai_suggestions | tenant | status | compliance_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| conditional_access_policies | public | action | conditional_access_policies_action_enum | `allow`, `deny`, `require_mfa` |  |
| control_deficiencies | tenant | severity | control_deficiencies_severity_enum | `low`, `medium`, `high`, `critical` |  |
| control_deficiencies | tenant | status | control_deficiencies_status_enum | `identified`, `remediation_in_progress`, `validated`, `closed` |  |
| control_effectiveness_assessments | tenant | assessment_type | control_effectiveness_assessments_assessment_type_enum | `design`, `operating` |  |
| control_effectiveness_assessments | tenant | rating | control_effectiveness_assessments_rating_enum | `effective`, `partially_effective`, `ineffective`, `not_assessed` |  |
| control_test_schedules | tenant | frequency | control_test_schedules_frequency_enum | `daily`, `weekly`, `monthly`, `quarterly`, `annually` |  |
| control_test_schedules | tenant | last_result | control_test_schedules_last_result_enum | `pass`, `fail`, `error` |  |
| control_tests | tenant | result | control_tests_result_enum | `pass`, `fail`, `exception` |  |
| control_tests | tenant | status | control_tests_status_enum | `planned`, `in_progress`, `completed`, `failed` |  |
| controls_ai_suggestions | tenant | status | controls_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| controls_deficiencies | tenant | deficiency_type | controls_deficiencies_deficiency_type_enum | `design`, `operating`, `both` |  |
| crosswalk_mappings | tenant | relationship | crosswalk_mappings_relationship_enum | `equivalent`, `partial`, `related`, `derived_from` |  |
| csa_campaigns | tenant | status | csa_campaigns_status_enum | `draft`, `active`, `closed`, `archived` |  |
| csa_responses | tenant | effectiveness_rating | csa_responses_effectiveness_rating_enum | `effective`, `partially_effective`, `ineffective`, `not_assessed` |  |
| dashboard_ai_suggestions | tenant | status | dashboard_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| dashboard_editor_ai_suggestions | tenant | status | dashboard_editor_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| dora_ai_suggestions | tenant | status | dora_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| dora_resilience_tests | tenant | test_type | dora_resilience_tests_test_type_enum | `vulnerability`, `penetration`, `scenario`, `tabletop`, `red_team` |  |
| enforcement_check_results | public | status | enforcement_check_results_status_enum | `PASS`, `CONDITIONAL_PASS`, `FAIL` |  |
| enforcement_runs | public | verdict | enforcement_runs_verdict_enum | `PASS`, `CONDITIONAL_PASS`, `FAIL` |  |
| event_dead_letter_queue | public | status | event_dead_letter_queue_status_enum | `failed`, `retrying`, `resolved`, `expired` |  |
| evidence_ai_suggestions | tenant | status | evidence_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| exception_ai_suggestions | tenant | status | exception_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| exception_requests | tenant | status | exception_requests_status_enum | `pending`, `under_review`, `approved`, `rejected`, `expired`, `revoked` |  |
| executive_ai_suggestions | tenant | status | executive_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| executive_briefings | tenant | status | executive_briefings_status_enum | `draft`, `approved`, `distributed` |  |
| executive_kri_alerts | tenant | alert_level | executive_kri_alerts_alert_level_enum | `green`, `amber`, `red` |  |
| feedback | public | feedback_type | feedback_feedback_type_enum | `nps`, `csat`, `ces` |  |
| fitch_ai_suggestions | tenant | status | fitch_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| fitch_mappings | tenant | risk_level | fitch_mappings_risk_level_enum | `minimal`, `low`, `moderate`, `high`, `critical` |  |
| fitch_ratings | tenant | outlook | fitch_ratings_outlook_enum | `stable`, `positive`, `negative`, `watch` |  |
| governance_ai_ai_suggestions | tenant | status | governance_ai_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| governance_ai_suggestions | tenant | status | governance_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| governance_os_ai_suggestions | tenant | status | governance_os_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| grc_query_ai_suggestions | tenant | status | grc_query_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| inbox_ai_suggestions | tenant | status | inbox_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| inbox_extended_items | tenant | status | inbox_extended_items_status_enum | `unread`, `read`, `actioned`, `archived` |  |
| incident_ai_suggestions | tenant | status | incident_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| incident_capas | tenant | action_type | incident_capas_action_type_enum | `corrective`, `preventive` |  |
| incident_capas | tenant | status | incident_capas_status_enum | `open`, `in_progress`, `completed`, `verified` |  |
| incident_notifications_log | tenant | channel | incident_notifications_log_channel_enum | `email`, `in_app`, `sms` |  |
| incident_notifications_log | tenant | notification_type | incident_notifications_log_notification_type_enum | `escalation`, `sla_warning`, `sla_breach`, `assignment`, `status_change`, `regulatory_deadline`, `triage`, `breach_submitted` |  |
| incident_pir | tenant | effectiveness_status | incident_pir_effectiveness_status_enum | `pending`, `effective`, `partially_effective`, `ineffective`, `not_reviewed` |  |
| incident_pir | tenant | pir_type | incident_pir_pir_type_enum | `standard`, `major`, `regulatory`, `executive` |  |
| incident_pir | tenant | status | incident_pir_status_enum | `draft`, `in_progress`, `review`, `sign_off`, `completed`, `archived` |  |
| incident_regulatory_notifications | tenant | notification_type | incident_regulatory_notifications_notification_type_enum | `initial`, `update`, `final`, `withdrawal` |  |
| incident_regulatory_notifications | tenant | status | incident_regulatory_notifications_status_enum | `pending`, `drafted`, `submitted`, `acknowledged`, `follow_up_required`, `closed` |  |
| incident_response_teams | tenant | team_type | incident_response_teams_team_type_enum | `primary`, `escalation`, `executive`, `external` |  |
| incident_risk_links | tenant | impact_on_risk | incident_risk_links_impact_on_risk_enum | `increase`, `decrease`, `neutral`, `reassess` |  |
| incident_risk_links | tenant | link_type | incident_risk_links_link_type_enum | `materialized`, `contributing`, `affected`, `mitigated_by` |  |
| incident_taxonomy | tenant | node_type | incident_taxonomy_node_type_enum | `root`, `category`, `subcategory`, `type` |  |
| incident_taxonomy | tenant | severity_hint | incident_taxonomy_severity_hint_enum | `low`, `medium`, `high`, `critical` |  |
| incident_trend_cache | tenant | granularity | incident_trend_cache_granularity_enum | `day`, `week`, `month`, `quarter`, `year` |  |
| incident_trend_cache | tenant | trend_direction | incident_trend_cache_trend_direction_enum | `up`, `down`, `flat` |  |
| integrations_ai_suggestions | tenant | status | integrations_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| integrations_sync_log | tenant | direction | integrations_sync_log_direction_enum | `inbound`, `outbound`, `bidirectional` |  |
| issues_ai_suggestions | tenant | status | issues_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| issues_register | tenant | status | issues_register_status_enum | `open`, `in_progress`, `resolved`, `closed`, `deferred` |  |
| journey_ai_suggestions | tenant | status | journey_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| ksa_regulatory_ai_suggestions | tenant | status | ksa_regulatory_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| local_knowledge_ai_suggestions | tenant | status | local_knowledge_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| lookup_cbb_categories | public | category_type | lookup_cbb_categories_category_type_enum | `conventional`, `islamic` |  |
| lookup_cbuae_categories | public | entity_type | lookup_cbuae_categories_entity_type_enum | `bank`, `insurance`, `broker`, `exchange`, `payment` |  |
| lookup_cloud_providers | public | provider_type | lookup_cloud_providers_provider_type_enum | `public`, `private`, `hybrid`, `sovereign` |  |
| lookup_dfsa_licenses | public | license_category | lookup_dfsa_licenses_license_category_enum | `category1`, `category2`, `category3`, `category4`, `category5` |  |
| lookup_identity_providers | public | provider_type | lookup_identity_providers_provider_type_enum | `saml`, `oidc`, `ldap`, `proprietary` |  |
| lookup_nca_sectors | public | criticality_level | lookup_nca_sectors_criticality_level_enum | `critical`, `important`, `standard` |  |
| lookup_ncec_sectors | public | criticality | lookup_ncec_sectors_criticality_enum | `critical`, `important`, `standard` |  |
| lookup_risk_frameworks | public | framework_type | lookup_risk_frameworks_framework_type_enum | `enterprise`, `it`, `operational`, `financial` |  |
| lookup_siem_providers | public | deployment_type | lookup_siem_providers_deployment_type_enum | `cloud`, `on-prem`, `hybrid` |  |
| lookup_tra_licenses | public | service_type | lookup_tra_licenses_service_type_enum | `mobile`, `fixed`, `internet`, `data_center` |  |
| lookup_uae_free_zones | public | emirate | lookup_uae_free_zones_emirate_enum | `dubai`, `abu_dhabi`, `sharjah`, `ajman`, `ras_al_khaimah`, `fujairah`, `umm_al_quwain` |  |
| mcp_agent_registry | public | status | mcp_agent_registry_status_enum | `draft`, `active`, `deprecated`, `retired` |  |
| mcp_agent_registry | public | visibility_scope | mcp_agent_registry_visibility_scope_enum | `all`, `internal`, `admin_only`, `beta` |  |
| mcp_audit_log | tenant | actor_type | mcp_audit_log_actor_type_enum | `human`, `agent`, `service_account`, `external` |  |
| mcp_prompt_registry | public | output_mode | mcp_prompt_registry_output_mode_enum | `text`, `json`, `structured`, `stream` |  |
| mcp_prompt_registry | public | status | mcp_prompt_registry_status_enum | `draft`, `active`, `deprecated`, `retired` |  |
| mcp_prompt_registry | public | visibility_scope | mcp_prompt_registry_visibility_scope_enum | `all`, `internal`, `admin_only`, `beta` |  |
| mcp_resource_registry | public | data_classification | mcp_resource_registry_data_classification_enum | `public`, `internal`, `confidential`, `restricted` |  |
| mcp_resource_registry | public | sensitivity_level | mcp_resource_registry_sensitivity_level_enum | `normal`, `elevated`, `high`, `critical` |  |
| mcp_resource_registry | public | status | mcp_resource_registry_status_enum | `draft`, `active`, `deprecated`, `retired` |  |
| mcp_resource_registry | public | visibility_scope | mcp_resource_registry_visibility_scope_enum | `all`, `internal`, `admin_only`, `beta` |  |
| mcp_servers | tenant | status | mcp_servers_status_enum | `registered`, `active`, `inactive`, `error` |  |
| mcp_servers | tenant | transport | mcp_servers_transport_enum | `stdio`, `http`, `sse`, `streamable-http` |  |
| mcp_sessions | tenant | actor_type | mcp_sessions_actor_type_enum | `human`, `agent`, `service_account`, `external` |  |
| mcp_sessions | tenant | status | mcp_sessions_status_enum | `open`, `closed`, `errored` |  |
| mcp_tool_registry | public | approval_mode | mcp_tool_registry_approval_mode_enum | `none`, `single`, `multi_step`, `risk_based`, `manual_gate` |  |
| mcp_tool_registry | public | data_classification | mcp_tool_registry_data_classification_enum | `public`, `internal`, `confidential`, `restricted` |  |
| mcp_tool_registry | public | default_autonomy | mcp_tool_registry_default_autonomy_enum | `L0`, `L1`, `L2`, `L3` |  |
| mcp_tool_registry | public | execution_type | mcp_tool_registry_execution_type_enum | `\n      'internal_service`, `workflow_action`, `connector_action`, `\n      'http_proxy`, `job_dispatch`, `approval_only'\n` |  |
| mcp_tool_registry | public | max_autonomy | mcp_tool_registry_max_autonomy_enum | `L0`, `L1`, `L2`, `L3` |  |
| mcp_tool_registry | public | min_autonomy | mcp_tool_registry_min_autonomy_enum | `L0`, `L1`, `L2`, `L3` |  |
| mcp_tool_registry | public | risk_level | mcp_tool_registry_risk_level_enum | `critical`, `high`, `medium`, `low` |  |
| mcp_tool_registry | public | sensitivity_level | mcp_tool_registry_sensitivity_level_enum | `normal`, `elevated`, `high`, `critical` |  |
| mcp_tool_registry | public | status | mcp_tool_registry_status_enum | `draft`, `active`, `deprecated`, `retired` |  |
| mcp_tool_registry | public | visibility_scope | mcp_tool_registry_visibility_scope_enum | `all`, `internal`, `admin_only`, `beta` |  |
| mobile_ai_suggestions | tenant | status | mobile_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| mobile_device_registrations | tenant | platform | mobile_device_registrations_platform_enum | `ios`, `android`, `web` |  |
| mobile_offline_sync_queue | tenant | action | mobile_offline_sync_queue_action_enum | `create`, `update`, `delete` |  |
| mobile_offline_sync_queue | tenant | sync_status | mobile_offline_sync_queue_sync_status_enum | `pending`, `syncing`, `synced`, `conflict`, `failed` |  |
| mobile_push_notifications | tenant | status | mobile_push_notifications_status_enum | `pending`, `sent`, `delivered`, `failed`, `read` |  |
| module_sod_rules | public | conflict_type | module_sod_rules_conflict_type_enum | `hard`, `soft` |  |
| module_sod_rules | public | resolution_strategy | module_sod_rules_resolution_strategy_enum | `block`, `warn`, `escalate`, `allow` |  |
| near_miss_reports | tenant | severity_estimate | near_miss_reports_severity_estimate_enum | `low`, `medium`, `high`, `critical` |  |
| near_miss_reports | tenant | status | near_miss_reports_status_enum | `reported`, `under_review`, `action_taken`, `converted`, `closed`, `dismissed` |  |
| notification_ai_suggestions | tenant | status | notification_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| onboarding_answer_analytics | public | answer_type | onboarding_answer_analytics_answer_type_enum | `text`, `number`, `boolean`, `select`, `multi_select`, `lookup`, `json` |  |
| onboarding_configs | public | mode | onboarding_configs_mode_enum | `manual`, `guided`, `assisted`, `automated` |  |
| onboarding_phases | tenant | status | onboarding_phases_status_enum | `pending`, `in_progress`, `completed`, `skipped` |  |
| onboarding_provisioning_log | tenant | status | onboarding_provisioning_log_status_enum | `pending`, `running`, `success`, `failed` |  |
| onboarding_question_audit | public | action | onboarding_question_audit_action_enum | `INSERT`, `UPDATE`, `DELETE`, `ACTIVATE`, `DEACTIVATE` |  |
| onboarding_session_answers | public | answer_type | onboarding_session_answers_answer_type_enum | `text`, `number`, `boolean`, `date`, `select`, `multi_select`, `lookup`, `json_rows`, `chips` |  |
| onboarding_stages | public | status | onboarding_stages_status_enum | `not_started`, `in_progress`, `completed`, `skipped`, `blocked` |  |
| operating_cockpit_ai_suggestions | tenant | status | operating_cockpit_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| org_pack_template_sod_rules | public | conflict_level | org_pack_template_sod_rules_conflict_level_enum | `warn`, `block` |  |
| org_pack_template_sod_rules | public | scope_rule | org_pack_template_sod_rules_scope_rule_enum | `same_scope`, `tenant_wide` |  |
| org_pack_templates | public | org_type | org_pack_templates_org_type_enum | `standard`, `matrix` |  |
| org_pack_templates | public | size | org_pack_templates_size_enum | `small`, `standard`, `enterprise` |  |
| os_health_checks | tenant | status | os_health_checks_status_enum | `passing`, `warning`, `failing`, `unknown` |  |
| pir_sign_offs | tenant | decision | pir_sign_offs_decision_enum | `pending`, `approved`, `rejected`, `deferred` |  |
| platform_outbox | public | status | platform_outbox_status_enum | `pending`, `published`, `dead` |  |
| playbooks_ai_suggestions | tenant | status | playbooks_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| playbooks_definitions | tenant | trigger_type | playbooks_definitions_trigger_type_enum | `manual`, `event`, `scheduled`, `condition` |  |
| playbooks_executions | tenant | status | playbooks_executions_status_enum | `running`, `completed`, `failed`, `cancelled`, `paused` |  |
| playbooks_step_actions | tenant | status | playbooks_step_actions_status_enum | `pending`, `in_progress`, `completed`, `skipped`, `failed` |  |
| policy_ai_suggestions | tenant | status | policy_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| portals_ai_suggestions | tenant | status | portals_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| privacy_ai_suggestions | tenant | status | privacy_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| privacy_dsar_requests | tenant | request_type | privacy_dsar_requests_request_type_enum | `access`, `rectification`, `erasure`, `portability`, `restriction`, `objection` |  |
| proactive_leadership_action_items | tenant | status | proactive_leadership_action_items_status_enum | `open`, `in_progress`, `completed`, `overdue`, `cancelled` |  |
| proactive_leadership_ai_suggestions | tenant | status | proactive_leadership_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| proactive_leadership_initiatives | tenant | priority | proactive_leadership_initiatives_priority_enum | `critical`, `high`, `medium`, `low` |  |
| proactive_leadership_initiatives | tenant | status | proactive_leadership_initiatives_status_enum | `proposed`, `approved`, `in_progress`, `completed`, `cancelled` |  |
| provisioning_jobs | public | job_status | provisioning_jobs_job_status_enum | `queued`, `running`, `completed`, `failed` |  |
| provisioning_step_runs | public | status | provisioning_step_runs_status_enum | `running`, `succeeded`, `failed` |  |
| provisioning_steps | public | status | provisioning_steps_status_enum | `queued`, `running`, `completed`, `failed` |  |
| qiyas_ai_suggestions | tenant | status | qiyas_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| query_history | tenant | status | query_history_status_enum | `success`, `error`, `timeout`, `cancelled` |  |
| question_bank | public | question_type | question_bank_question_type_enum | `text`, `number`, `boolean`, `date`, `select`, `multi_select`, `json`, `lookup`, `chips`, `json_rows` |  |
| records_ai_suggestions | tenant | status | records_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| records_retention_policies | tenant | action_on_expiry | records_retention_policies_action_on_expiry_enum | `archive`, `delete`, `review` |  |
| recovery_actions | public | action_type | recovery_actions_action_type_enum | `rollback`, `restart`, `disable`, `replay`, `manual_intervention`, `containment` |  |
| recovery_actions | public | status | recovery_actions_status_enum | `pending_approval`, `approved`, `executing`, `completed`, `failed`, `cancelled` |  |
| regulatory_gap_analysis | tenant | status | regulatory_gap_analysis_status_enum | `draft`, `completed`, `approved` |  |
| regulatory_mappings | tenant | compliance_status | regulatory_mappings_compliance_status_enum | `compliant`, `partial`, `non_compliant`, `unknown`, `na` |  |
| regulatory_updates | tenant | impact_level | regulatory_updates_impact_level_enum | `low`, `medium`, `high`, `critical` |  |
| regulatory_updates | tenant | status | regulatory_updates_status_enum | `new`, `under_review`, `actioned`, `archived` |  |
| remediation_ai_suggestions | tenant | status | remediation_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| reporting_ai_suggestions | tenant | status | reporting_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| risk_approval_requests | tenant | approval_type | risk_approval_requests_approval_type_enum | `risk_acceptance`, `treatment_plan`, `risk_closure`, `appetite_breach`, `escalation` |  |
| risk_approval_requests | tenant | status | risk_approval_requests_status_enum | `pending`, `approved`, `rejected`, `escalated`, `delegated` |  |
| risk_approval_requests | tenant | urgency | risk_approval_requests_urgency_enum | `normal`, `urgent`, `critical` |  |
| risk_assessment_items | tenant | status | risk_assessment_items_status_enum | `pending`, `in_progress`, `submitted`, `reviewed`, `approved` |  |
| risk_assessment_reviews | tenant | decision | risk_assessment_reviews_decision_enum | `approved`, `rejected`, `needs_revision` |  |
| risk_campaigns | tenant | campaign_type | risk_campaigns_campaign_type_enum | `rcsa`, `targeted`, `adhoc` |  |
| risk_campaigns | tenant | status | risk_campaigns_status_enum | `draft`, `active`, `completed`, `cancelled` |  |
| risk_indicator_templates | tenant | indicator_type | risk_indicator_templates_indicator_type_enum | `kri`, `kci`, `kpi` |  |
| risk_reviews | tenant | priority | risk_reviews_priority_enum | `low`, `medium`, `high`, `critical` |  |
| risk_reviews | tenant | review_type | risk_reviews_review_type_enum | `periodic`, `escalation`, `appetite_breach`, `treatment_completion`, `closure` |  |
| risk_reviews | tenant | status | risk_reviews_status_enum | `pending`, `in_review`, `approved`, `rejected`, `escalated`, `completed` |  |
| risk_scenario_reviews | tenant | decision | risk_scenario_reviews_decision_enum | `approved`, `rejected`, `needs_revision` |  |
| risk_treatment_reviews | tenant | decision | risk_treatment_reviews_decision_enum | `approved`, `rejected`, `needs_revision` |  |
| secret_references | public | source | secret_references_source_enum | `env`, `vault`, `config` |  |
| session_stages | public | status | session_stages_status_enum | `not_started`, `in_progress`, `completed`, `skipped`, `blocked` |  |
| slo_definitions | public | comparison_operator | slo_definitions_comparison_operator_enum | `lt`, `lte`, `gt`, `gte` |  |
| sso_providers | public | protocol | sso_providers_protocol_enum | `saml`, `oidc` |  |
| sso_providers | public | status | sso_providers_status_enum | `active`, `inactive`, `testing` |  |
| sso_sessions | public | protocol | sso_sessions_protocol_enum | `saml`, `oidc` |  |
| startup_checklist | public | priority | startup_checklist_priority_enum | `critical`, `high`, `medium`, `low` |  |
| team_ai_suggestions | tenant | status | team_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| team_raci_assignments | public | raci_role | team_raci_assignments_raci_role_enum | `responsible`, `accountable`, `consulted`, `informed` |  |
| training_ai_suggestions | tenant | status | training_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| training_assignments | tenant | status | training_assignments_status_enum | `assigned`, `in_progress`, `completed`, `overdue`, `waived` |  |
| ucf_controls | tenant | lifecycle_state | ucf_controls_lifecycle_state_enum | `draft`, `active`, `deprecated`, `retired` |  |
| vendor_ai_suggestions | tenant | status | vendor_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| widgets_ai_suggestions | tenant | status | widgets_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
| workflow_ai_suggestions | tenant | status | workflow_ai_suggestions_status_enum | `pending`, `accepted`, `rejected`, `expired` |  |
