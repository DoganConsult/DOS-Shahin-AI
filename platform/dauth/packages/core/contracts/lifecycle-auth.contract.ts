/**
 * DAuth Contract — Lifecycle Authorization Decision
 *
 * Canonical request/response shapes for lifecycle state transition authorization.
 * Aligns with evaluateLifecycleTransition() in lifecycle-auth.service.ts (section 11).
 *
 * Permission codes follow module.resource.action naming convention.
 * Entity types reference table-classification.ts Bucket 1 tables.
 */

/** Input to request a lifecycle state transition authorization check. */
export interface LifecycleTransitionRequest {
  tenantId: string;
  userId: string;
  moduleCode: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  /** Permission code in module.resource.action format. */
  permissionCode: string;
  /** Roles held by the requesting actor. */
  userRoles: string[];
  /** Optional authority level code for authority threshold checks. */
  authorityLevelCode?: string;
  /** Owner of the entity — used for self-approval prevention. */
  ownerId?: string;
}

/** Individual check result within a lifecycle authorization decision. */
export interface TransitionCheckResult {
  /** Check name matching LifecycleAuthResult.checks keys. */
  check: 'permissionValid' | 'transitionValid' | 'authorityValid' | 'ownershipValid' | 'sodValid' | 'approvalRequired';
  passed: boolean;
  /** Human-readable detail when the check fails. */
  detail?: string;
}

/** Output of a lifecycle authorization evaluation. */
export interface LifecycleAuthDecision {
  allowed: boolean;
  reason: string;
  /** Ordered array of individual check results. */
  checks: TransitionCheckResult[];
  /** ISO timestamp of evaluation. */
  evaluatedAt: string;
  /** The permission code that was evaluated. */
  permissionCode: string;
  /** Whether the transition requires a separate approver (maker-checker). */
  approvalRequired: boolean;
}
