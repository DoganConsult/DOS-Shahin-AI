/**
 * DAuth Table Classification — Patch 2 §2.2
 *
 * Every DAuth-owned table classified into exactly one of the five shared buckets
 * defined in AGENTS.md §2.2 (Patch 2) and §6 (Design Freeze).
 *
 * Bucket 1 — Canonical runtime truth: participates in access/scope/authority decisions
 * Bucket 2 — Registry metadata: module registration, structural descriptors, not direct runtime
 * Bucket 3 — Presentation / runtime config: dashboards, UI, navigation, preferences (not auth truth)
 * Bucket 4 — Provisioning / seed input: used during bootstrap only
 * Bucket 5 — Legacy / archive: should be deleted, must not participate in new runtime
 *
 * Schema prefix legend:
 *   (none)     = public schema
 *   tenant_    = tenant-scoped schema (per §6.6 migration map)
 *
 * Classification basis: DAuth ownership per Design Freeze §1.2 —
 *   identity, authentication, sessions, refresh, revocation, MFA, actor registry,
 *   tenant membership, access profiles, functional roles, permissions,
 *   role-permission mappings, scope resolution, decision authorities,
 *   delegation, SoD, lifecycle authorization, access snapshot, auth decision audit.
 */
export declare const DAUTH_TABLE_CLASSIFICATION: {
    readonly bucket1_runtime_truth: readonly ["users", "tenant_user_memberships", "email_verification_tokens", "password_reset_tokens", "user_mfa", "login_attempts", "access_profiles", "functional_roles", "permissions", "role_permissions", "user_access_profiles", "user_role_assignments", "enterprise_user_role_assignments", "roles", "role_function_map", "effective_user_permissions", "role_permission_map", "authority_levels", "authority_matrix", "sign_off_authority_matrix", "approval_authority_matrix", "function_authorities", "authority_level_catalog", "governance_authority_levels", "authorization_decision_log", "authz_decision_log", "guard_decision_log", "authorization_audit_log", "authorization_mismatch_log", "policy_decision_log", "authorization_permissions", "authz_snapshot", "authentication_policies", "delegations", "delegated_authorities", "delegation_rules", "delegation_policies", "delegation_grants", "delegation_actions", "governance_delegations", "sod_rules", "sod_conflict_log", "sod_conflict_matrix", "sod_conflict_resolution_history", "external_user_scopes", "scope_dimensions", "object_scopes", "access_review_campaigns", "access_review_items", "iam_access_reviews", "role_assignment_history", "role_assignment_audit", "role_change_log", "role_change_requests", "role_usage_audit", "invitations", "tenant_security_config", "dogan_guardian_config", "dogan_guardian_events", "role_function_permissions", "field_rbac_permissions", "route_permission_mappings", "user_function_overrides", "role_permission_overrides", "platform_role_tenant_role_map", "tenant_role_definitions", "org_role_defaults", "user_roles", "team_role_bindings", "defense_lines"];
    readonly bucket2_registry: readonly ["module_role_definitions", "module_permissions", "module_permission_definitions", "module_role_bindings", "module_role_permission_bindings", "module_roles", "module_sod_rules", "module_sod_policies", "membership_type_permissions", "functional_role_bundles", "functional_role_bundle_items", "ontology_role_blueprints", "lookup_approval_authorities", "lookup_authority_frameworks", "lookup_authority_sector_mapping", "lookup_grc_role_staffing", "lookup_pdpl_scopes"];
    readonly bucket3_presentation: readonly ["role_experience_profiles", "role_profiles", "role_nav_sections", "dashboard_role_bindings", "navigation_role_bindings", "workflow_role_access", "workflow_step_roles", "role_sla_defaults", "role_learning_states", "user_preferences", "user_activities", "user_favorites", "department_roles", "role_action_map", "ai_governance_roles", "memory_access_log"];
    readonly bucket4_provisioning: readonly ["onboarding_sessions", "onboarding_user_answers", "ai_sessions", "pending_assignment_queue", "co_draft_sessions"];
    readonly bucket5_legacy: readonly ["role_functions", "role_function_scope_map", "role_defense_line_mappings", "role_team_mapping", "permissions_legacy", "role_permissions_legacy", "_retired_onboarding_user_answers"];
};
/** Union type of all DAuth-owned table names. */
export type DAuthTableName = typeof DAUTH_TABLE_CLASSIFICATION.bucket1_runtime_truth[number] | typeof DAUTH_TABLE_CLASSIFICATION.bucket2_registry[number] | typeof DAUTH_TABLE_CLASSIFICATION.bucket3_presentation[number] | typeof DAUTH_TABLE_CLASSIFICATION.bucket4_provisioning[number] | typeof DAUTH_TABLE_CLASSIFICATION.bucket5_legacy[number];
/** Bucket identifier. */
export type DAuthBucket = 1 | 2 | 3 | 4 | 5;
/** Returns the bucket number for a given DAuth table, or undefined if not classified. */
export declare function getDAuthBucket(tableName: string): DAuthBucket | undefined;
