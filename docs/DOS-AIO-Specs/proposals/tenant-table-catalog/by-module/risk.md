# Module: `risk`

**Owner service:** `risk-incident-service` -- **Tables:** 49 -- **Has-data:** 3 -- **Schema-only:** 46

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `kri_breach_log` | 13 | Risk -- Kri Breach: Activity/audit log records | P |  |
| 2 | `kri_data_points` | 9 | Risk -- Kri: Time-series data points | P |  |
| 3 | `kri_tracking` | 15 | Risk -- Kri Tracking | N |  |
| 4 | `kri_values` | 8 | Risk -- Kri Values | N |  |
| 5 | `mitigating_control_mappings` | 7 | Risk -- Mitigating Control: Cross-entity mapping | P |  |
| 6 | `model_inventory` | 19 | Risk -- Model Inventory | N |  |
| 7 | `model_risk_scores` | 11 | Risk -- Risk record (Model Risk Scores) | T |  |
| 8 | `model_validations` | 10 | Risk -- Model Validations | N |  |
| 9 | `object_mappings` | 6 | Risk -- Object: Cross-entity mapping | P |  |
| 10 | `preventive_control_mappings` | 7 | Risk -- Preventive Control: Cross-entity mapping | P |  |
| 11 | `risk_acceptance_log` | 14 | Risk -- Risk Acceptance: Activity/audit log records | P |  |
| 12 | `risk_assessment_items` | 9 | Risk -- Risk record (Risk Assessment Items) | T |  |
| 13 | `risk_assessment_responses` | 11 | Risk -- Risk Assessment: Response records (questionnaire/survey/assessment) | P |  |
| 14 | `risk_assessment_reviews` | 7 | Risk -- Risk record (Risk Assessment Reviews) | T |  |
| 15 | `risk_assessments` | 16 | Risk -- Risk record (Risk Assessments) | T |  |
| 16 | `risk_asset_links` | 7 | Risk -- Risk Asset: Cross-table link records | P |  |
| 17 | `risk_campaigns` | 11 | Risk -- Campaign record (Risk Campaigns) | T |  |
| 18 | `risk_categories` | 10 | Risk -- Risk: Category taxonomy | P | ✓ |
| 19 | `risk_compliance_links` | 7 | Risk -- Risk Compliance: Cross-table link records | P |  |
| 20 | `risk_consequences` | 11 | Risk -- Risk record (Risk Consequences) | T |  |
| 21 | `risk_dashboard_cache` | 4 | Risk -- Risk Dashboard: Cached values | P |  |
| 22 | `risk_dependencies` | 8 | Risk -- Risk: Dependency mapping | P |  |
| 23 | `risk_escalation_log` | 9 | Risk -- Risk Escalation: Activity/audit log records | P |  |
| 24 | `risk_evidence_links` | 7 | Risk -- Risk Evidence: Cross-table link records | P |  |
| 25 | `risk_fair_assessments` | 26 | Risk -- Risk record (Risk Fair Assessments) | T |  |
| 26 | `risk_impact_scales` | 11 | Risk -- Risk record (Risk Impact Scales) | T |  |
| 27 | `risk_indicator_templates` | 13 | Risk -- Risk Indicator: Template catalog | P |  |
| 28 | `risk_kris` | 22 | Risk -- Risk record (Risk Kris) | T |  |
| 29 | `risk_likelihood_scales` | 10 | Risk -- Risk record (Risk Likelihood Scales) | T |  |
| 30 | `risk_owners` | 9 | Risk -- Risk: Ownership assignment | P |  |
| 31 | `risk_policy_links` | 7 | Risk -- Risk Policy: Cross-table link records | P |  |
| 32 | `risk_review_log` | 9 | Risk -- Risk Review: Activity/audit log records | P |  |
| 33 | `risk_scenario_reviews` | 8 | Risk -- Risk record (Risk Scenario Reviews) | T |  |
| 34 | `risk_scenarios` | 16 | Risk -- Risk record (Risk Scenarios) | T |  |
| 35 | `risk_score_history` | 7 | Risk -- Risk Score: Historical change records | P |  |
| 36 | `risk_scoring_models` | 11 | Risk -- Risk record (Risk Scoring Models) | T | ✓ |
| 37 | `risk_sector_applicability` | 8 | Risk -- Risk record (Risk Sector Applicability) | T |  |
| 38 | `risk_status_history` | 11 | Risk -- Risk Status: Historical change records | P |  |
| 39 | `risk_taxonomy` | 9 | Risk -- Risk record (Risk Taxonomy) | T |  |
| 40 | `risk_team_distribution` | 7 | Risk -- Risk record (Risk Team Distribution) | T | ✓ |
| 41 | `risk_threats` | 10 | Risk -- Risk record (Risk Threats) | T |  |
| 42 | `risk_treatment_actions` | 12 | Risk -- Risk Treatment: Action/operation catalog | P |  |
| 43 | `risk_treatment_reviews` | 7 | Risk -- Risk record (Risk Treatment Reviews) | T |  |
| 44 | `risk_treatments` | 24 | Risk -- Risk record (Risk Treatments) | T |  |
| 45 | `risk_velocity_scales` | 10 | Risk -- Risk record (Risk Velocity Scales) | T |  |
| 46 | `risk_vendor_links` | 7 | Risk -- Risk Vendor: Cross-table link records | P |  |
| 47 | `risks` | 54 | Risk -- Risk record (Risks) | T |  |
| 48 | `vulnerabilities` | 21 | Risk -- Vulnerabilities | N |  |
| 49 | `vulnerability_findings_map` | 8 | Risk -- Finding record (Vulnerability Findings Map) | T |  |
