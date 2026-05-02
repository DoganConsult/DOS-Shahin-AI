# JSONB Decomposition — Decision Matrix
Generated: 2026-04-20T06:00:38.401Z
Total JSONB columns: **1660**

Default rule: REVIEW unless the column name signals legitimate document storage.
Decision values: KEEP (stay JSONB) | PROMOTE-COLS (extract to typed columns) | PROMOTE-CHILD (extract to child table) | REVIEW (need more info)

| Table | Column | Layer | Heuristic | Sampled rows | Top-shape overlap | Decision | Notes |
|---|---|---|---|---|---|---|---|
| access_profiles | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| access_profiles | permissions | public | REVIEW | _(catalog only)_ | — |  |  |
| access_snapshots | snapshot_data | public | KEEP | _(catalog only)_ | — | KEEP |  |
| action_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| action_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_tracking | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| action_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| active_alerts | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| actors | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| agent_monitoring_targets | target_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agent_performance | input_summary | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agent_performance | output_summary | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agent_tool_permissions | conditions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agrc_engine_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agrc_engine_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agrc_engine_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agrc_engine_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_engine_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| agrc_engine_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| agrc_os_cycle_log | warnings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_activity_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_agent_registry | capabilities | public | REVIEW | _(catalog only)_ | — |  |  |
| ai_alert_rules | condition_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_governance_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_policies | rules | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_governance_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_governance_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_governance_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_governance_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_governance_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_impact_assessments | classification_json | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_impact_assessments | recommendations_json | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_impact_assessments | sections_json | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_model_lifecycle | retirement_criteria_met | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_model_registry | capabilities | public | REVIEW | _(catalog only)_ | — |  |  |
| ai_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_risk_assessments | bias_assessment | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_risk_assessments | findings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_risk_assessments | mitigations | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_suggestion_history | suggestion_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_suggestions | decision_factors | public | REVIEW | _(catalog only)_ | — |  |  |
| ai_suggestions | input_context | public | REVIEW | _(catalog only)_ | — |  |  |
| ai_suggestions | overridden_value | public | REVIEW | _(catalog only)_ | — |  |  |
| ai_suggestions | suggestion | public | REVIEW | _(catalog only)_ | — |  |  |
| ai_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ai_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ai_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_benchmarks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_comparative_data | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_dashboards | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_data_sources | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_datasets | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_drill_downs | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_exports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_insights | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_prediction_models | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_scheduled_reports | filters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_scheduled_reports | recipients | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_sharing_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_trends | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_versions | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| analytics_widget_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| analytics_widgets | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| answers | answer_json | public | REVIEW | _(catalog only)_ | — |  |  |
| api_keys | scopes | public | REVIEW | _(catalog only)_ | — |  |  |
| approval_chains | steps | public | REVIEW | _(catalog only)_ | — |  |  |
| as_built_ledger | known_limitations | public | REVIEW | _(catalog only)_ | — |  |  |
| as_built_ledger | runtime_dependencies | public | REVIEW | _(catalog only)_ | — |  |  |
| asset_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| asset_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| asset_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| asset_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| asset_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| asset_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| asset_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| asset_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_campaigns | reminder_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_campaigns | scope_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_drafts | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_drafts | readiness_score | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_responses | evidence | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| attestation_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| attestation_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_budget | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_checklists | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_committees | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_engagements | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_field_work | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_log_archive | after_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_log_archive | before_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_logs | after_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_logs | before_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_logs | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_plan | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_quality_review | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_recommendations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_regulatory | findings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_resources | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_response_tracking | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_time_tracking | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_tracking | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_trail | after_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_trail | before_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| audit_working_papers | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| audit_workpapers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| authorization_audit_log | context | public | REVIEW | _(catalog only)_ | — |  |  |
| autonomous_engine_log | warnings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_activation_log | actions_taken | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_awareness_training | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_bia | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_bia_templates | impact_categories | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_bia_templates | questions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_bia_templates | time_frames | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_call_trees | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_contacts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_crisis_communications | contact_info | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_crisis_teams | communication_plan | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_crisis_teams | members | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_dependencies | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_distribution | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_exercise_schedule | results | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_exercises | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_impact_analysis | dependencies | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_impacts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_maintenance_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_maturity_scores | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_recovery_procedures | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_recovery_strategies | resource_requirements | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_resources | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_scenarios | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_sites | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_teams | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| bcp_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| bcp_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmark_datasets | processed_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmark_datasets | raw_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmark_datasets | refresh_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmark_profiles | metric_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| benchmarks_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| benchmarks_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| board_decisions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| breach_reporting_records | data_categories | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| briefings | audience | public | REVIEW | _(catalog only)_ | — |  |  |
| briefings | content | public | REVIEW | _(catalog only)_ | — |  |  |
| case_notes | attachments | tenant | REVIEW | _(catalog only)_ | — |  |  |
| cases | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| cases | tags | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_audit_trail | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_calendar | reminders | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_calendar_events | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_certification | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_controls | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_evidence_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_evidence_ops | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_exceptions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_gaps | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_mapping | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_monitoring | alert_threshold | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_obligations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_posture_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_programs | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_regulatory_changes | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_review_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_roadmap | dependencies | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_scope | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_scoring_policies | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| compliance_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| compliance_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| conditional_access_policies | conditions | public | REVIEW | _(catalog only)_ | — |  |  |
| config_audit_logs | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| config_audit_logs | new_value | public | REVIEW | _(catalog only)_ | — |  |  |
| config_audit_logs | old_value | public | REVIEW | _(catalog only)_ | — |  |  |
| config_definitions | default_value | public | REVIEW | _(catalog only)_ | — |  |  |
| config_definitions | validation_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| config_values | value | public | REVIEW | _(catalog only)_ | — |  |  |
| connector_configs | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| content_packs | modules | public | KEEP | _(catalog only)_ | — | KEEP |  |
| content_packs | seeds | public | REVIEW | _(catalog only)_ | — |  |  |
| contract_catalog | schema_definition | public | REVIEW | _(catalog only)_ | — |  |  |
| control_tests | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_automation | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_certifications | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_deficiency_tracking | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_design_effectiveness | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_effectiveness | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_exceptions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_frameworks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_library | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_mapping | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_monitoring | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_monitoring_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_operating_effectiveness | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_ownership | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_remediation_plans | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_samples | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| controls_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| controls_walkthroughs | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| csa_campaigns | control_ids | tenant | REVIEW | _(catalog only)_ | — |  |  |
| csa_campaigns | respondent_ids | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_configs | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_custom_views | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_data_cache | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_editor_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_editor_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_editor_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_editor_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_editor_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_editor_versions | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_interactions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_layouts | layout | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_mobile_config | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_navigation | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_permissions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_personalization | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_refresh_rates | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_registry | default_filters | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_registry | layout | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_sharing | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_themes | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_user_preferences | layout | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_user_preferences | widget_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_widget_library | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_widget_registry | default_config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_widgets | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_widgets | data_source | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dashboard_widgets | position | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboard_widgets | size | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dashboards | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| dead_letter_queue | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_assessments | findings | public | REVIEW | _(catalog only)_ | — |  |  |
| dora_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_ict_assets | dependencies | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_major_incidents | ict_assets_affected | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_major_incidents | impact_assessment | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_resilience_tests | results | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dora_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_threat_intelligence | affected_assets | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_threat_intelligence | indicators | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_threat_intelligence | shared_with | tenant | REVIEW | _(catalog only)_ | — |  |  |
| dora_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| dos_compatibility_records | affected_consumers | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_cutover_executions | passed_checkpoints | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_cutover_plans | execution_sequence | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_cutover_plans | no_go_criteria | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_cutover_plans | rollback_triggers | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_feature_gates | allowed_roles | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_feature_gates | allowed_tenants | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_migrations | affected_schemas | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_migrations | affected_tables | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_migrations | validation_steps | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | affected_layers | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | affected_modules | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | affected_products | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | approvals_met | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | approvals_required | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | migrations | public | REVIEW | _(catalog only)_ | — |  |  |
| dos_releases | smoke_test_inventory | public | REVIEW | _(catalog only)_ | — |  |  |
| editor_layouts | breakpoints | tenant | REVIEW | _(catalog only)_ | — |  |  |
| editor_layouts | grid_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| editor_templates | layout_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| editor_widgets | data_config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| editor_widgets | display_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| enforcement_check_results | findings | public | REVIEW | _(catalog only)_ | — |  |  |
| enforcement_runs | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| event_dead_letter_queue | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| event_traces | spans | public | REVIEW | _(catalog only)_ | — |  |  |
| evidence_automated_collection | collected_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_catalog | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_collection | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_collection_rules | notification_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_collection_rules | source_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_expiration_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_freshness | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_metadata | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_requests | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_reviewers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_stakeholders | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_storage_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_validation_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| evidence_vault | file_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| evidence_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| exception_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| exception_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| exception_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| exception_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| exception_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| exception_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| exception_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_briefings | action_items | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_briefings | key_findings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_briefings | metrics_snapshot | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_dashboards | layout_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_dashboards | sections | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| executive_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| executive_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| export_jobs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| export_jobs | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| fitch_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| fitch_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_ratings | raw_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| fitch_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| fitch_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| fitch_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| fitch_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| fitch_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| form_conditional_rules | condition_json | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_ai_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_ai_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_recommendations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_ai_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_ai_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_ai_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_ai_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_ai_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_archives | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_attendees | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_boards | members | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_change_log | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_charters | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_compliance_map | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_decisions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_delegations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_documents | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_escalation_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_folders | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_health_scores | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_mandates | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_meetings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_memberships | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_minutes | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_os_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_os_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_os_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_os_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_os_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_os_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_os_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_policies_link | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_raci_matrix | consulted | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_raci_matrix | informed | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_reporting | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_review_schedule | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_reviews | findings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| governance_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| governance_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| grc_query_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| grc_query_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| grc_query_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| grc_query_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| grc_query_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| grc_query_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| grc_query_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_archive | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_bulk_actions | item_ids | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_bulk_actions | result | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_delegation | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_filters | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_items | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_mentions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_notifications | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_preferences | notification_channels | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_priority_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_reminders | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| inbox_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_versions | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inbox_worklists | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_audit_log | after_state | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_audit_log | before_state | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_automated_triggers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_communication_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_escalations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_evidence | chain_of_custody | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_evidence_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_impacts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_investigations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_lessons | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_notifications | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_pir | action_items | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | attachments | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | attendees | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | contributing_factors | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | impact_analysis | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | lessons_learned | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_pir | recommendations | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir | root_causes | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_pir_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_post_incident_reviews | action_items | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_post_incident_reviews | attendees | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_recurring_patterns | affected_systems | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_recurring_patterns | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_recurring_patterns | severity_distribution | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_recurring_patterns | taxonomy_nodes | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_regulatory_notifications | attachments | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_regulatory_notifications | authority_contact | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_regulatory_notifications | content_full | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_regulatory_notifications | follow_up_actions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_regulatory_notifications | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_regulatory_reports | report_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_reportable_criteria | criteria_rule | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_reporting_config | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_responders | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_response_teams | members | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_response_teams | on_call_schedule | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_responses | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_root_cause_analysis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_taxonomy | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_timeline_events | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_timelines | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| incident_trend_cache | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| incident_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| inferred_facts | value | public | REVIEW | _(catalog only)_ | — |  |  |
| integration_configs | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations | credentials | public | REVIEW | _(catalog only)_ | — |  |  |
| integrations_api_keys | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| integrations_connectors | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_credentials | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_documentation | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_errors | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_events | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| integrations_field_mappings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_health_checks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_rate_limits | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| integrations_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| integrations_staging_tables | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_sync_log | error_log | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_sync_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_sync_status | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_transforms | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| integrations_webhooks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| issues_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| issues_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| issues_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| issues_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| issues_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| issues_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| issues_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_checkpoints | criteria | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_maturity_scores | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_milestones | dependencies | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_roadmap_items | dependencies | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| journey_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| journey_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_ai_suggestions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_articles | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_comments | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_distribution | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_embeddings | embedding | tenant | REVIEW | _(catalog only)_ | — |  |  |
| knowledge_experts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| knowledge_faq_sets | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_glossary | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_media_library | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| knowledge_ratings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| knowledge_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_search_index | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| knowledge_tags | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| knowledge_translations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| knowledge_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ksa_regulatory_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ksa_regulatory_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ksa_regulatory_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ksa_regulatory_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ksa_regulatory_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ksa_regulatory_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ksa_regulatory_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| lifecycle_checkpoints | state_data | public | KEEP | _(catalog only)_ | — | KEEP |  |
| lifecycle_transitions | guard_conditions | public | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| local_knowledge_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| local_knowledge_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_agent_registry | guardrails | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_audit_log | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_prompt_registry | guardrails | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_prompt_registry | input_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_prompts | arguments | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_resource_registry | input_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_resource_registry | output_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_resources | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_servers | auth_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_servers | capabilities | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mcp_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tool_invocations | input | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tool_invocations | output | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tool_registry | approval_config | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tool_registry | execution_config | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tool_registry | input_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tool_registry | output_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tools | input_schema | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_tools | output_schema | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mcp_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_offline_sync_queue | conflict_resolution | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_offline_sync_queue | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_push_notifications | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| mobile_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| mobile_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| module_config | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| module_config_audit | new_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| module_config_audit | old_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| module_entitlement_audit | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| module_health_events | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| module_registry | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| module_visibility_contracts | conditions | public | REVIEW | _(catalog only)_ | — |  |  |
| near_miss_reports | attachments | tenant | REVIEW | _(catalog only)_ | — |  |  |
| near_miss_reports | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_blacklists | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_channels | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_delivery_log | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_digests | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_escalations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| notification_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_preferences | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| notification_priority_mapping | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_providers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| notification_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_retry_queue | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| notification_subscriptions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_suppression_list | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| notification_triggers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notification_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| notifications | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| notifications_log | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_answer_analytics | validation_errors | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_answers | answer_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_configs | completed_steps | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_configs | steps | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_framework_rules | condition_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_handoff_agent_findings | payload_json | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_handoff_agent_runs | result_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_handoff_evidence_requests | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_handoff_invitations | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_inference_bundles | bundle_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_inference_bundles | rationale_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_inference_feedback | payload_json | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_inference_items | item_metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_inference_items | user_override | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_journeys | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_module_rules | condition_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_persona_rules | condition_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_phases | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_provisioning_log | details | tenant | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_question_audit | new_values | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_question_audit | old_values | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_question_bank | options_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_question_bank | signals | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_question_bank | validation_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_question_bank | visibility_rule_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_regulator_rules | condition_json | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_session_answers | validation_errors | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_sessions | category_scores | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_sessions | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_sessions | metadata_json | public | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_sessions | stage_scores | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_stage_definitions | validation_rules | public | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_workspace_config | branding | tenant | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_workspace_config | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| onboarding_workspace_config | sla_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| onboarding_workspace_handoff_cycles | payload_json | public | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_dashboards | layout | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_dashboards | widgets | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| operating_cockpit_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| operating_cockpit_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| org_pack_template_departments | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| org_pack_template_sections | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| org_pack_template_teams | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| org_pack_templates | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| os_configurations | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| os_health_checks | details | tenant | REVIEW | _(catalog only)_ | — |  |  |
| os_runbooks | rollback_steps | tenant | REVIEW | _(catalog only)_ | — |  |  |
| os_runbooks | steps | tenant | REVIEW | _(catalog only)_ | — |  |  |
| os_runbooks | trigger_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| packs_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| pending_workflow_tasks | outcome | public | REVIEW | _(catalog only)_ | — |  |  |
| pending_workflow_tasks | task_payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| permission_cache | modules | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| permission_cache | permissions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| permission_cache | roles | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| plan_item_instances | tags | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| platform_audit_logs | after_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| platform_audit_logs | before_state | public | KEEP | _(catalog only)_ | — | KEEP |  |
| platform_audit_logs | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| platform_operation_config | config_value | public | REVIEW | _(catalog only)_ | — |  |  |
| platform_outbox | headers | public | REVIEW | _(catalog only)_ | — |  |  |
| platform_outbox | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| platform_outbox_archive | headers | public | REVIEW | _(catalog only)_ | — |  |  |
| platform_outbox_archive | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| platform_products | manifest | public | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_definitions | escalation_rules | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_definitions | steps | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_definitions | trigger_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_executions | step_results | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_step_actions | input_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_step_actions | output_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| playbooks_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| playbooks_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_acknowledgements | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_audit_trail | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_distribution_lists | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_distribution_tracking | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_documents | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_endorsements | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_exceptions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| policy_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_library | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| policy_mappings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_portal_config | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| policy_renewals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| policy_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_retirements | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_review_cycles | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| policy_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| policy_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| policy_versions_meta | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_pages | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_pages | layout | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| portals_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| portals_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_audits | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_breach_notifications | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_breach_register | data_categories | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_consent_records | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_controls | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_cookies | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_data_mappings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_data_registers | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_data_subject_requests | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_data_transfers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_dpia | risk_assessment | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_dpias | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_impact_assessments | recommendations | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_impact_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_notices | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_pia_results | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_policies | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_processing_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_retention_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| privacy_third_party_transfers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_training | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| privacy_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| proactive_leadership_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| proactive_leadership_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| proactive_leadership_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| proactive_leadership_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_scorecards | dimensions | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| proactive_leadership_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| proactive_leadership_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| proactive_leadership_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| product_registry | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| provisioning_events | details_json | public | REVIEW | _(catalog only)_ | — |  |  |
| provisioning_jobs | summary_json | public | REVIEW | _(catalog only)_ | — |  |  |
| provisioning_step_definitions | configuration | public | REVIEW | _(catalog only)_ | — |  |  |
| provisioning_step_definitions | error_handling | public | REVIEW | _(catalog only)_ | — |  |  |
| provisioning_step_runs | error | public | REVIEW | _(catalog only)_ | — |  |  |
| provisioning_step_runs | output | public | REVIEW | _(catalog only)_ | — |  |  |
| provisioning_steps | payload_json | public | KEEP | _(catalog only)_ | — | KEEP |  |
| provisioning_telemetry | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_assessment_responses | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_benchmark_profiles | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_improvement_plans | actions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_journeys | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_journeys | results | public | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_rating_scales | levels | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| qiyas_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| qiyas_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| query_datasets | refresh_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| query_datasets | schema_def | tenant | REVIEW | _(catalog only)_ | — |  |  |
| query_datasets | source_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| query_history | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| query_history | result_preview | tenant | REVIEW | _(catalog only)_ | — |  |  |
| query_templates | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| query_templates | target_modules | tenant | REVIEW | _(catalog only)_ | — |  |  |
| question_bank | conditional_on | public | REVIEW | _(catalog only)_ | — |  |  |
| question_bank | options | public | REVIEW | _(catalog only)_ | — |  |  |
| question_bank | validation_rules | public | REVIEW | _(catalog only)_ | — |  |  |
| raci_matrices | definition | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| raci_matrices | entries | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| raci_matrices | roles | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| realtime_event_log | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| recommendations | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| records | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| records_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| records_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| records_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| records_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| records_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| records_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| records_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| records_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| recovery_actions | audit_context | public | KEEP | _(catalog only)_ | — | KEEP |  |
| register_idempotency | response_body | public | REVIEW | _(catalog only)_ | — |  |  |
| regulatory_gap_analysis | gaps | tenant | REVIEW | _(catalog only)_ | — |  |  |
| regulatory_gap_analysis | remediation_plan | tenant | REVIEW | _(catalog only)_ | — |  |  |
| regulatory_mappings | evidence | tenant | REVIEW | _(catalog only)_ | — |  |  |
| regulatory_updates | affected_areas | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reliability_dead_letter | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_root_causes | contributing_factors | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| remediation_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| remediation_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| report_schedules | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| report_schedules | recipients | public | REVIEW | _(catalog only)_ | — |  |  |
| reporting_ad_hoc_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_archival_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_branding | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_bursting_config | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_data_extracts | filters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_data_extracts | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_delivery_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_distributions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_exports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_formats | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_generated | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_layout_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_parameters | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_recipients | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_scheduled | filters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_scheduled | recipients | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_scheduled_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_subscriptions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| reporting_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| reporting_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_aggregation | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_ai_suggestions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_appetite_statements | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_approval_requests | conditions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| risk_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_change_log | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_control_mappings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_correlations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_dashboard_cache | cache_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_events | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_external_mappings | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_heat_map_config | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| risk_indicators | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_indicators_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_kris | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_models | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_owners | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_registry | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_reporting_snapshots | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| risk_reviews | conditions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| risk_scenarios | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_scenarios_impact | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_score_history | dimension_scores | tenant | REVIEW | _(catalog only)_ | — |  |  |
| risk_scoring_models | dimensions | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_scoring_models | thresholds | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_scoring_models | zone_definitions | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| risk_simulations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_taxonomy | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_tolerance | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_treatment_plans | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_treatment_progress | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_treatments | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| risk_watchers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| role_profiles | dashboard_widgets | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| role_profiles | modules | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| runbook_definitions | alert_sources | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | common_failure_modes | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | dashboard_links | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | dependency_map | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | health_signals | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | known_caveats | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | linked_alert_ids | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | recovery_steps | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | rollback_steps | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | support_contacts | public | REVIEW | _(catalog only)_ | — |  |  |
| runbook_definitions | trigger_types | public | REVIEW | _(catalog only)_ | — |  |  |
| runtime_config | value | public | REVIEW | _(catalog only)_ | — |  |  |
| saved_views | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| scores | explanation | public | REVIEW | _(catalog only)_ | — |  |  |
| shell_extensions | guard_conditions | public | REVIEW | _(catalog only)_ | — |  |  |
| shell_extensions | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| sod_conflict_audit_template | conflicting_rules | public | REVIEW | _(catalog only)_ | — |  |  |
| sso_identities | attributes | public | REVIEW | _(catalog only)_ | — |  |  |
| sso_providers | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| sso_sessions | attributes | public | REVIEW | _(catalog only)_ | — |  |  |
| stage_definitions | validation_rules | public | REVIEW | _(catalog only)_ | — |  |  |
| system_events | metadata | public | KEEP | _(catalog only)_ | — | KEEP |  |
| team_availability | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_capacity | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_certifications | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_departments | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| team_growth_plans | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_leave_records | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_mentorship_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_org_chart | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_performance_profiles | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_positions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_raci_matrix | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| team_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_reporting_lines | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| team_resource_allocation | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_roles | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| team_skill_gap_analysis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_skills | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_time_zones | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_training_records | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| team_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| templates | pre_filled_answers | public | REVIEW | _(catalog only)_ | — |  |  |
| tenant_boundary_configs | max_resources_per_type | public | REVIEW | _(catalog only)_ | — |  |  |
| tenant_config_versions | config_value | public | REVIEW | _(catalog only)_ | — |  |  |
| tenant_module_entitlements | modules_config | public | REVIEW | _(catalog only)_ | — |  |  |
| tenants | settings | public | KEEP | _(catalog only)_ | — | KEEP |  |
| tier_definitions | limits | public | REVIEW | _(catalog only)_ | — |  |  |
| training_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_campaigns | courses | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_campaigns | target_audience | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_phishing_simulations | results | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_phishing_simulations | target_users | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_records | data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| training_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| training_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| ucf_controls | evidence_requirements | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ucf_controls | exception_rules | tenant | REVIEW | _(catalog only)_ | — |  |  |
| ucf_controls | test_steps | tenant | REVIEW | _(catalog only)_ | — |  |  |
| user_preferences | preferences | tenant | REVIEW | _(catalog only)_ | — |  |  |
| user_view_preferences | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| users | notification_prefs | public | REVIEW | _(catalog only)_ | — |  |  |
| vendor_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_compliance | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_contacts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_contracts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_documents | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_due_diligence | findings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_due_diligence_checklists | items | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_due_diligence_ext | evidence_refs | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_due_diligence_ext | risk_findings | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_fourth_party | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_monitoring | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_notifications | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_onboarding | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_performance | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_profiles | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_questionnaire_bank | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_questionnaire_templates | questions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_questionnaire_templates | scoring_model | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_renewals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_scorecards | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| vendor_sla_tracking | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_spend_analysis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_termination | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| vendor_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets | position | public | REVIEW | _(catalog only)_ | — |  |  |
| widgets_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_activities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_alerts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_categories | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_configs | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| widgets_data_cache | cached_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_entities | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_evidence | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| widgets_feedback | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_instances | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_items | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_kpis | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_links | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_members | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_metrics | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_registry | data_source | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_registry | default_config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| widgets_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_reports | query_definition | tenant | REVIEW | _(catalog only)_ | — |  |  |
| widgets_reviews | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_schedules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| widgets_snapshots | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_tasks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| widgets_templates | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| widgets_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| work_items | context | public | REVIEW | _(catalog only)_ | — |  |  |
| workflow_actions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_approvals | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_automation_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_chain_definitions | definition | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_chains | config | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_conditions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_definitions | content | tenant | REVIEW | _(catalog only)_ | — |  |  |
| workflow_delegation_rules | conditions | tenant | REVIEW | _(catalog only)_ | — |  |  |
| workflow_designer_layouts | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_error_handling | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_escalations | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_event_log | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_external_mappings | mapping_config | tenant | REVIEW | _(catalog only)_ | — |  |  |
| workflow_history | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_hooks | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_instances | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_notifications | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_report_snapshots | parameters | tenant | REVIEW | _(catalog only)_ | — |  |  |
| workflow_report_snapshots | result_data | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_routing_logic | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_scheduled_jobs | payload | public | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_schedules | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_settings | config_value | tenant | REVIEW | _(catalog only)_ | — |  |  |
| workflow_simulation_logs | payload | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_sla_configs | escalation_rules | public | REVIEW | _(catalog only)_ | — |  |  |
| workflow_state_machine | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_steps | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_templates | definition | public | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_templates | parameters_schema | public | REVIEW | _(catalog only)_ | — |  |  |
| workflow_transitions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_triggers | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_validation_rules | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_variable_mapping | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflow_versions | metadata | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workflows | definition | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workspace_config | config_value | public | REVIEW | _(catalog only)_ | — |  |  |
| workspace_profile | sectors | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workspace_profile | settings | tenant | KEEP | _(catalog only)_ | — | KEEP |  |
| workspaces | config | public | KEEP | _(catalog only)_ | — | KEEP |  |
