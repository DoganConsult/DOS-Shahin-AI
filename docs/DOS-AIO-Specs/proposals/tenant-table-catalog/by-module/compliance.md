# Module: `compliance`

**Owner service:** `compliance-controls-service` -- **Tables:** 94 -- **Has-data:** 11 -- **Schema-only:** 83

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `assessment_responses` | 7 | Compliance -- Assessment: Response records (questionnaire/survey/assessment) | P |  |
| 2 | `assessments` | 30 | Compliance -- Assessments | N |  |
| 3 | `ccm_cloud_mappings` | 6 | Compliance -- Ccm Cloud: Cross-entity mapping | P |  |
| 4 | `ccm_cycle_log` | 7 | Compliance -- Ccm Cycle: Activity/audit log records | P |  |
| 5 | `ccm_results` | 7 | Compliance -- Ccm Results | N |  |
| 6 | `change_tasks` | 16 | Compliance -- Change: Task records | P |  |
| 7 | `change_triage_decisions` | 7 | Compliance -- Decision record (Change Triage Decisions) | T |  |
| 8 | `compliance_activity_log` | 8 | Compliance -- Compliance Activity: Activity/audit log records | P |  |
| 9 | `compliance_assertion_evidence` | 7 | Compliance -- Compliance Assertion: Evidence records | P |  |
| 10 | `compliance_assertions` | 11 | Compliance -- Compliance record (Compliance Assertions) | T |  |
| 11 | `compliance_assessments` | 14 | Compliance -- Compliance record (Compliance Assessments) | T | ✓ |
| 12 | `compliance_commitments` | 10 | Compliance -- Compliance record (Compliance Commitments) | T |  |
| 13 | `compliance_drift_baselines` | 6 | Compliance -- Compliance record (Compliance Drift Baselines) | T |  |
| 14 | `compliance_drift_events` | 18 | Compliance -- Compliance Drift: Domain event records | P |  |
| 15 | `compliance_drift_rules` | 19 | Compliance -- Compliance Drift: Rules/policy definitions | P | ✓ |
| 16 | `compliance_findings` | 15 | Compliance -- Compliance: Finding records | P |  |
| 17 | `compliance_frameworks` | 9 | Compliance -- Framework definition (Compliance Frameworks) | T | ✓ |
| 18 | `compliance_gap_snapshots` | 13 | Compliance -- Compliance Gap: Point-in-time snapshots | P |  |
| 19 | `compliance_gaps` | 23 | Compliance -- Compliance record (Compliance Gaps) | T |  |
| 20 | `compliance_obligations` | 20 | Compliance -- Compliance record (Compliance Obligations) | T |  |
| 21 | `compliance_overview_snapshots` | 4 | Compliance -- Compliance Overview: Point-in-time snapshots | P |  |
| 22 | `compliance_reviews` | 10 | Compliance -- Compliance record (Compliance Reviews) | T |  |
| 23 | `control_actions` | 11 | Compliance -- Control: Action/operation catalog | P |  |
| 24 | `control_categories` | 10 | Compliance -- Control: Category taxonomy | P |  |
| 25 | `control_certification_campaigns` | 10 | Compliance -- Campaign record (Control Certification Campaigns) | T |  |
| 26 | `control_certification_requests` | 10 | Compliance -- Control record (Control Certification Requests) | T |  |
| 27 | `control_certification_responses` | 10 | Compliance -- Control Certification: Response records (questionnaire/survey/assessment) | P |  |
| 28 | `control_closure_reviews` | 7 | Compliance -- Control record (Control Closure Reviews) | T |  |
| 29 | `control_dashboard_cache` | 6 | Compliance -- Control Dashboard: Cached values | P |  |
| 30 | `control_dependencies` | 8 | Compliance -- Control: Dependency mapping | P |  |
| 31 | `control_domains` | 6 | Control domain groupings | R | ✓ |
| 32 | `control_effectiveness_log` | 8 | Compliance -- Control Effectiveness: Activity/audit log records | P |  |
| 33 | `control_effectiveness_scores` | 11 | Compliance -- Control record (Control Effectiveness Scores) | T |  |
| 34 | `control_evidence_requirements` | 11 | Compliance -- Control record (Control Evidence Requirements) | T |  |
| 35 | `control_failures` | 11 | Compliance -- Control record (Control Failures) | T |  |
| 36 | `control_framework_mappings` | 9 | Compliance -- Control Framework: Cross-entity mapping | P |  |
| 37 | `control_health_snapshots` | 8 | Compliance -- Control Health: Point-in-time snapshots | P |  |
| 38 | `control_issues` | 13 | Compliance -- Control record (Control Issues) | T |  |
| 39 | `control_mappings` | 8 | Compliance -- Control: Cross-entity mapping | P |  |
| 40 | `control_monitoring_alerts` | 11 | Compliance -- Control Monitoring: Alert records | P |  |
| 41 | `control_monitoring_rules` | 14 | Compliance -- Control Monitoring: Rules/policy definitions | P |  |
| 42 | `control_monitoring_signals` | 7 | Compliance -- Control record (Control Monitoring Signals) | T |  |
| 43 | `control_objectives` | 9 | Compliance -- Control record (Control Objectives) | T |  |
| 44 | `control_obligation_mappings` | 8 | Compliance -- Control Obligation: Cross-entity mapping | P |  |
| 45 | `control_operating_tests` | 12 | Compliance -- Control record (Control Operating Tests) | T |  |
| 46 | `control_owners` | 9 | Compliance -- Control: Ownership assignment | P |  |
| 47 | `control_policy_links` | 7 | Compliance -- Control Policy: Cross-table link records | P |  |
| 48 | `control_remediation_actions` | 12 | Compliance -- Control Remediation: Action/operation catalog | P |  |
| 49 | `control_retests` | 10 | Compliance -- Control record (Control Retests) | T |  |
| 50 | `control_schedules` | 11 | Compliance -- Control record (Control Schedules) | T |  |
| 51 | `control_scope_links` | 7 | Compliance -- Control Scope: Cross-table link records | P |  |
| 52 | `control_status_history` | 9 | Compliance -- Control Status: Historical change records | P |  |
| 53 | `control_tags` | 6 | Compliance -- Control record (Control Tags) | T |  |
| 54 | `control_team_distribution` | 7 | Compliance -- Control record (Control Team Distribution) | T | ✓ |
| 55 | `control_test_procedures` | 24 | Compliance -- Control record (Control Test Procedures) | T |  |
| 56 | `control_test_results` | 18 | Compliance -- Control record (Control Test Results) | T |  |
| 57 | `control_tests` | 8 | Compliance -- Control record (Control Tests) | T |  |
| 58 | `control_training_mappings` | 10 | Compliance -- Control Training: Cross-entity mapping | P |  |
| 59 | `control_workflow_links` | 8 | Compliance -- Control Workflow: Cross-table link records | P |  |
| 60 | `cross_border_transfer_rules` | 12 | Compliance -- Cross Border Transfer: Rules/policy definitions | P | ✓ |
| 61 | `crosswalk_mappings` | 6 | Compliance -- Crosswalk: Cross-entity mapping | P |  |
| 62 | `csa_questionnaires` | 14 | Compliance -- Csa Questionnaires | N |  |
| 63 | `csa_responses` | 17 | Compliance -- Csa: Response records (questionnaire/survey/assessment) | P |  |
| 64 | `endpoint_config` | 16 | Compliance -- Endpoint: Configuration values | P |  |
| 65 | `esg_categories` | 9 | Compliance -- Esg: Category taxonomy | P |  |
| 66 | `esg_metrics` | 16 | Compliance -- Esg: Metric data points | P |  |
| 67 | `framework_applicability_rules` | 11 | Compliance -- Framework Applicability: Rules/policy definitions | P |  |
| 68 | `framework_cross_mappings` | 9 | Compliance -- Framework Cross: Cross-entity mapping | P | ✓ |
| 69 | `framework_domains` | 12 | Compliance -- Framework definition (Framework Domains) | T |  |
| 70 | `framework_module_map` | 5 | Compliance -- Framework definition (Framework Module Map) | T | ✓ |
| 71 | `framework_requirement_versions` | 11 | Compliance -- Framework Requirement: Versioned record history | P |  |
| 72 | `grc_maturity_sync` | 11 | Compliance -- Grc Maturity Sync | N |  |
| 73 | `grc_qiyas_control_feedback` | 11 | Compliance -- Control record (Grc Qiyas Control Feedback) | T |  |
| 74 | `instrument_versions` | 14 | Compliance -- Instrument: Versioned record history | P |  |
| 75 | `maturity_assessments` | 22 | Compliance -- Maturity Assessments | N | ✓ |
| 76 | `maturity_scores` | 7 | Compliance -- Maturity Scores | N |  |
| 77 | `obligation_applicability_rules` | 9 | Compliance -- Obligation Applicability: Rules/policy definitions | P |  |
| 78 | `obligation_assignments` | 11 | Compliance -- Obligation: Assignment mapping (X to Y) | P |  |
| 79 | `obligation_control_links` | 8 | Compliance -- Obligation Control: Cross-table link records | P |  |
| 80 | `obligation_due_dates` | 11 | Compliance -- Obligation Due Dates | N |  |
| 81 | `obligation_evidence_links` | 8 | Compliance -- Obligation Evidence: Cross-table link records | P |  |
| 82 | `obligation_exemptions` | 12 | Compliance -- Obligation Exemptions | N |  |
| 83 | `obligation_scopes` | 9 | Compliance -- Obligation Scopes | N |  |
| 84 | `obligation_status_history` | 9 | Compliance -- Obligation Status: Historical change records | P |  |
| 85 | `obligation_templates` | 14 | Compliance -- Obligation: Template catalog | P |  |
| 86 | `obligation_types` | 6 | Compliance -- Obligation Types | N | ✓ |
| 87 | `obligation_versions` | 9 | Compliance -- Obligation: Versioned record history | P |  |
| 88 | `procedures` | 22 | Compliance -- Procedures | N |  |
| 89 | `rcsa_campaigns` | 11 | Compliance -- Campaign record (Rcsa Campaigns) | T |  |
| 90 | `rcsa_responses` | 14 | Compliance -- Rcsa: Response records (questionnaire/survey/assessment) | P |  |
| 91 | `reference_categories` | 13 | Compliance -- Reference: Category taxonomy | P |  |
| 92 | `requirements` | 13 | Compliance -- Requirements | N |  |
| 93 | `scoring_policies` | 8 | Compliance -- Scoring Policies | N | ✓ |
| 94 | `ucf_control_versions` | 13 | Compliance -- Ucf Control: Versioned record history | P |  |
