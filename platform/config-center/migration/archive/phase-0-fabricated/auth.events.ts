/**
 * Auth Service Event Contracts
 * Publisher: auth-service
 * These events are consumed by onboarding-service, audit-service, and others.
 */

export interface AuthIdentityCreatedPayload {
  userId: string;
  email: string;
  provider: 'local' | 'saml' | 'oidc' | 'scim';
  tenantId: string;
}

export interface AuthSessionStartedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  ip: string;
  userAgent: string;
}

export interface AuthAccessChangedPayload {
  userId: string;
  tenantId: string;
  addedPermissions: string[];
  removedPermissions: string[];
  changedRoles: string[];
}

export interface AuthDelegationCreatedPayload {
  delegationId: string;
  delegatorId: string;
  delegateeId: string;
  tenantId: string;
  permissions: string[];
  expiresAt: string;
}

export interface AuthSodConflictPayload {
  userId: string;
  tenantId: string;
  ruleId: string;
  conflictingPermissions: [string, string];
  resolution: 'denied' | 'flagged';
}

export const AUTH_EVENT_TYPES = {
  identityCreated: 'dauth.identity.created',
  identityUpdated: 'dauth.identity.updated',
  sessionStarted: 'dauth.session.started',
  sessionEnded: 'dauth.session.ended',
  accessChanged: 'dauth.access.changed',
  loginFailed: 'dauth.login.failed',
  loginSucceeded: 'dauth.login.succeeded',
  mfaEnabled: 'dauth.mfa.enabled',
  delegationCreated: 'dauth.delegation.created',
  delegationRevoked: 'dauth.delegation.revoked',
  sodConflictDetected: 'dauth.sod.conflict_detected',
} as const;
