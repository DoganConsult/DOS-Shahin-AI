# Module: `auth`

**Owner service:** `auth-service` -- **Tables:** 81 -- **Has-data:** 30 -- **Schema-only:** 51

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `actor_access_assignments` | 9 | Auth -- Actor Access: Assignment mapping (X to Y) | P |  |
| 2 | `actor_role_assignments` | 11 | Auth -- Actor Role: Assignment mapping (X to Y) | P |  |
| 3 | `ai_governance_roles` | 9 | Auth -- Ai Governance: Role definitions | P |  |
| 4 | `approval_authority_matrix` | 12 | Auth -- RACI/permission matrix (Approval Authority Matrix) | T |  |
| 5 | `approval_chains` | 22 | Approval chain configuration | R |  |
| 6 | `archetype_bundle_map` | 4 | Auth -- Archetype Bundle Map | N | ✓ |
| 7 | `archetype_policy_pack_map` | 6 | Auth -- Policy record (Archetype Policy Pack Map) | T | ✓ |
| 8 | `authentication_policies` | 16 | Auth -- Authentication Policies | N |  |
| 9 | `authority_level_catalog` | 9 | Auth -- Authority Level Catalog | N | ✓ |
| 10 | `authority_levels` | 15 | Auth -- Authority Levels | N |  |
| 11 | `authorization_decision_log` | 14 | Auth -- Authorization Decision: Activity/audit log records | P |  |
| 12 | `authorization_mismatch_log` | 8 | Authorization mismatch logging | R |  |
| 13 | `authorization_permissions` | 6 | Auth -- Authorization: Permission grants | P | ✓ |
| 14 | `conditional_access_grants` | 20 | Auth -- Conditional Access Grants | N |  |
| 15 | `dashboard_role_bindings` | 8 | Auth -- Role record (Dashboard Role Bindings) | T | ✓ |
| 16 | `decision_authorities` | 14 | Auth -- Decision record (Decision Authorities) | T | ✓ |
| 17 | `defense_lines` | 6 | Auth -- Defense Lines | N | ✓ |
| 18 | `delegated_authorities` | 18 | Auth -- Delegated Authorities | N |  |
| 19 | `dogan_guardian_config` | 6 | Auth -- Dogan Guardian: Configuration values | P | ✓ |
| 20 | `dogan_guardian_events` | 7 | Auth -- Dogan Guardian: Domain event records | P |  |
| 21 | `external_user_scopes` | 7 | Auth -- User record (External User Scopes) | T |  |
| 22 | `field_rbac_permissions` | 17 | Auth -- Field Rbac: Permission grants | P |  |
| 23 | `field_rbac_role_mappings` | 7 | Auth -- Field Rbac Role: Cross-entity mapping | P | ✓ |
| 24 | `function_authorities` | 9 | Function authorities | R | ✓ |
| 25 | `functional_role_bundle_items` | 5 | Auth -- Role record (Functional Role Bundle Items) | T | ✓ |
| 26 | `functional_role_bundles` | 7 | Auth -- Role record (Functional Role Bundles) | T | ✓ |
| 27 | `guard_decision_log` | 11 | Auth -- Guard Decision: Activity/audit log records | P |  |
| 28 | `iam_access_reviews` | 9 | Auth -- Iam Access Reviews | N |  |
| 29 | `iam_connections` | 13 | Auth -- Iam Connections | N |  |
| 30 | `iam_sync_history` | 11 | Auth -- Iam Sync: Historical change records | P |  |
| 31 | `module_permission_definitions` | 12 | Auth -- Module Permission: Definition catalog | P |  |
| 32 | `module_permissions` | 13 | Auth -- Module: Permission grants | P |  |
| 33 | `module_role_definitions` | 17 | Auth -- Module Role: Definition catalog | P |  |
| 34 | `module_role_permission_bindings` | 6 | Auth -- Role record (Module Role Permission Bindings) | T |  |
| 35 | `module_roles` | 11 | Auth -- Module: Role definitions | P |  |
| 36 | `module_sod_policies` | 8 | Auth -- Module Sod Policies | N | ✓ |
| 37 | `module_sod_rules` | 19 | Auth -- Module Sod: Rules/policy definitions | P |  |
| 38 | `object_scopes` | 3 | Auth -- Object Scopes | N |  |
| 39 | `permission_analytics` | 18 | Auth -- Permission Analytics | N |  |
| 40 | `permission_templates` | 15 | Auth -- Permission: Template catalog | P | ✓ |
| 41 | `permissions_legacy` | 12 | Auth -- Permissions Legacy | N |  |
| 42 | `platform_role_tenant_role_map` | 6 | Auth -- Role record (Platform Role Tenant Role Map) | T | ✓ |
| 43 | `policy_decision_log` | 11 | Auth -- Policy Decision: Activity/audit log records | P | ✓ |
| 44 | `product_user_entitlements` | 11 | Auth -- User record (Product User Entitlements) | T | ✓ |
| 45 | `rbac_config_audit` | 8 | Auth -- Rbac Config: Audit-trail entries | P |  |
| 46 | `role_action_map` | 8 | Auth -- Role record (Role Action Map) | T |  |
| 47 | `role_assignment_audit` | 10 | Auth -- Role Assignment: Audit-trail entries | P |  |
| 48 | `role_assignment_history` | 11 | Auth -- Role Assignment: Historical change records | P |  |
| 49 | `role_defense_line_mappings` | 3 | Auth -- Role Defense Line: Cross-entity mapping | P | ✓ |
| 50 | `role_function_map` | 10 | Role to function mappings | R | ✓ |
| 51 | `role_function_permissions` | 14 | Auth -- Role Function: Permission grants | P | ✓ |
| 52 | `role_function_scope_map` | 7 | Auth -- Role record (Role Function Scope Map) | T | ✓ |
| 53 | `role_functions` | 12 | Role function mappings | R | ✓ |
| 54 | `role_learning_states` | 7 | Auth -- Role Learning: State-machine state catalog | P |  |
| 55 | `role_nav_sections` | 8 | Auth -- Role record (Role Nav Sections) | T | ✓ |
| 56 | `role_permission_inheritance` | 10 | Auth -- Role record (Role Permission Inheritance) | T | ✓ |
| 57 | `role_permission_map` | 8 | Auth -- Role record (Role Permission Map) | T | ✓ |
| 58 | `role_permissions_legacy` | 8 | Auth -- Role record (Role Permissions Legacy) | T |  |
| 59 | `role_profile_assignments` | 12 | Auth -- Role Profile: Assignment mapping (X to Y) | P |  |
| 60 | `role_profile_mappings` | 8 | Auth -- Role Profile: Cross-entity mapping | P |  |
| 61 | `role_sla_defaults` | 8 | Auth -- Role record (Role Sla Defaults) | T |  |
| 62 | `role_team_mapping` | 8 | Auth -- Role Team: Cross-entity mapping | P | ✓ |
| 63 | `role_transition_requests` | 20 | Auth -- Role record (Role Transition Requests) | T |  |
| 64 | `role_usage_audit` | 15 | Auth -- Role Usage: Audit-trail entries | P |  |
| 65 | `roles` | 17 | System roles | R | ✓ |
| 66 | `route_permission_mappings` | 12 | Auth -- Route Permission: Cross-entity mapping | P |  |
| 67 | `sign_off_authority_matrix` | 10 | Auth -- RACI/permission matrix (Sign Off Authority Matrix) | T | ✓ |
| 68 | `tenant_role_definitions` | 16 | Auth -- Tenant Role: Definition catalog | P | ✓ |
| 69 | `user_availability` | 11 | Auth -- User record (User Availability) | T |  |
| 70 | `user_certifications` | 12 | Auth -- User record (User Certifications) | T |  |
| 71 | `user_competencies` | 15 | Auth -- User record (User Competencies) | T |  |
| 72 | `user_function_overrides` | 13 | Function permission overrides | R |  |
| 73 | `user_module_permissions` | 9 | Auth -- User Module: Permission grants | P |  |
| 74 | `user_notification_preferences` | 10 | Auth -- User record (User Notification Preferences) | T |  |
| 75 | `user_performance` | 21 | Auth -- User record (User Performance) | T |  |
| 76 | `user_responsibilities` | 11 | Auth -- User record (User Responsibilities) | T |  |
| 77 | `user_roles` | 15 | User role assignments | R |  |
| 78 | `user_workflow_permissions` | 12 | Auth -- User Workflow: Permission grants | P |  |
| 79 | `workflow_role_access` | 7 | Auth -- Role record (Workflow Role Access) | T | ✓ |
| 80 | `workflow_step_roles` | 9 | Auth -- Workflow Step: Role definitions | P |  |
| 81 | `workload_snapshots` | 11 | Auth -- Workload: Point-in-time snapshots | P |  |
