# Module: `governance`

**Owner service:** `governance-policy-service` -- **Tables:** 86 -- **Has-data:** 6 -- **Schema-only:** 80

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `approved_pqc_algorithms` | 13 | Governance -- Approved Pqc Algorithms | N | ✓ |
| 2 | `authority_matrix` | 18 | Governance -- RACI/permission matrix (Authority Matrix) | T |  |
| 3 | `board_attention_items` | 13 | Governance -- Board Attention Items | N |  |
| 4 | `board_pack_items` | 9 | Governance -- Board Pack Items | N |  |
| 5 | `board_packs` | 13 | Governance -- Board Packs | N |  |
| 6 | `change_management_records` | 20 | Governance -- Change Management Records | N |  |
| 7 | `committee_visibility_thresholds` | 9 | Governance -- Committee Visibility: Threshold definitions | P |  |
| 8 | `control_exceptions` | 17 | Governance -- Control record (Control Exceptions) | T |  |
| 9 | `escalation_thresholds` | 4 | Governance -- Escalation: Threshold definitions | P |  |
| 10 | `ethics_actions` | 13 | Governance -- Ethics: Action/operation catalog | P |  |
| 11 | `ethics_reports` | 17 | Governance -- Ethics Reports | N |  |
| 12 | `evidence_actions` | 17 | Governance -- Evidence: Action/operation catalog | P |  |
| 13 | `evidence_owners` | 10 | Governance -- Evidence: Ownership assignment | P |  |
| 14 | `evidence_sector_mapping` | 7 | Governance -- Evidence Sector: Cross-entity mapping | P | ✓ |
| 15 | `governance_ack_campaigns` | 7 | Governance -- Campaign record (Governance Ack Campaigns) | T |  |
| 16 | `governance_action_items` | 18 | Governance -- Governance Action Items | N |  |
| 17 | `governance_action_updates` | 10 | Governance -- Governance Action Updates | N |  |
| 18 | `governance_agenda_items` | 15 | Governance -- Governance Agenda Items | N |  |
| 19 | `governance_authority_levels` | 8 | Governance -- Governance Authority Levels | N |  |
| 20 | `governance_auto_fire_log` | 9 | Governance -- Governance Auto Fire: Activity/audit log records | P |  |
| 21 | `governance_bodies` | 21 | Governance -- Governance Bodies | N |  |
| 22 | `governance_charters` | 22 | Governance -- Governance Charters | N |  |
| 23 | `governance_committee_members` | 14 | Governance -- Governance Committee: Member records | P |  |
| 24 | `governance_compensating_controls` | 10 | Governance -- Control record (Governance Compensating Controls) | T |  |
| 25 | `governance_constitution` | 7 | Governance -- Governance Constitution | N |  |
| 26 | `governance_decision_votes` | 11 | Governance -- Decision record (Governance Decision Votes) | T |  |
| 27 | `governance_decisions` | 14 | Governance -- Decision record (Governance Decisions) | T |  |
| 28 | `governance_delegations` | 21 | Governance -- Governance Delegations | N |  |
| 29 | `governance_domains` | 14 | Governance -- Governance Domains | N |  |
| 30 | `governance_enforcement_log` | 13 | Governance -- Governance Enforcement: Activity/audit log records | P |  |
| 31 | `governance_escalation_events` | 11 | Governance -- Governance Escalation: Domain event records | P |  |
| 32 | `governance_executive_summaries` | 20 | Governance -- Governance Executive: Aggregated summary records | P |  |
| 33 | `governance_health_scores` | 16 | Governance -- Governance Health Scores | N |  |
| 34 | `governance_health_thresholds` | 6 | Governance -- Governance Health: Threshold definitions | P |  |
| 35 | `governance_interpreted_issues` | 16 | Governance -- Governance Interpreted Issues | N | ✓ |
| 36 | `governance_mandate_sources` | 6 | Governance -- Governance Mandate Sources | N |  |
| 37 | `governance_mandates` | 17 | Governance -- Governance Mandates | N |  |
| 38 | `governance_meeting_attendees` | 11 | Governance -- Governance Meeting Attendees | N |  |
| 39 | `governance_meetings` | 14 | Governance -- Governance Meetings | N |  |
| 40 | `governance_objectives` | 16 | Governance -- Governance Objectives | N |  |
| 41 | `governance_obligation_control_links` | 5 | Governance -- Governance Obligation Control: Cross-table link records | P |  |
| 42 | `governance_obligation_due_dates` | 6 | Governance -- Governance Obligation Due Dates | N |  |
| 43 | `governance_obligation_evidence_links` | 5 | Governance -- Governance Obligation Evidence: Cross-table link records | P |  |
| 44 | `governance_obligation_exemptions` | 7 | Governance -- Governance Obligation Exemptions | N |  |
| 45 | `governance_obligations` | 15 | Governance -- Governance Obligations | N |  |
| 46 | `governance_policy_acknowledgements` | 11 | Governance -- Governance Policy: Acknowledgement records | P |  |
| 47 | `governance_policy_approvals` | 12 | Governance -- Approval record (Governance Policy Approvals) | T |  |
| 48 | `governance_policy_reviews` | 13 | Governance -- Policy record (Governance Policy Reviews) | T |  |
| 49 | `governance_policy_risk_links` | 9 | Governance -- Governance Policy Risk: Cross-table link records | P |  |
| 50 | `governance_policy_versions` | 10 | Governance -- Governance Policy: Versioned record history | P |  |
| 51 | `governance_procedure_versions` | 10 | Governance -- Governance Procedure: Versioned record history | P |  |
| 52 | `governance_procedures` | 22 | Governance -- Governance Procedures | N |  |
| 53 | `governance_raci_assignments` | 6 | Governance -- Governance Raci: Assignment mapping (X to Y) | P |  |
| 54 | `governance_raci_templates` | 10 | Governance -- Governance Raci: Template catalog | P |  |
| 55 | `governance_recommendations` | 14 | Governance -- Governance Recommendations | N | ✓ |
| 56 | `governance_registers` | 13 | Governance -- Governance Registers | N |  |
| 57 | `governance_reporting_lines` | 13 | Governance -- Governance Reporting Lines | N |  |
| 58 | `governance_responsibilities` | 10 | Governance -- Governance Responsibilities | N |  |
| 59 | `governance_responsibility_assignments` | 7 | Governance -- Governance Responsibility: Assignment mapping (X to Y) | P |  |
| 60 | `governance_risk_appetite` | 5 | Governance -- Risk record (Governance Risk Appetite) | T |  |
| 61 | `governance_score_explanations` | 11 | Governance -- Governance Score Explanations | N |  |
| 62 | `governance_signal_events` | 6 | Governance -- Governance Signal: Domain event records | P |  |
| 63 | `governance_signal_rules` | 9 | Governance -- Governance Signal: Rules/policy definitions | P |  |
| 64 | `governance_signals` | 17 | Governance -- Governance Signals | N | ✓ |
| 65 | `grc_plans` | 10 | Governance -- Grc Plans | N |  |
| 66 | `initiative_definitions` | 24 | Governance -- Initiative: Definition catalog | P |  |
| 67 | `initiative_runs` | 21 | Governance -- Initiative: Execution run records | P |  |
| 68 | `legal_entities` | 11 | Governance -- Legal Entities | N |  |
| 69 | `mandate_sources` | 10 | Governance -- Mandate Sources | N |  |
| 70 | `mandates` | 15 | Governance -- Mandates | N |  |
| 71 | `milestone_instances` | 18 | Governance -- Milestone Instances | N |  |
| 72 | `obligation_control_mappings` | 8 | Governance -- Obligation Control: Cross-entity mapping | P |  |
| 73 | `obligation_policy_links` | 9 | Governance -- Obligation Policy: Cross-table link records | P |  |
| 74 | `outcome_links` | 10 | Governance -- Outcome: Cross-table link records | P |  |
| 75 | `project_assurance_links` | 9 | Governance -- Project Assurance: Cross-table link records | P |  |
| 76 | `project_deliverables` | 32 | Governance -- Project Deliverables | N |  |
| 77 | `project_exceptions` | 14 | Governance -- Exception record (Project Exceptions) | T |  |
| 78 | `project_gate_reviews` | 10 | Governance -- Project Gate Reviews | N |  |
| 79 | `project_milestones` | 12 | Governance -- Project Milestones | N |  |
| 80 | `raci_assignments` | 15 | Governance -- Raci: Assignment mapping (X to Y) | P |  |
| 81 | `raci_templates` | 13 | Governance -- Raci: Template catalog | P |  |
| 82 | `resource_allocations` | 13 | Governance -- Location record (Resource Allocations) | T |  |
| 83 | `responsibilities` | 13 | Governance -- Responsibilities | N |  |
| 84 | `responsibility_assignments` | 13 | Governance -- Responsibility: Assignment mapping (X to Y) | P |  |
| 85 | `responsibility_suggestions` | 14 | Governance -- Responsibility Suggestions | N |  |
| 86 | `team_raci_assignments` | 14 | Governance -- Team Raci: Assignment mapping (X to Y) | P | ✓ |
