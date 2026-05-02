# Module: `admin`

**Owner service:** `tenant-service` -- **Tables:** 147 -- **Has-data:** 45 -- **Schema-only:** 102

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `_retired_dashboard_overrides_v1` | 8 | Retired/deprecated table — kept for rollback safety only | P |  |
| 2 | `activity_feed` | 14 | Admin -- Activity Feed | N |  |
| 3 | `activity_notifications` | 7 | Admin -- Activity: Notification queue/log | P |  |
| 4 | `actor_audit_log` | 12 | Admin -- Actor Audit: Activity/audit log records | P |  |
| 5 | `actor_registry` | 12 | Admin -- Actor Registry | N | ✓ |
| 6 | `agrc_event_dlq` | 12 | Admin -- Agrc Event Dlq | N |  |
| 7 | `api_ai_config` | 15 | Admin -- Api Ai: Configuration values | P |  |
| 8 | `api_keys` | 14 | Admin -- Api: Key/identifier catalog | P |  |
| 9 | `assessment_templates` | 20 | Admin -- Assessment: Template catalog | P | ✓ |
| 10 | `automation_log` | 11 | Admin -- Automation: Activity/audit log records | P |  |
| 11 | `automation_rules` | 24 | Admin -- Automation: Rules/policy definitions | P | ✓ |
| 12 | `cache_dependencies` | 8 | Admin -- Cache: Dependency mapping | P | ✓ |
| 13 | `cache_invalidation_log` | 7 | Admin -- Cache Invalidation: Activity/audit log records | P |  |
| 14 | `command_palette_history` | 10 | Admin -- Command Palette: Historical change records | P |  |
| 15 | `consent_records` | 7 | Admin -- Consent Records | N |  |
| 16 | `content_pack_installations` | 6 | Admin -- Content Pack Installations | N |  |
| 17 | `contract_tests` | 8 | Admin -- Contract Tests | N |  |
| 18 | `cross_module_links` | 13 | Admin -- Cross Module: Cross-table link records | P |  |
| 19 | `dos_agent_approvals` | 14 | Admin -- AI agent record (Dos Agent Approvals) | T |  |
| 20 | `dos_agent_instructions` | 9 | Admin -- AI agent record (Dos Agent Instructions) | T |  |
| 21 | `dos_agent_kernel_audit` | 10 | Admin -- Dos Agent Kernel: Audit-trail entries | P |  |
| 22 | `dos_agent_memories` | 11 | Admin -- AI agent record (Dos Agent Memories) | T |  |
| 23 | `dos_agent_metrics` | 9 | Admin -- Dos Agent: Metric data points | P |  |
| 24 | `dos_agent_registry` | 14 | Admin -- AI agent record (Dos Agent Registry) | T |  |
| 25 | `dos_agent_runs` | 17 | Admin -- Dos Agent: Execution run records | P |  |
| 26 | `dos_agent_schedules` | 12 | Admin -- AI agent record (Dos Agent Schedules) | T |  |
| 27 | `dos_agent_state_log` | 7 | Admin -- Dos Agent State: Activity/audit log records | P |  |
| 28 | `dos_agent_states` | 5 | Admin -- Dos Agent: State-machine state catalog | P |  |
| 29 | `dos_agent_tasks` | 17 | Admin -- Dos Agent: Task records | P |  |
| 30 | `dos_agent_tool_audit` | 10 | Admin -- Dos Agent Tool: Audit-trail entries | P |  |
| 31 | `dos_agent_tool_calls` | 8 | Admin -- AI agent record (Dos Agent Tool Calls) | T |  |
| 32 | `dos_agent_watchdog_log` | 7 | Admin -- Dos Agent Watchdog: Activity/audit log records | P |  |
| 33 | `email_send_log` | 13 | Admin -- Email Send: Activity/audit log records | P |  |
| 34 | `enterprise_user_role_assignments` | 18 | Admin -- Enterprise User Role: Assignment mapping (X to Y) | P | ✓ |
| 35 | `entity_dimension_assignments` | 9 | Admin -- Entity Dimension: Assignment mapping (X to Y) | P |  |
| 36 | `entity_instances` | 10 | Admin -- Entity Instances | N |  |
| 37 | `entity_lifecycle_log` | 11 | Admin -- Entity Lifecycle: Activity/audit log records | P |  |
| 38 | `entity_relationships` | 6 | Admin -- Entity: Relationship records | P |  |
| 39 | `entity_routing_config` | 12 | Admin -- Entity Routing: Configuration values | P | ✓ |
| 40 | `entity_type_routing_config` | 10 | Admin -- Entity Type Routing: Configuration values | P | ✓ |
| 41 | `entity_types` | 9 | Admin -- Entity Types | N | ✓ |
| 42 | `event_processing_state` | 7 | Admin -- Event Processing: State-machine state | P | ✓ |
| 43 | `event_subscriptions` | 8 | Admin -- Event: Subscription records | P |  |
| 44 | `event_trigger_bindings` | 12 | Admin -- Event Trigger Bindings | N | ✓ |
| 45 | `explainability_packs` | 6 | Admin -- Explainability Packs | N |  |
| 46 | `favorites` | 7 | Admin -- Favorites | N |  |
| 47 | `feature_flags` | 10 | Admin -- Feature Flags | N | ✓ |
| 48 | `file_storage` | 18 | Admin -- File Storage | N |  |
| 49 | `functional_roles` | 11 | Admin -- Functional: Role definitions | P | ✓ |
| 50 | `grc_control_sector_mapping` | 6 | Admin -- Grc Control Sector: Cross-entity mapping | P |  |
| 51 | `grc_entity_profile_mapping` | 9 | Admin -- Grc Entity Profile: Cross-entity mapping | P |  |
| 52 | `grc_evidence_action_mapping` | 9 | Admin -- Grc Evidence Action: Cross-entity mapping | P |  |
| 53 | `grc_evidence_sector_mapping` | 6 | Admin -- Grc Evidence Sector: Cross-entity mapping | P |  |
| 54 | `grc_risk_sector_mapping` | 6 | Admin -- Grc Risk Sector: Cross-entity mapping | P |  |
| 55 | `grc_roadmaps` | 7 | Admin -- Grc Roadmaps | N |  |
| 56 | `grc_sector_lookup` | 7 | Admin -- Grc Sector Lookup | N | ✓ |
| 57 | `guidance_history` | 8 | Admin -- Guidance: Historical change records | P |  |
| 58 | `handoff_batches` | 11 | Admin -- Handoff Batches | N | ✓ |
| 59 | `input_validation_rules` | 21 | Admin -- Input Validation: Rules/policy definitions | P |  |
| 60 | `kernel_snapshots` | 4 | Admin -- Kernel: Point-in-time snapshots | P |  |
| 61 | `langgraph_agent_metrics` | 30 | Admin -- Langgraph Agent: Metric data points | P | ✓ |
| 62 | `management_responses` | 10 | Admin -- Management: Response records (questionnaire/survey/assessment) | P |  |
| 63 | `memory_consent_log` | 8 | Admin -- Memory Consent: Activity/audit log records | P |  |
| 64 | `message_read_status` | 3 | Admin -- Message Read: Status state record | P |  |
| 65 | `metadata_records` | 9 | Admin -- Metadata Records | N |  |
| 66 | `milestone_definitions` | 13 | Admin -- Milestone: Definition catalog | P |  |
| 67 | `mode_transition_audit` | 15 | Admin -- Mode Transition: Audit-trail entries | P |  |
| 68 | `module_action_definitions` | 15 | Admin -- Module Action: Definition catalog | P |  |
| 69 | `module_activation_events` | 8 | Admin -- Module Activation: Domain event records | P |  |
| 70 | `module_activation_policies` | 8 | Admin -- Module Activation Policies | N | ✓ |
| 71 | `module_activation_status` | 37 | Admin -- Module Activation: Status state record | P | ✓ |
| 72 | `module_admin_config` | 8 | Admin -- Module Admin: Configuration values | P |  |
| 73 | `module_approval_matrices` | 12 | Admin -- Approval record (Module Approval Matrices) | T |  |
| 74 | `module_approval_matrix` | 11 | Admin -- RACI/permission matrix (Module Approval Matrix) | T |  |
| 75 | `module_approval_policies` | 10 | Admin -- Approval record (Module Approval Policies) | T | ✓ |
| 76 | `module_audit_config` | 12 | Admin -- Module Audit: Configuration values | P | ✓ |
| 77 | `module_automation_config` | 10 | Admin -- Module Automation: Configuration values | P | ✓ |
| 78 | `module_certifications` | 20 | Admin -- Module Certifications | N |  |
| 79 | `module_code_aliases` | 4 | Admin -- Module Code Aliases | N | ✓ |
| 80 | `module_contact_points` | 14 | Admin -- Module Contact Points | N |  |
| 81 | `module_dependency_graph` | 8 | Admin -- Module Dependency Graph | N | ✓ |
| 82 | `module_entitlement_map` | 11 | Admin -- Module Entitlement Map | N |  |
| 83 | `module_entitlements` | 12 | Admin -- Module Entitlements | N | ✓ |
| 84 | `module_entity_links` | 10 | Admin -- Module Entity: Cross-table link records | P |  |
| 85 | `module_event_log` | 8 | Admin -- Module Event: Activity/audit log records | P |  |
| 86 | `module_health_checks` | 7 | Admin -- Module Health Checks | N |  |
| 87 | `module_health_status` | 11 | Admin -- Module Health: Status state record | P | ✓ |
| 88 | `module_inbound_events` | 7 | Admin -- Module Inbound: Domain event records | P | ✓ |
| 89 | `module_kickstart_log` | 9 | Admin -- Module Kickstart: Activity/audit log records | P |  |
| 90 | `module_lifecycle_definitions` | 7 | Admin -- Module Lifecycle: Definition catalog | P | ✓ |
| 91 | `module_lifecycle_transitions` | 13 | Admin -- Module Lifecycle Transitions | N | ✓ |
| 92 | `module_maturity_stages` | 11 | Admin -- Module Maturity Stages | N |  |
| 93 | `module_metrics_snapshots` | 12 | Admin -- Module Metrics: Point-in-time snapshots | P |  |
| 94 | `module_nav_registration` | 12 | Admin -- Module Nav Registration | N |  |
| 95 | `module_pages` | 16 | Admin -- Module Pages | N | ✓ |
| 96 | `module_preflight_runs` | 9 | Admin -- Module Preflight: Execution run records | P |  |
| 97 | `module_readiness_results` | 8 | Admin -- Module Readiness Results | N |  |
| 98 | `module_readiness_thresholds` | 12 | Admin -- Module Readiness: Threshold definitions | P |  |
| 99 | `module_registry` | 19 | Admin -- Module Registry | N | ✓ |
| 100 | `module_role_team_mappings` | 10 | Admin -- Module Role Team: Cross-entity mapping | P |  |
| 101 | `module_runtime_health` | 9 | Admin -- Module Runtime Health | N | ✓ |
| 102 | `module_settings` | 5 | Admin -- Module: Configuration values | P |  |
| 103 | `module_sla_tracking` | 16 | Admin -- Module Sla Tracking | N |  |
| 104 | `module_stale_record_checks` | 7 | Admin -- Module Stale Record Checks | N |  |
| 105 | `module_user_contexts` | 8 | Admin -- User record (Module User Contexts) | T |  |
| 106 | `module_workflow_profiles` | 9 | Admin -- Module Workflow Profiles | N | ✓ |
| 107 | `module_workflow_registry` | 59 | Admin -- Module Workflow Registry | N | ✓ |
| 108 | `modules` | 25 | Admin -- Modules | N |  |
| 109 | `pack_certifications` | 11 | Admin -- Pack Certifications | N | ✓ |
| 110 | `pack_installations` | 11 | Admin -- Pack Installations | N |  |
| 111 | `pack_selection_decisions` | 12 | Admin -- Decision record (Pack Selection Decisions) | T |  |
| 112 | `pack_selection_policies` | 14 | Admin -- Pack Selection Policies | N | ✓ |
| 113 | `pdpl_consent_records` | 16 | Admin -- Pdpl Consent Records | N |  |
| 114 | `performance_cache` | 11 | Admin -- Performance: Cached values | P |  |
| 115 | `permissions` | 7 | Admin -- Permissions | N | ✓ |
| 116 | `platform_feature_flags` | 9 | Admin -- Platform Feature Flags | N |  |
| 117 | `platform_operation_config` | 10 | Admin -- Platform Operation: Configuration values | P | ✓ |
| 118 | `platform_products` | 17 | Admin -- Platform Products | N | ✓ |
| 119 | `platform_security_config` | 14 | Admin -- Platform Security: Configuration values | P | ✓ |
| 120 | `procedure_versions` | 10 | Admin -- Procedure: Versioned record history | P |  |
| 121 | `profile_completeness_rules` | 12 | Admin -- Profile Completeness: Rules/policy definitions | P |  |
| 122 | `profile_completeness_scores` | 8 | Admin -- Profile Completeness Scores | N |  |
| 123 | `rate_limit_config` | 12 | Admin -- Rate Limit: Configuration values | P |  |
| 124 | `role_permissions` | 2 | Admin -- Role: Permission grants | P | ✓ |
| 125 | `ropa_entries` | 23 | Admin -- Ropa Entries | N |  |
| 126 | `route_catalog` | 15 | Admin -- Route Catalog | N |  |
| 127 | `runtime_overrides` | 10 | Admin -- Runtime Overrides | N |  |
| 128 | `schema_migrations` | 6 | Admin -- Schema Migrations | N | ✓ |
| 129 | `search_index_config` | 8 | Admin -- Search Index: Configuration values | P |  |
| 130 | `settings` | 10 | Admin -- Settings | N |  |
| 131 | `shadow_comparisons` | 16 | Admin -- Shadow Comparisons | N |  |
| 132 | `shell_config_overrides` | 8 | Admin -- Shell Config Overrides | N |  |
| 133 | `signal_detector_registry` | 24 | Admin -- Signal Detector Registry | N | ✓ |
| 134 | `supervisory_reviews` | 9 | Admin -- Supervisory Reviews | N |  |
| 135 | `system_health_snapshots` | 13 | Admin -- System Health: Point-in-time snapshots | P |  |
| 136 | `task_type_config` | 4 | Admin -- Task Type: Configuration values | P | ✓ |
| 137 | `telemetry_signals` | 8 | Admin -- Telemetry Signals | N |  |
| 138 | `tenant_security_config` | 9 | Admin -- Tenant Security: Configuration values | P | ✓ |
| 139 | `user_access_profiles` | 9 | Admin -- User record (User Access Profiles) | T | ✓ |
| 140 | `user_preferences_v2` | 14 | Admin -- User record (User Preferences V2) | T |  |
| 141 | `user_profiles_extended` | 23 | Admin -- User record (User Profiles Extended) | T |  |
| 142 | `user_sessions` | 10 | Admin -- User record (User Sessions) | T |  |
| 143 | `webhook_deliveries` | 9 | Admin -- Webhook Deliveries | N |  |
| 144 | `websocket_event_queue` | 7 | Admin -- Work queue records (Websocket Event Queue) | T |  |
| 145 | `workflow_assignments` | 16 | Admin -- Workflow: Assignment mapping (X to Y) | P |  |
| 146 | `workflow_profile_transitions` | 13 | Admin -- Workflow Profile Transitions | N | ✓ |
| 147 | `workflow_sla_policies` | 13 | Admin -- Workflow Sla Policies | N |  |
