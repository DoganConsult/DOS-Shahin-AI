# Failed Tenant Migrations — Root Cause Analysis

Snapshot of dos.tenant_migrations WHERE status='failed'.

## Summary by category

| Category | Distinct migrations | Total failed rows | Root cause |
|---|---:|---:|---|
| UNRESOLVED_TENANT_PLACEHOLDER | 117 | 1233 | Migration uses literal "__TENANT_SCHEMA__" placeholder; runner did not substitute it before exec, producing SQL like ""."<table>" which Postgres rejects. |
| INSUFFICIENT_PRIVILEGE | 130 | 139 | Migration tries to ALTER table action_items but the dos_auth role does not own it. The owning role (created the table) must apply this DDL or grant ownership. |
| MISSING_UNIQUE_INDEX | 1 | 2 | FK declared against a column set that has no UNIQUE/PK index in the referenced table. |

## Per-migration detail

### UNRESOLVED_TENANT_PLACEHOLDER — 1233 failed rows across 117 migrations

**Root cause:** Migration uses literal "__TENANT_SCHEMA__" placeholder; runner did not substitute it before exec, producing SQL like ""."<table>" which Postgres rejects.

| # | migration_id | tenants | sample error |
|--:|---|--:|---|
| 1 | `module/action/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 2 | `module/agrc-engine/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 3 | `module/ai-governance/003_agent_delegations_and_proposed_actions` | 11 | zero-length delimited identifier at or near """" |
| 4 | `module/ai-governance/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 5 | `module/ai/001_ai_engine_initial_schema` | 11 | zero-length delimited identifier at or near """" |
| 6 | `module/ai/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 7 | `module/analytics/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 8 | `module/asset/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 9 | `module/attestation/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 10 | `module/audit/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 11 | `module/bcp/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 12 | `module/benchmarks/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 13 | `module/compliance/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 14 | `module/controls/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 15 | `module/dashboard/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 16 | `module/dora/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 17 | `module/evidence/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 18 | `module/exception/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 19 | `module/executive/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 20 | `module/fitch/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 21 | `module/foundation/001_foundation_tenant_tables` | 11 | zero-length delimited identifier at or near """" |
| 22 | `module/governance-os/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 23 | `module/governance/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 24 | `module/grc-query/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 25 | `module/inbox/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 26 | `module/incident/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 27 | `module/integrations/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 28 | `module/issues/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 29 | `module/journey/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 30 | `module/knowledge/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 31 | `module/ksa-regulatory/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 32 | `module/local-knowledge/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 33 | `module/mcp/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 34 | `module/mobile/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 35 | `module/notification/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 36 | `module/operating-cockpit/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 37 | `module/platform-core/019_file_storage_table` | 11 | zero-length delimited identifier at or near """" |
| 38 | `module/platform-core/020_row_level_security` | 11 | zero-length delimited identifier at or near """" |
| 39 | `module/platform-core/024_rls_vector_stores` | 11 | zero-length delimited identifier at or near """" |
| 40 | `module/platform-core/034_module_config_runtime` | 11 | zero-length delimited identifier at or near """" |
| 41 | `module/platform-core/035_risk_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 42 | `module/platform-core/036_compliance_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 43 | `module/platform-core/037_platform_runtime_tables` | 11 | zero-length delimited identifier at or near """" |
| 44 | `module/platform-core/039_module_config_audit_hardening` | 11 | zero-length delimited identifier at or near """" |
| 45 | `module/platform-core/041_module_entitlement_audit` | 11 | zero-length delimited identifier at or near """" |
| 46 | `module/platform-core/042_tenant_module_entitlements_alignment` | 11 | zero-length delimited identifier at or near """" |
| 47 | `module/platform-core/413_action_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 48 | `module/platform-core/414_agrc-engine_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 49 | `module/platform-core/415_ai_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 50 | `module/platform-core/416_ai-governance_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 51 | `module/platform-core/417_analytics_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 52 | `module/platform-core/418_asset_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 53 | `module/platform-core/419_attestation_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 54 | `module/platform-core/420_audit_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 55 | `module/platform-core/421_bcp_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 56 | `module/platform-core/422_benchmarks_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 57 | `module/platform-core/423_controls_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 58 | `module/platform-core/424_dashboard_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 59 | `module/platform-core/425_dashboard-editor_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 60 | `module/platform-core/426_dora_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 61 | `module/platform-core/427_evidence_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 62 | `module/platform-core/428_exception_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 63 | `module/platform-core/429_executive_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 64 | `module/platform-core/430_fitch_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 65 | `module/platform-core/431_governance_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 66 | `module/platform-core/432_governance-ai_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 67 | `module/platform-core/433_governance-os_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 68 | `module/platform-core/434_grc-query_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 69 | `module/platform-core/435_inbox_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 70 | `module/platform-core/436_incident_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 71 | `module/platform-core/437_integrations_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 72 | `module/platform-core/438_issues_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 73 | `module/platform-core/439_journey_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 74 | `module/platform-core/440_knowledge_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 75 | `module/platform-core/441_ksa-regulatory_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 76 | `module/platform-core/442_local-knowledge_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 77 | `module/platform-core/443_mcp_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 78 | `module/platform-core/444_mobile_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 79 | `module/platform-core/445_notification_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 80 | `module/platform-core/446_onboarding_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 81 | `module/platform-core/447_operating-cockpit_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 82 | `module/platform-core/448_packs_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 83 | `module/platform-core/449_platform-onboarding_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 84 | `module/platform-core/450_playbooks_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 85 | `module/platform-core/451_policy_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 86 | `module/platform-core/452_portals_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 87 | `module/platform-core/453_privacy_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 88 | `module/platform-core/454_proactive-leadership_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 89 | `module/platform-core/455_qiyas_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 90 | `module/platform-core/456_records_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 91 | `module/platform-core/457_remediation_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 92 | `module/platform-core/458_reporting_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 93 | `module/platform-core/459_team_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 94 | `module/platform-core/460_training_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 95 | `module/platform-core/461_vendor_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 96 | `module/platform-core/462_widgets_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 97 | `module/platform-core/463_workflow_module_config_seed` | 10 | zero-length delimited identifier at or near """" |
| 98 | `module/platform-core/480_douhan_consult_tenant_seed` | 10 | zero-length delimited identifier at or near """" |
| 99 | `module/playbooks/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 100 | `module/policy/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 101 | `module/portals/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 102 | `module/privacy/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 103 | `module/proactive-leadership/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 104 | `module/qiyas/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 105 | `module/records/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 106 | `module/remediation/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 107 | `module/reporting/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 108 | `module/risk/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 109 | `module/risk/040_risk_risks_soft_delete` | 11 | zero-length delimited identifier at or near """" |
| 110 | `module/risk/123_force_rls_everywhere` | 11 | zero-length delimited identifier at or near """" |
| 111 | `module/team/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 112 | `module/team/028_team_structure_to_dos_views` | 11 | zero-length delimited identifier at or near """" |
| 113 | `module/training/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 114 | `module/vendor/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 115 | `module/widgets/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |
| 116 | `module/workflow/003_co_draft_sessions` | 11 | zero-length delimited identifier at or near """" |
| 117 | `module/workflow/027_extracted_from_027_tenant_schema_tables` | 11 | zero-length delimited identifier at or near """" |

### INSUFFICIENT_PRIVILEGE — 139 failed rows across 130 migrations

**Root cause:** Migration tries to ALTER table action_items but the dos_auth role does not own it. The owning role (created the table) must apply this DDL or grant ownership.

| # | migration_id | tenants | sample error |
|--:|---|--:|---|
| 1 | `module/action/001_initial_tables` | 1 | must be owner of table action_items |
| 2 | `module/action/002_enterprise_expansion` | 1 | must be owner of table action_versions |
| 3 | `module/agrc-engine/001_agrc_engine_tables` | 1 | must be owner of table agrc_engine_records |
| 4 | `module/ai-governance/001_ai_governance_tables` | 1 | must be owner of table ai_governance_records |
| 5 | `module/ai/001_initial_tables` | 1 | must be owner of table ai_items |
| 6 | `module/ai/099_extracted_from_099_bootstrap_tenant_domain_tables` | 1 | must be owner of table ai_model_registry |
| 7 | `module/ai/111_ai_model_risk_management_enhancement` | 2 | must be owner of table ai_system_registry |
| 8 | `module/analytics/001_analytics_tables` | 1 | must be owner of table analytics_snapshots |
| 9 | `module/analytics/002_enterprise_expansion` | 1 | must be owner of table analytics_versions |
| 10 | `module/asset/001_asset_tables` | 1 | must be owner of table assets |
| 11 | `module/asset/002_enterprise_expansion` | 1 | must be owner of table asset_versions |
| 12 | `module/attestation/001_initial_tables` | 1 | must be owner of table attestation_items |
| 13 | `module/attestation/002_enterprise_expansion` | 1 | must be owner of table attestation_versions |
| 14 | `module/audit/000_extracted_from_000_inline_baseline` | 1 | must be owner of table audit_plan |
| 15 | `module/audit/001_audit_tables` | 1 | must be owner of table audit_trail |
| 16 | `module/audit/002_enterprise_expansion` | 1 | must be owner of table audit_versions |
| 17 | `module/bcp/001_bcp_tables` | 1 | must be owner of table bcp_plans |
| 18 | `module/bcp/002_enterprise_expansion` | 1 | must be owner of table bcp_versions |
| 19 | `module/benchmarks/001_initial_tables` | 1 | must be owner of table benchmarks_items |
| 20 | `module/benchmarks/002_enterprise_expansion` | 1 | must be owner of table benchmarks_versions |
| 21 | `module/compliance/000_extracted_from_000_inline_baseline` | 1 | must be owner of table obligations |
| 22 | `module/compliance/001_compliance_tables` | 1 | must be owner of table compliance_frameworks |
| 23 | `module/compliance/002_enterprise_expansion` | 1 | must be owner of table compliance_versions |
| 24 | `module/compliance/003_advanced_controls_tables` | 1 | must be owner of table attestation_campaigns |
| 25 | `module/controls/000_extracted_from_000_inline_baseline` | 1 | must be owner of table controls |
| 26 | `module/controls/001_controls_tables` | 1 | must be owner of table controls |
| 27 | `module/controls/002_enterprise_expansion` | 1 | must be owner of table controls_versions |
| 28 | `module/dashboard-editor/001_initial_tables` | 1 | must be owner of table dashboard_editor_items |
| 29 | `module/dashboard-editor/002_enterprise_expansion` | 1 | must be owner of table dashboard_editor_versions |
| 30 | `module/dashboard/000_extracted_from_000_inline_baseline` | 1 | must be owner of table dashboard_configs |
| 31 | `module/dashboard/001_dashboard_tables` | 1 | must be owner of table dashboards |
| 32 | `module/dashboard/002_enterprise_expansion` | 1 | must be owner of table dashboard_versions |
| 33 | `module/dora/001_dora_tables` | 1 | must be owner of table dora_records |
| 34 | `module/dora/002_enterprise_expansion` | 1 | must be owner of table dora_versions |
| 35 | `module/evidence/000_extracted_from_000_inline_baseline` | 1 | must be owner of table evidence_tasks |
| 36 | `module/evidence/001_evidence_tables` | 1 | must be owner of table evidence_items |
| 37 | `module/evidence/002_enterprise_expansion` | 1 | must be owner of table evidence_versions |
| 38 | `module/exception/001_exception_tables` | 1 | must be owner of table exception_records |
| 39 | `module/exception/002_enterprise_expansion` | 1 | must be owner of table exception_versions |
| 40 | `module/executive/001_initial_tables` | 1 | must be owner of table executive_items |
| 41 | `module/executive/002_enterprise_expansion` | 1 | must be owner of table executive_versions |
| 42 | `module/fitch/001_initial_tables` | 1 | must be owner of table fitch_items |
| 43 | `module/fitch/002_enterprise_expansion` | 1 | must be owner of table fitch_versions |
| 44 | `module/governance-ai/001_initial_tables` | 1 | must be owner of table governance_ai_items |
| 45 | `module/governance-ai/002_enterprise_expansion` | 1 | must be owner of table governance_ai_versions |
| 46 | `module/governance-os/001_initial_tables` | 1 | must be owner of table governance_os_items |
| 47 | `module/governance-os/002_enterprise_expansion` | 1 | must be owner of table governance_os_versions |
| 48 | `module/governance/000_extracted_from_000_inline_baseline` | 1 | must be owner of table governance_committees |
| 49 | `module/governance/001_governance_tables` | 1 | must be owner of table governance_boards |
| 50 | `module/governance/002_enterprise_expansion` | 1 | must be owner of table governance_versions |
| 51 | `module/grc-query/001_initial_tables` | 1 | must be owner of table grc_query_items |
| 52 | `module/grc-query/002_enterprise_expansion` | 1 | must be owner of table grc_query_versions |
| 53 | `module/inbox/001_inbox_tables` | 1 | must be owner of table inbox_records |
| 54 | `module/inbox/002_enterprise_expansion` | 1 | must be owner of table inbox_versions |
| 55 | `module/incident/001_incident_tables` | 1 | must be owner of table incidents |
| 56 | `module/incident/002_enterprise_expansion` | 1 | must be owner of table incident_versions |
| 57 | `module/incident/099_extracted_from_099_bootstrap_tenant_domain_tables` | 1 | must be owner of table incidents |
| 58 | `module/incident/102_incident_governance_pipeline` | 2 | must be owner of table incidents |
| 59 | `module/incident/105_incident_advanced_tables` | 2 | must be owner of table incidents |
| 60 | `module/incident/118_extracted_from_118_incident_vendor_bcp_config_tables` | 1 | must be owner of table incident_categories |
| 61 | `module/integrations/001_initial_tables` | 1 | must be owner of table integrations_items |
| 62 | `module/integrations/002_enterprise_expansion` | 1 | must be owner of table integrations_versions |
| 63 | `module/issues/001_issues_tables` | 1 | must be owner of table issues_records |
| 64 | `module/issues/002_enterprise_expansion` | 1 | must be owner of table issues_versions |
| 65 | `module/journey/001_journey_tables` | 1 | must be owner of table journey_records |
| 66 | `module/journey/002_enterprise_expansion` | 1 | must be owner of table journey_versions |
| 67 | `module/knowledge/001_initial_tables` | 1 | must be owner of table knowledge_items |
| 68 | `module/knowledge/002_enterprise_expansion` | 1 | must be owner of table knowledge_versions |
| 69 | `module/ksa-regulatory/001_ksa_regulatory_tables` | 1 | must be owner of table ksa_regulatory_records |
| 70 | `module/ksa-regulatory/002_enterprise_expansion` | 1 | must be owner of table ksa_regulatory_versions |
| 71 | `module/local-knowledge/001_local_knowledge_tables` | 1 | must be owner of table local_knowledge_records |
| 72 | `module/local-knowledge/002_enterprise_expansion` | 1 | must be owner of table local_knowledge_versions |
| 73 | `module/mcp/001_initial_tables` | 1 | must be owner of table mcp_logs |
| 74 | `module/mobile/001_initial_tables` | 1 | must be owner of table mobile_items |
| 75 | `module/mobile/002_enterprise_expansion` | 1 | must be owner of table mobile_versions |
| 76 | `module/notification/001_notification_tables` | 1 | must be owner of table notifications |
| 77 | `module/notification/002_enterprise_expansion` | 1 | must be owner of table notification_versions |
| 78 | `module/onboarding/001_onboarding_tables` | 1 | must be owner of table onboarding_journeys |
| 79 | `module/operating-cockpit/001_initial_tables` | 1 | must be owner of table operating_cockpit_items |
| 80 | `module/operating-cockpit/002_enterprise_expansion` | 1 | must be owner of table operating_cockpit_versions |
| 81 | `module/packs/001_packs_tables` | 1 | must be owner of table packs_records |
| 82 | `module/platform-core/000_extracted_from_000_inline_baseline` | 1 | must be owner of table workspace_profile |
| 83 | `module/platform-core/099_extracted_from_099_bootstrap_tenant_domain_tables` | 1 | must be owner of table teams |
| 84 | `module/platform-core/129_ai_rls_enablement` | 2 | must be owner of table copilot_sessions |
| 85 | `module/playbooks/001_initial_tables` | 1 | must be owner of table playbooks_items |
| 86 | `module/playbooks/002_enterprise_expansion` | 1 | must be owner of table playbooks_versions |
| 87 | `module/policy/001_policy_tables` | 1 | must be owner of table policies |
| 88 | `module/policy/002_enterprise_expansion` | 1 | must be owner of table policy_versions_meta |
| 89 | `module/portals/001_portals_tables` | 1 | must be owner of table portals_records |
| 90 | `module/portals/002_enterprise_expansion` | 1 | must be owner of table portals_versions |
| 91 | `module/privacy/001_initial_tables` | 1 | must be owner of table privacy_items |
| 92 | `module/privacy/002_enterprise_expansion` | 1 | must be owner of table privacy_versions |
| 93 | `module/proactive-leadership/001_initial_tables` | 1 | must be owner of table proactive_leadership_items |
| 94 | `module/proactive-leadership/002_enterprise_expansion` | 1 | must be owner of table proactive_leadership_versions |
| 95 | `module/qiyas/000_extracted_from_000_inline_baseline` | 1 | must be owner of table qiyas_models |
| 96 | `module/qiyas/001_qiyas_tables` | 1 | must be owner of table qiyas_records |
| 97 | `module/qiyas/002_enterprise_expansion` | 1 | must be owner of table qiyas_versions |
| 98 | `module/records/001_initial_tables` | 1 | must be owner of table records_items |
| 99 | `module/records/002_enterprise_expansion` | 1 | must be owner of table records_versions |
| 100 | `module/remediation/001_remediation_tables` | 1 | must be owner of table remediation_records |
| 101 | `module/remediation/002_enterprise_expansion` | 1 | must be owner of table remediation_versions |
| 102 | `module/reporting/001_reporting_tables` | 1 | must be owner of table reporting_records |
| 103 | `module/reporting/002_enterprise_expansion` | 1 | must be owner of table reporting_versions |
| 104 | `module/risk/000_extracted_from_000_inline_baseline` | 1 | must be owner of table risks |
| 105 | `module/risk/001_risk_tables` | 1 | must be owner of table risks |
| 106 | `module/risk/002_enterprise_expansion` | 1 | must be owner of table risk_versions |
| 107 | `module/risk/099_extracted_from_099_bootstrap_tenant_domain_tables` | 1 | must be owner of table risks |
| 108 | `module/risk/103_risk_scenarios` | 1 | must be owner of table risk_scenarios |
| 109 | `module/risk/104_risk_team_ownership` | 2 | must be owner of table risks |
| 110 | `module/risk/109_risk_production_readiness` | 2 | must be owner of table risks |
| 111 | `module/risk/112_ai_model_risk_register_link` | 2 | must be owner of table risks |
| 112 | `module/risk/113_risk_scoring_tables_v1` | 1 | must be owner of table risk_scoring_models |
| 113 | `module/risk/114_risk_scoring_tables_v2` | 1 | must be owner of table risk_scoring_models |
| 114 | `module/risk/115_risk_scoring_tables_v3` | 1 | must be owner of table risk_scoring_models |
| 115 | `module/risk/119_risk_scoring_tables_v4` | 1 | must be owner of table risk_scoring_models |
| 116 | `module/risk/121_risk_spec_field_alignment` | 2 | must be owner of table risks |
| 117 | `module/risk/122_risk_review_approval_tables` | 1 | must be owner of table risk_reviews |
| 118 | `module/team/000_extracted_from_000_inline_baseline` | 1 | must be owner of table team_members |
| 119 | `module/team/001_team_tables` | 1 | must be owner of table team_records |
| 120 | `module/team/002_enterprise_expansion` | 1 | must be owner of table team_versions |
| 121 | `module/training/001_training_tables` | 1 | must be owner of table training_records |
| 122 | `module/training/002_enterprise_expansion` | 1 | must be owner of table training_versions |
| 123 | `module/vendor/001_vendor_tables` | 1 | must be owner of table vendor_profiles |
| 124 | `module/vendor/002_enterprise_expansion` | 1 | must be owner of table vendor_versions |
| 125 | `module/widgets/001_initial_tables` | 1 | must be owner of table widgets_items |
| 126 | `module/widgets/002_enterprise_expansion` | 1 | must be owner of table widgets_versions |
| 127 | `module/workflow/000_extracted_from_000_inline_baseline` | 1 | must be owner of table workflow_chain_definitions |
| 128 | `module/workflow/001_workflow_tables` | 1 | must be owner of table workflows |
| 129 | `module/workflow/002_enterprise_expansion` | 1 | must be owner of table workflow_versions |
| 130 | `module/workflow/022_reconcile_workflow_tables` | 2 | must be owner of table workflow_instances |

### MISSING_UNIQUE_INDEX — 2 failed rows across 1 migrations

**Root cause:** FK declared against a column set that has no UNIQUE/PK index in the referenced table.

| # | migration_id | tenants | sample error |
|--:|---|--:|---|
| 1 | `module/incident/117_incident_case_breach_enterprise_v2` | 2 | there is no unique constraint matching given keys for referenced table "incident |

