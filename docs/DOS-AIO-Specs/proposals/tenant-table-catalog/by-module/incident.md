# Module: `incident`

**Owner service:** `risk-incident-service` -- **Tables:** 29 -- **Has-data:** 3 -- **Schema-only:** 26

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `breach_reporting_records` | 24 | Incident -- Breach Reporting Records | N |  |
| 2 | `case_incidents` | 6 | Incident -- Incident record (Case Incidents) | T |  |
| 3 | `case_notes` | 10 | Incident -- Case Notes | N |  |
| 4 | `cases` | 20 | Incident -- Cases | N |  |
| 5 | `incident_assets` | 7 | Incident -- Asset record (Incident Assets) | T |  |
| 6 | `incident_audit_log` | 12 | Incident -- Incident Audit: Activity/audit log records | P |  |
| 7 | `incident_categories` | 9 | Incident categorization | R |  |
| 8 | `incident_evidence` | 12 | Incident -- Incident: Evidence records | P |  |
| 9 | `incident_impacts` | 16 | Incident -- Incident record (Incident Impacts) | T |  |
| 10 | `incident_lessons_learned` | 15 | Incident -- Incident record (Incident Lessons Learned) | T |  |
| 11 | `incident_notification_templates` | 10 | Incident -- Incident Notification: Template catalog | P |  |
| 12 | `incident_pir` | 28 | Incident -- Incident record (Incident Pir) | T |  |
| 13 | `incident_policies` | 6 | Incident -- Incident record (Incident Policies) | T |  |
| 14 | `incident_recurring_patterns` | 17 | Incident -- Incident record (Incident Recurring Patterns) | T |  |
| 15 | `incident_regulatory_notifications` | 24 | Incident -- Incident Regulatory: Notification queue/log | P |  |
| 16 | `incident_reportable_criteria` | 10 | Incident -- Incident record (Incident Reportable Criteria) | T | ✓ |
| 17 | `incident_response_actions` | 14 | Incident -- Incident Response: Action/operation catalog | P |  |
| 18 | `incident_response_teams` | 9 | Incident -- Incident record (Incident Response Teams) | T |  |
| 19 | `incident_risk_links` | 12 | Incident -- Incident Risk: Cross-table link records | P |  |
| 20 | `incident_root_causes` | 11 | Incident -- Incident record (Incident Root Causes) | T |  |
| 21 | `incident_severity_matrix` | 12 | Incident -- RACI/permission matrix (Incident Severity Matrix) | T |  |
| 22 | `incident_taxonomy` | 14 | Incident -- Incident record (Incident Taxonomy) | T | ✓ |
| 23 | `incident_team_distribution` | 7 | Incident -- Incident record (Incident Team Distribution) | T | ✓ |
| 24 | `incident_trend_cache` | 16 | Incident -- Incident Trend: Cached values | P |  |
| 25 | `incident_triage_decisions` | 14 | Incident -- Decision record (Incident Triage Decisions) | T |  |
| 26 | `incident_updates` | 10 | Incident -- Incident record (Incident Updates) | T |  |
| 27 | `incident_vendors` | 7 | Incident -- Vendor/third-party record (Incident Vendors) | T |  |
| 28 | `near_miss_reports` | 23 | Incident -- Near Miss Reports | N |  |
| 29 | `pir_sign_offs` | 9 | Incident -- Pir Sign Offs | N |  |
