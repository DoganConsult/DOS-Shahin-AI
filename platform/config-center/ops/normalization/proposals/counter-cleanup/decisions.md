# Denormalized Counter Cleanup — Decision Matrix
Generated: 2026-04-20T06:00:39.230Z
Total counters: **38**

Policy codes: DROP (view-based) | TRIGGER (live) | NIGHTLY (scheduled reconcile) | KEEP (accept drift) | REVIEW

| Owner table | Counter column | Layer | Inferred child | FK column | Confidence | Policy | Rationale |
|---|---|---|---|---|---|---|---|
| agrc_metrics_snapshots | cycle_count | tenant | _(unknown)_ | — | low |  |  |
| agrc_metrics_snapshots | event_count | tenant | _(unknown)_ | — | low |  |  |
| audit_external | findings_count | tenant | _(unknown)_ | — | low |  |  |
| audit_repeat_findings | repeat_count | tenant | _(unknown)_ | — | low |  |  |
| breach_reporting_records | data_subjects_count | tenant | _(unknown)_ | — | low |  |  |
| dead_letter_queue | retry_count | public | _(unknown)_ | — | low |  |  |
| dora_resilience_tests | findings_count | tenant | _(unknown)_ | — | low |  |  |
| editor_templates | usage_count | tenant | _(unknown)_ | — | low |  |  |
| enforcement_runs | fail_count | public | _(unknown)_ | — | low |  |  |
| event_dead_letter_queue | retry_count | public | _(unknown)_ | — | low |  |  |
| grc_regulators | must_comply_count | tenant | _(unknown)_ | — | low |  |  |
| grc_regulators | own_frameworks_count | tenant | _(unknown)_ | — | low |  |  |
| incident_recurring_patterns | occurrence_count | tenant | _(unknown)_ | — | low |  |  |
| knowledge_embeddings | token_count | tenant | _(unknown)_ | — | low |  |  |
| knowledge_search_log | results_count | tenant | _(unknown)_ | — | low |  |  |
| onboarding_handoff_agent_runs | findings_count | public | _(unknown)_ | — | low |  |  |
| onboarding_handoff_agent_runs | proposed_actions_count | public | _(unknown)_ | — | low |  |  |
| onboarding_sessions | blockers_count | public | _(unknown)_ | — | low |  |  |
| permission_usage | usage_count | public | _(unknown)_ | — | low |  |  |
| policy_distribution | acknowledged_count | tenant | _(unknown)_ | — | low |  |  |
| provisioning_jobs | retry_count | public | _(unknown)_ | — | low |  |  |
| provisioning_steps | retry_count | public | _(unknown)_ | — | low |  |  |
| query_datasets | row_count | tenant | _(unknown)_ | — | low |  |  |
| query_history | row_count | tenant | _(unknown)_ | — | low |  |  |
| query_templates | usage_count | tenant | _(unknown)_ | — | low |  |  |
| regulatory_gap_analysis | compliant_count | tenant | _(unknown)_ | — | low |  |  |
| regulatory_gap_analysis | non_compliant_count | tenant | _(unknown)_ | — | low |  |  |
| regulatory_gap_analysis | partial_count | tenant | _(unknown)_ | — | low |  |  |
| reporting_data_extracts | row_count | tenant | _(unknown)_ | — | low |  |  |
| seed_history | row_count | public | _(unknown)_ | — | low |  |  |
| tenants | branch_count | public | _(unknown)_ | — | low |  |  |
| tenants | employee_count | public | _(unknown)_ | — | low |  |  |
| tenants | it_staff_count | public | _(unknown)_ | — | low |  |  |
| tenants | security_staff_count | public | _(unknown)_ | — | low |  |  |
| training_content_library | usage_count | tenant | _(unknown)_ | — | low |  |  |
| users | login_count | public | _(unknown)_ | — | low |  |  |
| vendor_concentration | alternative_count | tenant | _(unknown)_ | — | low |  |  |
| workflow_scheduled_jobs | trigger_count | public | _(unknown)_ | — | low |  |  |
