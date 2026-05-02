# Module: `foundation`

**Owner service:** `tenant-service` -- **Tables:** 46 -- **Has-data:** 8 -- **Schema-only:** 38

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `access_profiles` | 8 | Foundation -- Access Profiles | N | ✓ |
| 2 | `assignment_resolution_log` | 10 | Foundation -- Assignment Resolution: Activity/audit log records | P |  |
| 3 | `business_services_catalog` | 23 | Foundation -- Business Services Catalog | N |  |
| 4 | `business_units` | 22 | Foundation -- Business Units | N |  |
| 5 | `committees` | 6 | Foundation -- Committee record (Committees) | T |  |
| 6 | `delegations` | 14 | Foundation -- Delegations | N |  |
| 7 | `departments` | 22 | Foundation -- Department record (Departments) | T |  |
| 8 | `effective_user_modules` | 6 | Foundation -- User record (Effective User Modules) | T |  |
| 9 | `effective_user_permissions` | 8 | Foundation -- Effective User: Permission grants | P |  |
| 10 | `invitations` | 10 | Foundation -- Invitations | N |  |
| 11 | `locations` | 32 | Foundation -- Location record (Locations) | T |  |
| 12 | `member_lifecycle_events` | 9 | Foundation -- Member Lifecycle: Domain event records | P |  |
| 13 | `member_profiles` | 12 | Foundation -- Member Profiles | N |  |
| 14 | `org_cost_center_assignments` | 15 | Foundation -- Org Cost Center: Assignment mapping (X to Y) | P |  |
| 15 | `org_custom_field_definitions` | 15 | Foundation -- Org Custom Field: Definition catalog | P |  |
| 16 | `org_dimension_values` | 12 | Foundation -- Org Dimension Values | N |  |
| 17 | `org_dimensions` | 12 | Foundation -- Org Dimensions | N | ✓ |
| 18 | `org_hierarchy_edges` | 10 | Foundation -- Org Hierarchy Edges | N |  |
| 19 | `org_hierarchy_nodes` | 13 | Foundation -- Org Hierarchy Nodes | N |  |
| 20 | `org_location_assignments` | 13 | Foundation -- Org Location: Assignment mapping (X to Y) | P |  |
| 21 | `org_profile` | 14 | Foundation -- Org Profile | N |  |
| 22 | `org_unit_role_assignments` | 14 | Foundation -- Org Unit Role: Assignment mapping (X to Y) | P |  |
| 23 | `org_validation_executions` | 15 | Foundation -- Org Validation Executions | N |  |
| 24 | `org_validation_patterns` | 11 | Foundation -- Org Validation Patterns | N |  |
| 25 | `org_validation_rules` | 31 | Foundation -- Org Validation: Rules/policy definitions | P |  |
| 26 | `organizations` | 22 | Foundation -- Organization record (Organizations) | T |  |
| 27 | `positions` | 13 | Foundation -- Position record (Positions) | T |  |
| 28 | `product_modules` | 15 | Foundation -- Product Modules | N | ✓ |
| 29 | `product_overrides` | 5 | Foundation -- Product Overrides | N |  |
| 30 | `products` | 11 | Foundation -- Products | N |  |
| 31 | `sections` | 13 | Foundation -- Sections | N |  |
| 32 | `sector_authority_mapping` | 7 | Foundation -- Sector Authority: Cross-entity mapping | P |  |
| 33 | `teams` | 23 | Foundation -- Team record (Teams) | T | ✓ |
| 34 | `tenant_ai_config` | 9 | Foundation -- Tenant Ai: Configuration values | P |  |
| 35 | `tenant_archetypes` | 7 | Foundation -- Tenant Archetypes | N | ✓ |
| 36 | `tenant_blueprints` | 10 | Foundation -- Tenant Blueprints | N | ✓ |
| 37 | `tenant_config_versions` | 7 | Foundation -- Tenant Config: Versioned record history | P |  |
| 38 | `tenant_domains` | 11 | Foundation -- Tenant Domains | N |  |
| 39 | `tenant_email_config` | 20 | Foundation -- Tenant Email: Configuration values | P |  |
| 40 | `tenant_module_entitlements` | 8 | Foundation -- Tenant Module Entitlements | N | ✓ |
| 41 | `tenant_nav_rules` | 14 | Foundation -- Tenant Nav: Rules/policy definitions | P |  |
| 42 | `tenant_page_overrides` | 6 | Foundation -- Tenant Page Overrides | N |  |
| 43 | `tenant_quota_config` | 6 | Foundation -- Tenant Quota: Configuration values | P |  |
| 44 | `tenant_settings` | 11 | Foundation -- Tenant: Configuration values | P | ✓ |
| 45 | `tenant_settings_history` | 7 | Foundation -- Tenant Settings: Historical change records | P |  |
| 46 | `user_lifecycle_events` | 13 | Foundation -- User Lifecycle: Domain event records | P |  |
