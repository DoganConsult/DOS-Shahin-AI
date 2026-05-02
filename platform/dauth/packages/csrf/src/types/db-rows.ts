/**
 * DAuth DB row types — shared interfaces for query result rows.
 * Eliminates `as any` casts on database query results.
 */

// ── Common result patterns ───────────────────────────────────────

export interface CountRow {
  cnt?: string;
  count?: string;
  total?: string;
}

// ── Users & Identity ─────────────────────────────────────────────

export interface UserRow {
  user_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  tenant_id: string;
  onboarding_complete: boolean;
  member_onboarded: boolean;
  is_super_admin: boolean;
  must_change_password: boolean;
  password_hash?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
  created_at?: string;
  last_login_at?: string;
  language?: string;
}

export interface TenantRow {
  tenant_id: string;
  org_name: string;
  status: string;
  plan?: string;
}

export interface TenantMembershipRow {
  user_id?: string;
  tenant_id?: string;
  role: string;
  status: string;
  membership_type?: string;
  is_primary?: boolean;
  created_at?: string;
}

// ── Sessions & Tokens ────────────────────────────────────────────

export interface SessionRow {
  session_id: string;
  user_id: string;
  tenant_id: string;
  jti: string;
  refresh_jti?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  last_active_at?: string;
  expires_at: string;
  revoked_at?: string;
}

// ── Access & RBAC ────────────────────────────────────────────────

export interface FunctionalRoleRow {
  role_id: string;
  code?: string;
  role_code?: string;
  name?: string;
  display_name?: string;
  description?: string;
  permissions?: string[];
  tier?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface PermissionRow {
  permission_id: string;
  permission_code: string;
  module_code?: string;
  resource_type?: string;
  action_type?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface AccessProfileRow {
  profile_id: string;
  profile_code: string;
  display_name: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface RoleAssignmentRow {
  id: number;
  user_id: string;
  role_id: string;
  tenant_id?: string;
  is_active?: boolean;
  assigned_at?: string;
  assigned_by?: string;
  valid_until?: string;
}

// ── Delegation ───────────────────────────────────────────────────

export interface DelegationChainRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  role_id: string;
  scope_type?: string;
  scope_id?: string;
  delegation_type: string;
  status: string;
  valid_from: string;
  valid_until?: string;
}

export interface DelegationPolicyRow {
  id: string;
  role_id: string;
  policy_type: string;
  scope_type?: string;
  scope_id?: string;
  max_duration_hours?: number;
  is_active: boolean;
}

export interface UserAvailabilityRow {
  user_id: string;
  status: string;
  ooo_until?: string;
  available_from?: string;
  delegate_to_user_id?: string;
}

// ── Authority ────────────────────────────────────────────────────

export interface DecisionAuthorityRow {
  id: string;
  role_id: string;
  entity_type: string;
  action_code: string;
  authority_level: string;
  decision_type: string;
  is_active: boolean;
}

// ── Audit ────────────────────────────────────────────────────────

export interface DecisionLogRow {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  allowed: boolean;
  reason?: string;
  authority?: string;
  delegated?: boolean;
  duration_ms?: number;
  decided_at: string;
}

export interface SecurityEventRow {
  event_id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  ip?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ── SoD ──────────────────────────────────────────────────────────

export interface SodConflictRow {
  id: string;
  user_id: string;
  rule_id: string;
  conflicting_action?: string;
  resolution_status?: string;
  created_at: string;
}

// ── Scope ────────────────────────────────────────────────────────

export interface OrgNodeRow {
  org_id: string;
  parent_id?: string;
  name: string;
  org_type?: string;
}

export interface ExternalScopeRow {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  scope_type?: string;
  granted_at?: string;
}
