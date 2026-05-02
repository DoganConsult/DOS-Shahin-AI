# Module: `evidence`

**Owner service:** `evidence-audit-reporting-service` -- **Tables:** 49 -- **Has-data:** 8 -- **Schema-only:** 41

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `artifacts` | 12 | Evidence -- Artifacts | N |  |
| 2 | `data_classifications` | 11 | Data classification levels | R |  |
| 3 | `digital_signatures` | 16 | Evidence -- Digital: Digital signatures | P |  |
| 4 | `evidence_activity_log` | 10 | Evidence -- Evidence Activity: Activity/audit log records | P |  |
| 5 | `evidence_admin_settings` | 6 | Evidence -- Evidence Admin: Configuration values | P | ✓ |
| 6 | `evidence_attachments` | 9 | Evidence -- Evidence: File/blob attachments | P |  |
| 7 | `evidence_attachments_config` | 6 | Evidence -- Evidence Attachments: Configuration values | P |  |
| 8 | `evidence_auto_collection` | 38 | Evidence -- Evidence Auto Collection | N | ✓ |
| 9 | `evidence_catalog` | 9 | Evidence -- Evidence Catalog | N |  |
| 10 | `evidence_collection_jobs` | 10 | Evidence -- Evidence Collection: Job records | P |  |
| 11 | `evidence_collection_log` | 22 | Evidence -- Evidence Collection: Activity/audit log records | P |  |
| 12 | `evidence_collection_rules` | 9 | Evidence -- Evidence Collection: Rules/policy definitions | P |  |
| 13 | `evidence_collection_runs` | 9 | Evidence -- Evidence Collection: Execution run records | P |  |
| 14 | `evidence_confidentiality_levels` | 6 | Evidence -- Evidence Confidentiality Levels | N | ✓ |
| 15 | `evidence_cross_validation` | 16 | Evidence -- Evidence Cross Validation | N |  |
| 16 | `evidence_dashboard_cache` | 5 | Evidence -- Evidence Dashboard: Cached values | P |  |
| 17 | `evidence_duplicate_candidates` | 10 | Evidence -- Evidence Duplicate Candidates | N |  |
| 18 | `evidence_export_manifests` | 5 | Evidence -- Evidence Export Manifests | N |  |
| 19 | `evidence_exports` | 10 | Evidence -- Evidence Exports | N |  |
| 20 | `evidence_freshness_records` | 10 | Evidence -- Evidence Freshness Records | N |  |
| 21 | `evidence_lifecycle` | 20 | Evidence lifecycle tracking | R |  |
| 22 | `evidence_links` | 8 | Evidence -- Evidence: Cross-table link records | P |  |
| 23 | `evidence_package_items` | 5 | Evidence -- Evidence Package Items | N |  |
| 24 | `evidence_packages` | 12 | Evidence -- Evidence Packages | N |  |
| 25 | `evidence_provenance_records` | 8 | Evidence -- Evidence Provenance Records | N |  |
| 26 | `evidence_quality_assessments` | 11 | Evidence -- Evidence Quality Assessments | N |  |
| 27 | `evidence_quality_rules` | 7 | Evidence -- Evidence Quality: Rules/policy definitions | P | ✓ |
| 28 | `evidence_rejection_reasons` | 6 | Evidence -- Evidence Rejection Reasons | N | ✓ |
| 29 | `evidence_request_targets` | 7 | Evidence -- Evidence Request Targets | N |  |
| 30 | `evidence_requests` | 39 | Evidence -- Evidence Requests | N |  |
| 31 | `evidence_retention_rules` | 26 | Evidence -- Evidence Retention: Rules/policy definitions | P | ✓ |
| 32 | `evidence_reuse_links` | 7 | Evidence -- Evidence Reuse: Cross-table link records | P |  |
| 33 | `evidence_reviews` | 10 | Evidence -- Evidence Reviews | N |  |
| 34 | `evidence_schedules` | 8 | Evidence -- Evidence Schedules | N |  |
| 35 | `evidence_scores` | 8 | Evidence -- Evidence Scores | N |  |
| 36 | `evidence_source_types` | 7 | Evidence -- Evidence Source Types | N | ✓ |
| 37 | `evidence_status_log` | 7 | Evidence -- Evidence Status: Activity/audit log records | P |  |
| 38 | `evidence_submissions` | 9 | Evidence -- Evidence Submissions | N |  |
| 39 | `evidence_tags` | 5 | Evidence -- Evidence Tags | N |  |
| 40 | `evidence_tasks` | 20 | Evidence -- Evidence: Task records | P |  |
| 41 | `evidence_templates` | 18 | Evidence -- Evidence: Template catalog | P |  |
| 42 | `evidence_type_catalog` | 16 | Evidence -- Evidence Type Catalog | N |  |
| 43 | `evidence_types` | 10 | Evidence -- Evidence Types | N | ✓ |
| 44 | `evidence_validation_metrics` | 30 | Evidence -- Evidence Validation: Metric data points | P |  |
| 45 | `evidence_validation_rules` | 14 | Evidence -- Evidence Validation: Rules/policy definitions | P |  |
| 46 | `evidence_verification_events` | 6 | Evidence -- Evidence Verification: Domain event records | P |  |
| 47 | `evidence_versions` | 11 | Evidence -- Evidence: Versioned record history | P |  |
| 48 | `pipeline_webhook_configs` | 13 | Evidence -- Pipeline Webhook Configs | N |  |
| 49 | `pipeline_webhook_logs` | 16 | Evidence -- Pipeline Webhook Logs | N |  |
