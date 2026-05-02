# Normalization Scorecard
Generated: 2026-04-20T22:40:09.443Z
Total tables: **2154**

## Maturity ladder

| Highest form satisfied | Tables | % of total |
|---|---:|---:|
| DKNF | 1758 | 81.6% |
| 4NF | 115 | 5.3% |
| BCNF | 25 | 1.2% |
| 3NF | 0 | 0.0% |
| 2NF | 33 | 1.5% |
| 1NF | 0 | 0.0% |
| BELOW-1NF | 223 | 10.4% |

## Per-form pass-rate

| Form | pass | fail | review | n/a |
|---|---:|---:|---:|---:|
| 1NF | 1931 | 223 | 0 | 0 |
| 2NF | 0 | 0 | 13 | 2141 |
| 3NF | 2099 | 55 | 0 | 0 |
| BCNF | 2028 | 0 | 109 | 17 |
| 4NF | 1993 | 161 | 0 | 0 |
| DKNF | 1989 | 165 | 0 | 0 |

## Per-layer rollup

| Layer | tables | DKNF | 4NF | BCNF | 3NF | 2NF | 1NF | <1NF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| public | 266 | 150 | 26 | 8 | 0 | 14 | 0 | 68 |
| tenant | 1881 | 1601 | 89 | 17 | 0 | 19 | 0 | 155 |
| unknown | 7 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |

## Per-table verdicts (worst grade first)

| Table | Layer | Grade | 1NF | 2NF | 3NF | BCNF | 4NF | DKNF | Top violation |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| access_profiles | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✓ | ✓ | 1NF:jsonb-list:permissions |
| action_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| action_tracking | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| agent_credentials | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:array-column:scopes:TEXT[] |
| agent_tool_permissions | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:conditions |
| agrc_os_cycle_log | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:warnings |
| ai_agent_registry | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:capabilities |
| ai_governance_policies | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:rules |
| ai_model_registry | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:jsonb-list:capabilities |
| ai_model_risk_assessments | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:risk_findings |
| ai_model_risk_scores | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:risk_factors |
| ai_risk_assessments | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:findings |
| ai_suggestions | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:reason_codes:TEXT[] |
| analytics_benchmarks | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:repeating-group:percentile_*:3 |
| analytics_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| analytics_scheduled_reports | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:recipients |
| analytics_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:metrics |
| api_keys | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:scopes |
| approval_chains | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:steps |
| as_built_ledger | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:runtime_dependencies |
| asset_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| attestation_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| audit_findings | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| audit_regulatory | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:findings |
| audit_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| audit_risk_assessments | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:risk_factors |
| audit_trail | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:changes |
| autonomous_engine_log | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:warnings |
| bcp_bia_templates | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:jsonb-list:impact_categories |
| bcp_crisis_teams | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:members |
| bcp_exercise_schedule | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:results |
| bcp_exercises | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:participants |
| bcp_impact_analysis | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:dependencies |
| bcp_maturity_scores | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| bcp_recovery_strategies | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:resource_requirements |
| bcp_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| bcp_scenarios | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:recovery_procedures |
| benchmarks_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| breach_reporting_records | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✓ | ✓ | 1NF:jsonb-list:data_categories |
| case_notes | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:attachments |
| compliance_attestations | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| compliance_calendar | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:reminders |
| compliance_gaps | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| compliance_regulatory_changes | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:action_items |
| compliance_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| compliance_roadmap | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:dependencies |
| conditional_access_policies | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:conditions |
| config_definitions | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:allowed_scopes:TEXT[] |
| content_packs | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:modules |
| contract_catalog | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:readers:TEXT[] |
| control_tests | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:evidence_refs |
| controls | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:framework_refs |
| controls_certifications | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| controls_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| controls_testing | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| csa_campaigns | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:control_ids |
| dashboard_editor_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| dashboard_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| dora_assessments | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:findings |
| dora_ict_assets | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:dependencies |
| dora_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| dora_resilience_tests | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✓ | ✗ | 1NF:jsonb-list:results |
| dora_threat_intelligence | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:affected_assets |
| dos_compatibility_records | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:affected_consumers |
| dos_cutover_executions | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:passed_checkpoints |
| dos_cutover_plans | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:rollback_triggers |
| dos_feature_gates | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:allowed_roles |
| dos_migrations | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:affected_schemas |
| dos_releases | public | BELOW-1NF | ✗ | – | ✗ | ? | ✗ | ✓ | 1NF:jsonb-list:affected_layers |
| editor_layouts | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:breakpoints |
| enforcement_check_results | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:findings |
| event_traces | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:spans |
| evidence_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| evidence_vault | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:file_refs |
| exception_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| executive_briefings | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:key_findings |
| executive_dashboards | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:sections |
| executive_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| fitch_assessments | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:gap_analysis |
| fitch_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| form_conditional_rules | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:target_fields:TEXT[] |
| governance_ai_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| governance_boards | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:members |
| governance_delegations | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:conditions |
| governance_health_scores | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:components |
| governance_meetings | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:attendees |
| governance_os_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| governance_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| governance_reviews | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:findings |
| grc_query_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| inbox_bulk_actions | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:item_ids |
| inbox_preferences | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:priority_filter:TEXT[] |
| inbox_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| incident_investigations | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:findings |
| incident_notification_templates | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:array-column:channels:TEXT[] |
| incident_pir | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:root_causes |
| incident_post_incident_reviews | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:attendees |
| incident_recurring_patterns | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:jsonb-list:affected_systems |
| incident_regulatory_notifications | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:follow_up_actions |
| incident_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| incident_response_teams | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:array-column:notification_channels:TEXT[] |
| incident_timelines | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| incidents | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:affected_systems |
| integrations | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:credentials |
| integrations_api_keys | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:scopes |
| integrations_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| integrations_webhooks | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✓ | ✓ | 1NF:jsonb-list:events |
| issues_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| journey_maturity_scores | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| journey_milestones | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:dependencies |
| journey_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| journey_roadmap_items | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:dependencies |
| knowledge_articles | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✓ | ✓ | 1NF:jsonb-list:locale_variants |
| knowledge_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| ksa_regulatory_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| lifecycle_transitions | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:guard_conditions |
| local_knowledge_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| lookup_cloud_providers | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:array-column:regions_available:TEXT[] |
| lookup_sectors | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:array-column:typical_frameworks:TEXT[] |
| lookup_team_functions | public | BELOW-1NF | ✗ | – | ✓ | – | ✓ | ✓ | 1NF:array-column:required_for_sectors:TEXT[] |
| lookup_timezones | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:array-column:countries:TEXT[] |
| mcp_agent_registry | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:array-column:module_codes:TEXT[] |
| mcp_prompt_registry | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✗ | 1NF:jsonb-list:guardrails |
| mcp_prompts | tenant | BELOW-1NF | ✗ | – | ✗ | ? | ✓ | ✓ | 1NF:jsonb-list:arguments |
| mcp_resource_registry | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✗ | 1NF:array-column:requires_permission:TEXT[] |
| mcp_servers | tenant | BELOW-1NF | ✗ | – | ✗ | ? | ✗ | ✗ | 1NF:jsonb-list:capabilities |
| mcp_tool_registry | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✗ | 1NF:array-column:required_permissions:TEXT[] |
| mobile_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| module_sod_rules | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✗ | 1NF:array-column:escalation_roles:TEXT[] |
| module_visibility_contracts | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:conditions |
| near_miss_reports | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:attachments |
| notification_digests | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:preferences |
| notification_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| notification_rules | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:channels |
| notification_templates | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:variables |
| onboarding_answer_analytics | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✓ | ✗ | 1NF:jsonb-list:validation_errors |
| onboarding_configs | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:steps |
| onboarding_inference_bundles | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:deeper_question_codes:TEXT[] |
| onboarding_provisioning_log | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:details |
| onboarding_question_audit | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:old_values |
| onboarding_question_bank | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:jsonb-list:signals |
| onboarding_session_answers | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:validation_errors |
| onboarding_session_progress | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:array-column:stages_completed:TEXT[] |
| onboarding_sessions | public | BELOW-1NF | ✗ | – | ✗ | – | ✗ | ✓ | 1NF:array-column:completed_stages:VARCHAR[] |
| onboarding_stage_definitions | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:validation_rules |
| onboarding_workspace_config | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:enabled_modules:TEXT[] |
| onboarding_workspace_handoff_cycles | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:agents_planned:TEXT[] |
| operating_cockpit_dashboards | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:widgets |
| operating_cockpit_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| os_configurations | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:parameters |
| os_health_checks | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:details |
| os_runbooks | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:steps |
| permission_cache | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:jsonb-list:permissions |
| platform_outbox | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✗ | 1NF:jsonb-list:headers |
| platform_outbox_archive | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:headers |
| platform_products | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:domains:TEXT[] |
| playbooks_definitions | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✗ | 1NF:jsonb-list:steps |
| playbooks_executions | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:step_results |
| playbooks_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| policies | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:framework_refs |
| policy_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| portals_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| privacy_breach_register | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:data_categories |
| privacy_impact_assessments | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:recommendations |
| privacy_processing_activities | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:data_categories |
| privacy_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| proactive_leadership_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| provisioning_step_definitions | public | BELOW-1NF | ✗ | – | ✓ | – | ✗ | ✓ | 1NF:array-column:depends_on:TEXT[] |
| qiyas_assessment_responses | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:evidence_refs |
| qiyas_improvement_plans | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:actions |
| qiyas_journeys | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:results |
| qiyas_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| query_history | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✗ | 1NF:jsonb-list:parameters |
| query_templates | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| question_bank | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✗ | 1NF:jsonb-list:options |
| raci_matrices | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:roles |
| records_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| regulatory_gap_analysis | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✗ | 1NF:jsonb-list:gaps |
| regulatory_updates | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:affected_areas |
| remediation_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| remediation_root_causes | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:contributing_factors |
| report_schedules | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:recipients |
| reporting_data_extracts | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:jsonb-list:filters |
| reporting_generated | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:parameters |
| reporting_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| reporting_scheduled | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:recipients |
| reporting_templates | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| risk_approval_requests | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:conditions |
| risk_reviews | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:conditions |
| risk_scenarios | tenant | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:jsonb-list:assumptions |
| risk_score_history | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:dimension_scores |
| risks | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:jsonb-list:entity_links |
| role_profiles | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:jsonb-list:modules |
| runbook_definitions | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:trigger_types |
| shell_extensions | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:guard_conditions |
| sod_conflict_audit_template | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:role_codes:TEXT[] |
| sso_identities | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:attributes |
| sso_sessions | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✗ | 1NF:jsonb-list:attributes |
| stage_definitions | public | BELOW-1NF | ✗ | – | ✓ | ? | ✓ | ✓ | 1NF:jsonb-list:validation_rules |
| team_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| templates | public | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:recommended_modules:TEXT[] |
| tenant_boundary_configs | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:cross_tenant_partners:TEXT[] |
| tenant_module_entitlements | public | BELOW-1NF | ✗ | – | ✓ | – | ✗ | ✓ | 1NF:array-column:licensed_modules:TEXT[] |
| tenants | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:array-column:regions:TEXT[] |
| tier_definitions | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:features:TEXT[] |
| training_campaigns | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:courses |
| training_phishing_simulations | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:target_users |
| training_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| ucf_controls | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✗ | 1NF:jsonb-list:evidence_requirements |
| user_preferences | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:preferences |
| users | public | BELOW-1NF | ✗ | – | ✗ | ✓ | ✗ | ✓ | 1NF:array-column:certifications:TEXT[] |
| vendor_assessments | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:findings |
| vendor_due_diligence | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:findings |
| vendor_due_diligence_checklists | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:array-column:tier_codes:TEXT[] |
| vendor_due_diligence_ext | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:evidence_refs |
| vendor_monitoring | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:alerts |
| vendor_questionnaire_templates | tenant | BELOW-1NF | ✗ | – | ✓ | ? | ✗ | ✓ | 1NF:array-column:tier_codes:TEXT[] |
| vendor_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| widgets_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| workflow_approvals | tenant | BELOW-1NF | ✗ | – | ✓ | – | ✗ | ✓ | 1NF:jsonb-list:required_approvers |
| workflow_delegation_rules | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:conditions |
| workflow_report_snapshots | tenant | BELOW-1NF | ✗ | – | ✓ | ✓ | ✗ | ✓ | 1NF:jsonb-list:parameters |
| workflow_sla_configs | public | BELOW-1NF | ✗ | – | ✓ | ✓ | ✓ | ✓ | 1NF:jsonb-list:escalation_rules |
| active_alerts | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:transitive:alert_id+alert_name |
| agent_feedback_log | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:transitive:task_id+task_title |
| agrc_metrics_snapshots | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:cycle_count |
| analytics_data_sources | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:row_count |
| attestation_drafts | tenant | 2NF | ✓ | – | ✗ | ✓ | ✗ | ✗ | 3NF:transitive:entity_id+entity_name |
| audit_external | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:findings_count |
| audit_repeat_findings | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:repeat_count |
| compliance_requirements | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:transitive:framework_id+framework_name |
| dead_letter_queue | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:retry_count |
| dos_quality_gates | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:transitive:gate_id+gate_code |
| editor_templates | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:usage_count |
| enforcement_runs | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✗ | 3NF:denorm-counter:fail_count |
| event_dead_letter_queue | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✗ | 3NF:denorm-counter:retry_count |
| grc_regulators | tenant | 2NF | ✓ | – | ✗ | ? | ✓ | ✓ | 3NF:denorm-counter:own_frameworks_count |
| incident_reportable_criteria | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:transitive:criteria_id+criteria_name |
| knowledge_embeddings | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:token_count |
| knowledge_search_log | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:results_count |
| mcp_tool_invocations | tenant | 2NF | ✓ | – | ✗ | ✓ | ✗ | ✓ | 3NF:transitive:tool_id+tool_name |
| mcp_tools | tenant | 2NF | ✓ | – | ✗ | ? | ✗ | ✓ | 3NF:transitive:tool_id+tool_name |
| onboarding_handoff_agent_runs | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:findings_count |
| onboarding_regulator_rules | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:transitive:regulator_id+regulator_name |
| permission_usage | public | 2NF | ✓ | ? | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:usage_count |
| policy_distribution | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:acknowledged_count |
| provisioning_jobs | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✗ | 3NF:denorm-counter:retry_count |
| provisioning_steps | public | 2NF | ✓ | – | ✗ | ? | ✓ | ✗ | 3NF:denorm-counter:retry_count |
| query_datasets | tenant | 2NF | ✓ | – | ✗ | ✓ | ✗ | ✓ | 3NF:denorm-counter:row_count |
| risk_appetite_config | tenant | 2NF | ✓ | – | ✗ | ? | ✓ | ✓ | 3NF:transitive:appetite_id+appetite_name |
| seed_history | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:row_count |
| training_content_library | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:usage_count |
| vendor_concentration | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:alternative_count |
| vendor_sla_tracking | tenant | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:breach_count |
| workflow_scheduled_jobs | public | 2NF | ✓ | – | ✗ | ✓ | ✓ | ✓ | 3NF:denorm-counter:trigger_count |
| workflow_templates | public | 2NF | ✓ | – | ✗ | ? | ✗ | ✓ | 3NF:transitive:template_id+template_code |
| agent_performance | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:input_summary,output_summary |
| ai_impact_assessments | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:sections_json,recommendations_json,classification_json |
| analytics_widgets | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:query_definition,position |
| attestation_campaigns | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✗ | 4NF:multiple-independent-array-or-jsonb:scope_config,reminder_config |
| attestation_templates | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:content,question_set,scoring_config |
| audit_log_archive | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:before_state,after_state |
| audit_logs | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:before_state,after_state |
| benchmark_datasets | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:raw_data,processed_data,refresh_config |
| briefings | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:content,audience |
| config_audit_logs | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:old_value,new_value |
| dashboard_widgets | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:position,size,data_source |
| dora_major_incidents | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:ict_assets_affected,impact_assessment |
| editor_widgets | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:data_config,display_config |
| evidence_collection_rules | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:source_config,notification_config |
| export_jobs | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:payload,result_data |
| governance_raci_matrix | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:consulted,informed |
| incident_audit_log | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:before_state,after_state |
| mobile_offline_sync_queue | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✗ | 4NF:multiple-independent-array-or-jsonb:payload,conflict_resolution |
| module_config_audit | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:old_value,new_value |
| onboarding_inference_items | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:item_metadata,user_override |
| pending_workflow_tasks | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:task_payload,outcome |
| platform_audit_logs | public | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:before_state,after_state |
| playbooks_step_actions | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✗ | 4NF:multiple-independent-array-or-jsonb:input_data,output_data |
| provisioning_step_runs | public | BCNF | ✓ | ? | ✓ | ✓ | ✗ | ✗ | 4NF:multiple-independent-array-or-jsonb:output,error |
| risk_scoring_models | tenant | BCNF | ✓ | – | ✓ | ✓ | ✗ | ✓ | 4NF:multiple-independent-array-or-jsonb:dimensions,thresholds,zone_definitions |
| action_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| action_register | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| agent_sod_policies | tenant | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:proposer_type:4-values |
| ai_activity_alerts | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:severity:3-values |
| ai_model_lifecycle | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:current_state:6-values |
| ai_system_registry | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:risk_level:4-values |
| alert_definitions | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:severity:5-values |
| analytics_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| approval_requests | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| approval_steps_log | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:action:5-values |
| asset_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| attestation_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| attestation_records | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| attestation_responses | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:decision:3-values |
| audit_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| audit_capa | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:capa_type:2-values |
| authorization_audit_log | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:decision:2-values |
| bcp_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| benchmarks_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| blockers | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:severity:5-values |
| board_decisions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| compliance_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| control_deficiencies | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:severity:4-values |
| control_effectiveness_assessments | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:assessment_type:2-values |
| control_test_schedules | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:frequency:5-values |
| controls_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| controls_deficiencies | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:deficiency_type:3-values |
| crosswalk_mappings | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:relationship:4-values |
| csa_responses | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:effectiveness_rating:4-values |
| dashboard_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| dashboard_editor_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| dora_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| evidence_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| exception_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| exception_requests | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:6-values |
| executive_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| executive_kri_alerts | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:alert_level:3-values |
| feedback | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:feedback_type:3-values |
| fitch_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| fitch_mappings | tenant | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:risk_level:5-values |
| fitch_ratings | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:outlook:4-values |
| governance_ai_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| governance_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| governance_os_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| grc_query_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| inbox_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| inbox_extended_items | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| incident_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| incident_capas | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:action_type:2-values |
| incident_notifications_log | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:notification_type:8-values |
| incident_risk_links | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:link_type:4-values |
| incident_taxonomy | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:node_type:4-values |
| incident_trend_cache | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:granularity:5-values |
| integrations_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| integrations_sync_log | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:direction:3-values |
| issues_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| issues_register | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| journey_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| ksa_regulatory_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| local_knowledge_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| lookup_cbb_categories | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:category_type:2-values |
| lookup_cbuae_categories | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:entity_type:5-values |
| lookup_dfsa_licenses | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:license_category:5-values |
| lookup_identity_providers | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:provider_type:4-values |
| lookup_nca_sectors | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:criticality_level:3-values |
| lookup_ncec_sectors | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:criticality:3-values |
| lookup_risk_frameworks | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:framework_type:4-values |
| lookup_siem_providers | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:deployment_type:3-values |
| lookup_tra_licenses | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:service_type:4-values |
| lookup_uae_free_zones | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:emirate:7-values |
| mcp_audit_log | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:actor_type:4-values |
| mcp_sessions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:actor_type:4-values |
| mobile_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| mobile_device_registrations | tenant | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:platform:3-values |
| mobile_push_notifications | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| notification_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| onboarding_phases | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| onboarding_stages | public | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| operating_cockpit_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| org_pack_template_sod_rules | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:conflict_level:2-values |
| org_pack_templates | public | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:size:3-values |
| pir_sign_offs | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:decision:4-values |
| playbooks_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| policy_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| portals_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| privacy_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| privacy_dsar_requests | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:request_type:6-values |
| proactive_leadership_action_items | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| proactive_leadership_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| proactive_leadership_initiatives | tenant | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:priority:4-values |
| qiyas_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| records_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| records_retention_policies | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:action_on_expiry:3-values |
| recovery_actions | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:action_type:6-values |
| regulatory_mappings | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:compliance_status:5-values |
| remediation_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| reporting_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| risk_assessment_items | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| risk_assessment_reviews | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:decision:3-values |
| risk_campaigns | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:campaign_type:3-values |
| risk_indicator_templates | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:indicator_type:3-values |
| risk_scenario_reviews | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:decision:3-values |
| risk_treatment_reviews | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:decision:3-values |
| secret_references | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:source:3-values |
| session_stages | public | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| slo_definitions | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:comparison_operator:4-values |
| sso_providers | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:protocol:2-values |
| startup_checklist | public | 4NF | ✓ | – | ✓ | ? | ✓ | ✗ | DKNF:check-in-list-on-text:priority:4-values |
| team_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| team_raci_assignments | public | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:raci_role:4-values |
| training_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| training_assignments | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:5-values |
| vendor_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| widgets_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| workflow_ai_suggestions | tenant | 4NF | ✓ | – | ✓ | ✓ | ✓ | ✗ | DKNF:check-in-list-on-text:status:4-values |
| access_review_campaigns | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| access_snapshots | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_dependencies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_plans | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_reminders | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| action_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| actor_role_assignments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| actors | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agent_monitoring_targets | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| agent_priority_weights | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_engine_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| agrc_tasks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_alert_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_governance_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_prompt_registry | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| ai_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_suggestion_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ai_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| alert_handler_registry | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_comparative_data | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_dashboards | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_datasets | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_drill_downs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_exports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_insights | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_prediction_models | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_sharing_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_trends | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| analytics_widget_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| answers | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| approval_matrix_rules | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| approval_matrix_rules_template | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| assessments | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| asset_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_classification_scheme | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| asset_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_compliance_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_dependencies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_inventory | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_lifecycle | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_maintenance | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_ownership_matrix | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| asset_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_risk_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_risk_links | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| asset_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| asset_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| assets | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| attestation_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_budget | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_checklists | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_committees | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_engagements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_field_work | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_plan | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_plans | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_qa_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_quality_review | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_recommendations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_resources | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_response_tracking | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_retention_policies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_team_assignments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_tests | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_time_tracking | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_tracking | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_trail_global | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| audit_universe | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_working_papers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| audit_workpapers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| authority_matrix | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_activation_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_awareness_training | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_bia | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_call_trees | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_contacts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_crisis_communications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_dependencies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_distribution | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_impacts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_maintenance_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_plan_details | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_plans | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_recovery_procedures | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_resources | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_rto_rpo_defaults | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| bcp_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_sites | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_teams | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_testing_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_tests | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| bcp_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmark_comparisons | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmark_profiles | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| benchmarks_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| case_incidents | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| cases | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| compliance_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_audit_trail | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_calendar_events | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_certification | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_controls | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_controls_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_evidence_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_evidence_ops | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_exceptions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_frameworks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_monitoring | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_obligations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_posture_scores | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_posture_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_programs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_review_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_scope | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_scoring_policies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| compliance_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| component_registry | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| config_center_audit_log | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| config_locks | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| config_runtime_overrides | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| config_values | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| connector_configs | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| control_evidence_requirements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| control_scope_tags | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| controls_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_automation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_deficiency_tracking | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_design_effectiveness | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_effectiveness | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_exceptions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_frameworks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_library | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_monitoring | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_monitoring_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_operating_effectiveness | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_ownership | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_remediation_plans | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_risk_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_samples | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_self_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| controls_walkthroughs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_custom_views | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_data_cache | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| dashboard_editor_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_settings | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| dashboard_editor_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_editor_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_interactions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_layouts | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| dashboard_mobile_config | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_navigation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_permissions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_personalization | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_refresh_rates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_registry | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| dashboard_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_sharing | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_themes | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_user_preferences | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| dashboard_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_widget_library | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dashboard_widget_registry | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| dashboards | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| default_navigation_items | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| delegations | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| departments | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_backup_policies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_information_register | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_testing_program | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_third_party_ict | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dora_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dos_handover_locks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dos_handover_risks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dos_release_approvals | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| dos_verification_checks | public | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| dos_verification_runs | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| email_verification_tokens | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| enterprise_user_role_assignments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_automated_collection | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_catalog | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_collection | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_control_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_expiration_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_freshness | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_metadata | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_requests | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_reviewers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_stakeholders | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_storage_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_validation_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| evidence_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_monitoring | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_renewals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_risk_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| exception_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| executive_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| feature_flag_overrides | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| feature_flags | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| file_storage | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| findings | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| fitch_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| fitch_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| framework_registry | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| frameworks | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| functional_roles | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| governance_acknowledgements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_recommendations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_ai_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_archives | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_attendees | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_charters | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_committees | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_compliance_map | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_decisions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_documents | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_escalation_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_folders | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_mandates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_memberships | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_minutes | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_objectives | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_os_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_policies_link | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_reporting | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_responsibilities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_review_schedule | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| governance_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_frameworks | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| grc_query_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_query_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| grc_sector_framework_matrix | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| grc_sector_groups | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| inbox_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_archive | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_delegation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_filters | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_items | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_mentions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_notifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_priority_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_reminders | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inbox_worklists | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_assets | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| incident_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_automated_triggers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_communication_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_escalation_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_escalations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_evidence_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_impacts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_incidents | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_lessons | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_lessons_learned | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_near_misses | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_notifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_pir_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_policies | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| incident_regulatory_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_reporting_config | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_responders | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_response_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_responses | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_root_cause_analysis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_root_causes | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_severity_matrix | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| incident_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_timeline | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_timeline_events | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_triage_decisions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_updates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| incident_vendors | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| incident_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| inferred_facts | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| integration_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_connectors | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_credentials | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_documentation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_errors | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_events | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_field_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_health_checks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_rate_limits | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_staging_tables | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_sync_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_sync_status | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_transforms | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| integrations_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_escalation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_impact_assessment | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_relationships | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_resolution_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| issues_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| job_executions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| job_registry | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_checkpoints | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| journey_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_ai_suggestions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_distribution | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_experts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_faq_sets | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_glossary | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_media_library | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_ratings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_search_index | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_translations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| knowledge_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| kri_breach_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| kri_data_points | tenant | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| ksa_regulatory_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| ksa_regulatory_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lifecycle_auth_log_template | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lifecycle_checkpoints | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| local_knowledge_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| login_attempts | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_cbe_categories | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_cbk_licenses | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_cbo_licenses | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_cities | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_cloud_regions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_compliance_frameworks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_countries | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_employee_ranges | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_frameworks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_grc_role_staffing | public | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| lookup_idsca_levels | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_iso_cert_bodies | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_languages | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_org_types | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_pdpl_scopes | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_qcb_categories | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_sama_license_types | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_sama_tiers | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_sub_sectors | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| lookup_tables | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_resources | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| mcp_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mcp_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_sessions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| mobile_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| module_assignments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| module_config | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| module_dependencies | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| module_entitlement_audit | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| module_health_events | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| module_registry | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| module_sla_defaults | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| module_workflow_registry | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| navigation_registry | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| notification_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_blacklists | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_channels | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_delivery_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_escalations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_preferences | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_priority_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_providers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_retry_queue | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_subscriptions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_suppression_list | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_triggers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notification_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notifications | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| notifications_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| obligations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_answers | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| onboarding_framework_rules | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_handoff_agent_findings | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_handoff_evidence_requests | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_handoff_invitations | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| onboarding_inference_feedback | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_journeys | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_module_rules | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_persona_rules | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| onboarding_sla_config | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| operating_cockpit_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_departments | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_permissions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_profiles | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_role_permissions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_roles | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_sections | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_teams | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| org_pack_template_workflows | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| pack_modules | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| packs_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| password_reset_tokens | public | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| pdpl_consents | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| permissions | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| person_profiles | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| plan_item_instances | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| platform_operation_config | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| playbooks_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_acknowledgements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_attestations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_audit_trail | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_distribution_lists | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_distribution_tracking | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_documents | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_endorsements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_exceptions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_framework_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_library | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_obligations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_portal_config | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_renewals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_retirements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_review_cycles | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| policy_versions_meta | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_access_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_branding | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| portals_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_pages | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| portals_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| positions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_assessments | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_audits | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_breach_notifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_budgets | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| privacy_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_consent_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_controls | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_cookies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_data_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_data_registers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_data_subject_requests | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_data_transfers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_dpia | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_dpias | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_impact_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_notices | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_pia_results | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_policies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_retention_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_third_party_transfers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_training | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| privacy_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_scorecards | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| proactive_leadership_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| processed_events | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| product_licenses | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| product_modules | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| product_packs | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| product_registry | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| provisioning_events | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| provisioning_idempotency | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| provisioning_telemetry | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_benchmark_profiles | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| qiyas_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_maturity_dimensions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_models | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| qiyas_peer_benchmarks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_rating_scales | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| qiyas_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_scoring_methods | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| qiyas_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| qiyas_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| realtime_event_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| recommendations | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_legal_holds | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_lifecycle | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| records_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| refresh_tokens | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| register_idempotency | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| regulatory_controls | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| regulatory_frameworks | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| reliability_dead_letter | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_actions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_effectiveness | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_plans | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_tracking | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| remediation_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_ad_hoc_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_archival_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_branding | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_bursting_config | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_delivery_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_distribution | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_distributions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_exports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_formats | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_layout_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_parameters | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_recipients | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_scheduled_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_subscriptions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| reporting_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| retired_entities | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| risk_aggregation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_ai_suggestions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_appetite_statements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_assessment_responses | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_asset_links | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| risk_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_compliance_links | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| risk_control_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_correlations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_dashboard_cache | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_dependencies | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_events | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_evidence_links | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| risk_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_heat_map_config | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_impact_scales | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_indicators | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_indicators_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_kris | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_likelihood_scales | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_models | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_owners | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_pair_reviews | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| risk_peer_reviews | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| risk_policy_links | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| risk_registry | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_reporting_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_scenarios_impact | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_simulations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_status_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_taxonomy | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_tolerance | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_tolerance_bands | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_treatment_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_treatment_plans | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_treatment_progress | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_treatments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_velocity_scales | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_vendor_links | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| risk_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| risk_watchers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| role_permission_map | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| role_permissions | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| roles | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| runtime_config | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| runtime_config_history | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| saved_views | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| schema_migrations | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| scores | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sector_isic_map | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sessions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sign_off_authorities_template | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sla_config | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| slo_current_values | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sod_conflict_matrix | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sod_rules | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| sod_waivers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| sso_role_mappings | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| subscriptions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| system_events | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_availability | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_capacity | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_certifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_departments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_escalation_paths | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| team_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_growth_plans | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_leave_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_members | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| team_mentorship_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_org_chart | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_performance_profiles | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_positions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_raci_matrix | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_reporting_lines | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_resource_allocation | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_roles | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_skill_gap_analysis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_skills | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_time_zones | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_training_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| team_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| teams | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| tenant_config_versions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| tenant_entitlement_profile | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| tenant_feature_flag_overrides | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| tenant_memberships | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| tenant_migrations | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| tenant_module_entitlement_registry | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| tenant_nudges | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| tenant_product_activation | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| tenant_settings | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| tenant_status_transitions | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| tenant_user_memberships | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| token_blacklist | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_certifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_courses | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_enrollments | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_records | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| training_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| translations | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| ui_configs | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| unresolved_risks | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| user_access_profiles | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| user_mfa | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| user_role_assignments | public | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| user_roles | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| user_view_preferences | public | DKNF | ✓ | ? | ✓ | ✓ | ✓ | ✓ |  |
| vendor_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_compliance | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_contacts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_contracts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_documents | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_engagements | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_fourth_party | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_lifecycle_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_notifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_offboarding | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_onboarding | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_performance | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_profiles | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_questionnaire_bank | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_renewals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_scorecards | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_sla_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_spend_analysis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_termination | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendor_tier_config | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| vendor_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vendors | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| vulnerabilities | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| vulnerability_findings_map | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_activities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_alerts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_approvals | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_assessments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_categories | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_configs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_data_cache | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_entities | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_evidence | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_feedback | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_findings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_instances | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_issues | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_items | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_links | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_members | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_registry | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| widgets_reports | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_reviews | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_risks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_schedules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_snapshots | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_tasks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_templates | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| widgets_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| work_items | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_actions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_ai_notes | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_attachments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_automation_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_chain_definitions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_chains | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_change_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_comments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_conditions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_definitions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_designer_layouts | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_error_handling | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_escalations | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_event_log | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_external_mappings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_history | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_hooks | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_instances | tenant | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| workflow_kill_switches | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_kpis | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_metrics | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_notifications | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_routing_logic | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_schedules | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_settings | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_simulation_logs | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_state_machine | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_steps | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_tags | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_task_assignments | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_tasks | unknown | DKNF | ✓ | – | ✓ | – | ✓ | ✓ |  |
| workflow_template_library | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_transitions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_triggers | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_validation_rules | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_variable_mapping | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflow_versions | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workflows | tenant | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workspace_config | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
| workspace_profile | tenant | DKNF | ✓ | – | ✓ | ? | ✓ | ✓ |  |
| workspaces | public | DKNF | ✓ | – | ✓ | ✓ | ✓ | ✓ |  |
