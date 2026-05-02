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

export const DAUTH_TABLE_CLASSIFICATION = {

  // ─── Bucket 1 — Canonical runtime truth ───────────────────────────────────
  // Tables that directly participate in runtime access, scope, authority,
  // delegation, SoD, or lifecycle authorization decisions.
  bucket1_runtime_truth: [
    // --- Identity & authentication (public) ---
    'users',                          // canonical user identity
    'tenant_user_memberships',        // canonical tenant membership evaluation (Law 1)
    'email_verification_tokens',      // active verification flow — runtime gate
    'password_reset_tokens',          // active reset flow — runtime gate
    'user_mfa',                       // MFA enforcement — runtime auth decision
    'login_attempts',                 // rate limiting / lockout — runtime auth decision

    // --- Access core (tenant) ---
    'access_profiles',                // broad operating posture (§7.1)
    'functional_roles',               // module/domain-scoped job roles (§7.2)
    'permissions',                    // module.resource.action grants (§7.3)
    'role_permissions',               // role→permission mapping (target of role_function_map rename §6.6)
    'user_access_profiles',           // user→access-profile binding (rename target: actor_access_assignments §6.6)
    'user_role_assignments',          // user→role binding (rename target: actor_role_assignments §6.6)
    'enterprise_user_role_assignments', // enterprise-wide role grants (merge into actor_role_assignments §6.6)
    'roles',                          // tenant-scoped role definitions (rename target: functional_roles §6.6)
    'role_function_map',              // role→function mapping (rename target: role_permissions §6.6)
    'effective_user_permissions',     // materialized effective permissions for fast lookup
    'role_permission_map',            // direct role-permission mapping

    // --- Authority & decision (tenant) ---
    'authority_levels',               // authority threshold definitions (merge into decision_authorities §6.6)
    'authority_matrix',               // authority assignments (merge into decision_authorities §6.6, both public + tenant)
    'sign_off_authority_matrix',      // sign-off authority (merge into decision_authorities §6.6)
    'approval_authority_matrix',      // approval authority configuration
    'function_authorities',           // function-level authority grants (public + tenant)
    'authority_level_catalog',        // canonical authority level catalog
    'governance_authority_levels',    // governance body authority thresholds
    'authorization_decision_log',     // auth decision audit (merge into authz_decision_log §6.6)
    'authz_decision_log',             // canonical authorization decision log (Law 1 target)
    'guard_decision_log',             // guard-level decision log (merge into authz_decision_log §6.6)
    'authorization_audit_log',        // authorization audit trail (public + tenant)
    'authorization_mismatch_log',     // mismatch detection log (public + tenant)
    'policy_decision_log',            // policy enforcement decision records
    'authorization_permissions',      // authorization-level permission grants
    'authz_snapshot',                 // point-in-time authorization snapshot
    'authentication_policies',        // tenant authentication policy configuration

    // --- Delegation (tenant) ---
    'delegations',                    // active delegations (merge into delegation_chains §6.6)
    'delegated_authorities',          // delegated authority grants (merge into delegation_chains §6.6)
    'delegation_rules',               // delegation constraints (rename target: delegation_policies §6.6)
    'delegation_policies',            // canonical delegation policy rules (§6.6 target)
    'delegation_grants',              // explicit delegation grants
    'delegation_actions',             // delegation action audit trail
    'governance_delegations',         // governance-level delegations

    // --- SoD (tenant) ---
    'sod_rules',                      // separation of duties rule definitions
    'sod_conflict_log',               // SoD conflict detection log
    'sod_conflict_matrix',            // SoD conflict pair matrix
    'sod_conflict_resolution_history', // SoD conflict resolution audit trail

    // --- Scope (tenant) ---
    'external_user_scopes',           // external user scope restrictions
    'scope_dimensions',               // scope dimension definitions
    'object_scopes',                  // object-level scope assignments

    // --- Access review (tenant) ---
    'access_review_campaigns',        // periodic access review campaigns
    'access_review_items',            // individual access review items
    'iam_access_reviews',             // IAM-focused access reviews
    'role_assignment_history',        // role assignment audit trail
    'role_assignment_audit',          // role assignment audit records
    'role_change_log',                // role change tracking
    'role_change_requests',           // role change request queue
    'role_usage_audit',               // role usage tracking

    // --- Invitations (tenant) ---
    'invitations',                    // pending user invitations

    // --- Security config (tenant) ---
    'tenant_security_config',         // tenant-level security configuration
    'dogan_guardian_config',          // guardian security config (public + tenant)
    'dogan_guardian_events',          // guardian security events (public + tenant)

    // --- Role-permission binding (tenant) ---
    'role_function_permissions',      // function-level permission binding on roles
    'field_rbac_permissions',         // field-level RBAC permissions
    'route_permission_mappings',      // route→permission enforcement mappings
    'user_function_overrides',        // per-user function overrides (public)
    'role_permission_overrides',      // per-role permission overrides (public)
    'platform_role_tenant_role_map',  // platform→tenant role mapping bridge
    'tenant_role_definitions',        // tenant-scoped role definitions
    'org_role_defaults',              // org-level default role assignments
    'user_roles',                     // user→role binding (secondary)
    'team_role_bindings',             // team→role binding
    'defense_lines',                  // defense line definitions for role classification
  ] as const,

  // ─── Bucket 2 — Registry metadata ─────────────────────────────────────────
  // Module registration, structural descriptors, typed definitions.
  // Not direct effective runtime truth unless materialized into Bucket 1.
  bucket2_registry: [
    'module_role_definitions',        // module-declared role definitions
    'module_permissions',             // module-declared permissions
    'module_permission_definitions',  // detailed module permission definitions
    'module_role_bindings',           // module-declared role bindings
    'module_role_permission_bindings', // module-declared role→permission bindings
    'module_roles',                   // module-declared role catalog
    'module_sod_rules',              // module-declared SoD rules
    'module_sod_policies',           // module-declared SoD policies
    'membership_type_permissions',   // membership-type permission catalog (public)
    'functional_role_bundles',       // role bundle definitions
    'functional_role_bundle_items',  // role bundle composition
    'ontology_role_blueprints',      // ontology-derived role blueprints (public)
    'lookup_approval_authorities',   // approval authority lookup (public)
    'lookup_authority_frameworks',   // authority framework lookup (public)
    'lookup_authority_sector_mapping', // authority-sector mapping lookup (public)
    'lookup_grc_role_staffing',      // GRC role staffing lookup (public)
    'lookup_pdpl_scopes',            // PDPL scope lookup (public)
  ] as const,

  // ─── Bucket 3 — Presentation / runtime config ─────────────────────────────
  // Affect UI/runtime experience, not access truth.
  bucket3_presentation: [
    'role_experience_profiles',       // role-specific UX profiles
    'role_profiles',                  // role presentation/display metadata
    'role_nav_sections',             // role-specific navigation sections
    'dashboard_role_bindings',       // dashboard→role visibility bindings
    'navigation_role_bindings',      // navigation→role visibility bindings
    'workflow_role_access',          // workflow UI role access display
    'workflow_step_roles',           // workflow step role display
    'role_sla_defaults',            // role-specific SLA display defaults
    'role_learning_states',         // role learning/onboarding UX state
    'user_preferences',             // user UX preferences (public)
    'user_activities',              // user activity feed (public)
    'user_favorites',               // user favorites (public)
    'department_roles',             // department→role display mapping (public)
    'role_action_map',              // role→action UI mapping
    'ai_governance_roles',          // AI governance role display
    'memory_access_log',            // memory access tracking (observability)
  ] as const,

  // ─── Bucket 4 — Provisioning / seed input ──────────────────────────────────
  // Used during tenant bootstrap/activation. Not live runtime truth after seeding.
  bucket4_provisioning: [
    'onboarding_sessions',           // onboarding session state (public)
    'onboarding_user_answers',       // onboarding answers for auth seed (public)
    'ai_sessions',                   // AI-assisted onboarding/auth sessions (public)
    'pending_assignment_queue',      // pending role/permission assignments during provisioning
    'co_draft_sessions',             // co-draft sessions during setup (public)
  ] as const,

  // ─── Bucket 5 — Legacy / archive-only ──────────────────────────────────────
  // Must not participate in new runtime. Candidates for DROP per §6.6 Phase 9.
  bucket5_legacy: [
    'role_functions',                 // ARCHIVE per §6.6 — absorbed by permission model (public + tenant)
    'role_function_scope_map',        // ARCHIVE per §6.6 — absorbed by scope model
    'role_defense_line_mappings',     // ARCHIVE per §6.6 — absorbed by defense_lines + scope model
    'role_team_mapping',              // ARCHIVE per §6.6 — absorbed by org_unit_role_assignments
    'permissions_legacy',             // legacy permission table — superseded by permissions
    'role_permissions_legacy',        // legacy role-permission mapping — superseded
    '_retired_onboarding_user_answers', // retired onboarding answers (public)
  ] as const,

} as const;

// ─── Classification summary ──────────────────────────────────────────────────
// Bucket 1 (runtime truth):   71 tables
// Bucket 2 (registry):        16 tables
// Bucket 3 (presentation):    16 tables
// Bucket 4 (provisioning):     5 tables
// Bucket 5 (legacy/archive):   7 tables
// ─────────────────────────────────────
// Total classified:           115 tables

/** Union type of all DAuth-owned table names. */
export type DAuthTableName =
  | typeof DAUTH_TABLE_CLASSIFICATION.bucket1_runtime_truth[number]
  | typeof DAUTH_TABLE_CLASSIFICATION.bucket2_registry[number]
  | typeof DAUTH_TABLE_CLASSIFICATION.bucket3_presentation[number]
  | typeof DAUTH_TABLE_CLASSIFICATION.bucket4_provisioning[number]
  | typeof DAUTH_TABLE_CLASSIFICATION.bucket5_legacy[number];

/** Bucket identifier. */
export type DAuthBucket = 1 | 2 | 3 | 4 | 5;

/** Returns the bucket number for a given DAuth table, or undefined if not classified. */
export function getDAuthBucket(tableName: string): DAuthBucket | undefined {
  if ((DAUTH_TABLE_CLASSIFICATION.bucket1_runtime_truth as readonly string[]).includes(tableName)) return 1;
  if ((DAUTH_TABLE_CLASSIFICATION.bucket2_registry as readonly string[]).includes(tableName)) return 2;
  if ((DAUTH_TABLE_CLASSIFICATION.bucket3_presentation as readonly string[]).includes(tableName)) return 3;
  if ((DAUTH_TABLE_CLASSIFICATION.bucket4_provisioning as readonly string[]).includes(tableName)) return 4;
  if ((DAUTH_TABLE_CLASSIFICATION.bucket5_legacy as readonly string[]).includes(tableName)) return 5;
  return undefined;
}
