/**
 * DAuth event type contracts — canonical event names and payload types.
 * All dauth event publishers and subscribers should reference these constants
 * to prevent typo-based misrouting.
 */

// ── Event Name Constants ─────────────────────────────────────────

export const DAUTH_EVENTS = {
  // Identity & Authentication
  LOGIN_SUCCESS: 'dauth.login.success',
  LOGIN_FAILURE: 'dauth.login.failure',
  REGISTRATION_COMPLETED: 'dauth.registration.completed',
  ACCOUNT_LOCKED: 'dauth.account.locked',
  PASSWORD_RESET_REQUESTED: 'dauth.password_reset.requested',
  PASSWORD_RESET_COMPLETED: 'dauth.password_reset.completed',

  // Session
  SESSION_REVOKED: 'dauth.session.revoked',
  SESSIONS_BULK_REVOKED: 'dauth.sessions.bulk_revoked',

  // Security
  SECURITY_EVENT: 'dauth.security_event',

  // Access Control — Roles
  ROLE_CREATED: 'dauth.role.created',
  ROLE_DEACTIVATED: 'dauth.role.deactivated',
  ROLE_ASSIGNED: 'dauth.role.assigned',
  ROLE_REVOKED: 'dauth.role.revoked',

  // Access Control — Permissions
  PERMISSION_CREATED: 'dauth.permission.created',
  PERMISSION_DEACTIVATED: 'dauth.permission.deactivated',
  PERMISSION_ASSIGNED: 'dauth.permission.assigned',
  PERMISSION_REVOKED: 'dauth.permission.revoked',

  // Access Control — Profiles
  ACCESS_PROFILE_ASSIGNED: 'dauth.access_profile.assigned',
  ACCESS_PROFILE_REVOKED: 'dauth.access_profile.revoked',

  // Authority & Approval
  AUTHORITY_GRANTED: 'dauth.authority.granted',
  AUTHORITY_REVOKED: 'dauth.authority.revoked',
  APPROVAL_RULE_CREATED: 'dauth.approval-rule.created',
  APPROVAL_RULE_DEACTIVATED: 'dauth.approval-rule.deactivated',

  // Delegation
  DELEGATION_EXPIRED: 'dauth.delegation.expired',
  DELEGATION_ACTION_EXECUTED: 'dauth.delegation.action_executed',

  // Invitation
  INVITATION_CREATED: 'dauth.invitation.created',

  // Maker-Checker
  MAKER_CHECKER_SUBMITTED: 'dauth.maker_checker.submitted',
  MAKER_CHECKER_APPROVED: 'dauth.maker_checker.approved',
  MAKER_CHECKER_REJECTED: 'dauth.maker_checker.rejected',

  // Audit & Access Reviews
  ACCESS_REVIEW_CREATED: 'dauth.access_review.created',
  ACCESS_REVIEW_COMPLETED: 'dauth.access_review.completed',

  // Separation of Duties
  SOD_CONFLICTS_DETECTED: 'dauth.sod.conflicts_detected',
  SOD_POLICY_CREATED: 'dauth.sod.policy_created',
  SOD_POLICY_DEACTIVATED: 'dauth.sod.policy_deactivated',
  SOD_WAIVER_GRANTED: 'dauth.sod.waiver_granted',
} as const;

export type DauthEventType = typeof DAUTH_EVENTS[keyof typeof DAUTH_EVENTS];

// ── Event Payload Types ──────────────────────────────────────────

export interface DauthEventPayload {
  [DAUTH_EVENTS.LOGIN_SUCCESS]: { userId: string; ip?: string; method?: string };
  [DAUTH_EVENTS.LOGIN_FAILURE]: { userId?: string; email?: string; ip?: string; reason?: string };
  [DAUTH_EVENTS.REGISTRATION_COMPLETED]: { userId: string; email: string };
  [DAUTH_EVENTS.ACCOUNT_LOCKED]: { userId: string; reason?: string };
  [DAUTH_EVENTS.PASSWORD_RESET_REQUESTED]: { userId: string; email: string };
  [DAUTH_EVENTS.PASSWORD_RESET_COMPLETED]: { userId: string };
  [DAUTH_EVENTS.SESSION_REVOKED]: { userId: string; sessionId: string; revokedBy?: string };
  [DAUTH_EVENTS.SESSIONS_BULK_REVOKED]: { userId: string; count: number };
  [DAUTH_EVENTS.SECURITY_EVENT]: { userId: string; eventType: string; occurredAt: string };
  [DAUTH_EVENTS.ROLE_ASSIGNED]: { userId: string; roleCode: string; assignedBy?: string };
  [DAUTH_EVENTS.ROLE_REVOKED]: { userId: string; roleCode: string; revokedBy?: string };
  [DAUTH_EVENTS.PERMISSION_ASSIGNED]: { permissionCode: string; roleCode: string; assignedBy?: string };
  [DAUTH_EVENTS.PERMISSION_REVOKED]: { permissionCode: string; roleCode: string; revokedBy?: string };
  [DAUTH_EVENTS.DELEGATION_EXPIRED]: { delegationId: string; fromUserId: string; toUserId: string };
  [DAUTH_EVENTS.DELEGATION_ACTION_EXECUTED]: { actingUserId: string; onBehalfOfUserId: string; action?: string };
  [DAUTH_EVENTS.SOD_CONFLICTS_DETECTED]: { userId?: string; conflicts?: unknown; count?: number; securityOfficerUserId?: string };
  [DAUTH_EVENTS.SOD_WAIVER_GRANTED]: { userId: string; ruleId: string; grantedBy: string };
  [DAUTH_EVENTS.ACCESS_REVIEW_CREATED]: { reviewId: string; userId: string; reviewerId: string };
  [DAUTH_EVENTS.ACCESS_REVIEW_COMPLETED]: { reviewId: string; reviewerId: string; decision: string };
}
