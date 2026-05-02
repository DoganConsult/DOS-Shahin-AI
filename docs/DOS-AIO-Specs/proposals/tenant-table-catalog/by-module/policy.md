# Module: `policy`

**Owner service:** `governance-policy-service` -- **Tables:** 29 -- **Has-data:** 5 -- **Schema-only:** 24

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `policy_assessment_history` | 9 | Policy -- Policy Assessment: Historical change records | P |  |
| 2 | `policy_categories` | 12 | Policy -- Policy: Category taxonomy | P | ✓ |
| 3 | `policy_control_links` | 9 | Policy -- Policy Control: Cross-table link records | P |  |
| 4 | `policy_control_mappings` | 6 | Policy -- Policy Control: Cross-entity mapping | P |  |
| 5 | `policy_dashboard_cache` | 5 | Policy -- Policy Dashboard: Cached values | P |  |
| 6 | `policy_delivery_records` | 14 | Policy -- Policy record (Policy Delivery Records) | T |  |
| 7 | `policy_drift_events` | 9 | Policy -- Policy Drift: Domain event records | P |  |
| 8 | `policy_drift_snapshots` | 3 | Policy -- Policy Drift: Point-in-time snapshots | P |  |
| 9 | `policy_exception_approvals` | 8 | Policy -- Approval record (Policy Exception Approvals) | T |  |
| 10 | `policy_exception_requests` | 22 | Policy -- Policy record (Policy Exception Requests) | T |  |
| 11 | `policy_gaps` | 7 | Policy -- Policy record (Policy Gaps) | T |  |
| 12 | `policy_guidance` | 14 | Policy -- Policy record (Policy Guidance) | T |  |
| 13 | `policy_issue_links` | 8 | Policy -- Policy Issue: Cross-table link records | P |  |
| 14 | `policy_kpi_values` | 12 | Policy -- Policy record (Policy Kpi Values) | T | ✓ |
| 15 | `policy_metrics` | 25 | Policy -- Policy: Metric data points | P |  |
| 16 | `policy_mom_records` | 21 | Policy -- Policy record (Policy Mom Records) | T |  |
| 17 | `policy_pack_catalog` | 7 | Policy -- Policy record (Policy Pack Catalog) | T | ✓ |
| 18 | `policy_pack_rules` | 7 | Policy -- Policy Pack: Rules/policy definitions | P | ✓ |
| 19 | `policy_process_actions` | 15 | Policy -- Policy Process: Action/operation catalog | P |  |
| 20 | `policy_publication_audiences` | 7 | Policy -- Policy record (Policy Publication Audiences) | T |  |
| 21 | `policy_publications` | 15 | Policy -- Policy: Published records | P |  |
| 22 | `policy_risk_links` | 9 | Policy -- Policy Risk: Cross-table link records | P |  |
| 23 | `policy_scores` | 6 | Policy -- Policy record (Policy Scores) | T |  |
| 24 | `policy_templates` | 20 | Policy -- Policy: Template catalog | P |  |
| 25 | `policy_version_diffs` | 9 | Policy -- Policy record (Policy Version Diffs) | T |  |
| 26 | `policy_versions` | 17 | Policy -- Policy: Versioned record history | P |  |
| 27 | `policy_workflow_tracker` | 10 | Policy -- Policy record (Policy Workflow Tracker) | T |  |
| 28 | `policy_workflows` | 37 | Policy -- Policy: Workflow definitions | P |  |
| 29 | `sod_rules` | 11 | Policy -- Sod: Rules/policy definitions | P | ✓ |
