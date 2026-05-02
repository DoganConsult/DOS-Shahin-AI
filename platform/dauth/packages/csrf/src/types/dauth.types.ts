export type PrincipalType = 'human' | 'agent' | 'service_account' | 'external';

export type SessionStatus = 'active' | 'expired' | 'revoked' | 'locked';

export type RefreshTokenFamilyStatus = 'active' | 'rotated' | 'revoked';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'mfa_challenge'
  | 'mfa_success'
  | 'mfa_failure'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'session_revoked'
  | 'sessions_revoked'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'role_assigned'
  | 'role_revoked'
  | 'delegation_created'
  | 'delegation_revoked'
  | 'delegation_expired'
  | 'sod_violation'
  | 'access_denied'
  | 'access_review_created'
  | 'access_review_completed'
  | 'brute_force_detected'
  | 'account_locked'
  | 'invitation_sent'
  | 'invitation_accepted';

export interface SessionContext {
  sessionId: string;
  userId: string;
  tenantId: string;
  principalType: PrincipalType;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActivityAt: string;
  status: SessionStatus;
}

export interface RefreshTokenFamily {
  familyId: string;
  userId: string;
  tenantId: string;
  currentJti: string;
  rotationCount: number;
  status: RefreshTokenFamilyStatus;
  createdAt: string;
  expiresAt: string;
}

export interface SecurityPolicyConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordExpiryDays: number;
  invitationExpiryHours: number;
  delegationMaxDurationHours: number;
  selfApprovalAllowed: boolean;
}

export interface AccessReviewRequest {
  reviewId: string;
  tenantId: string;
  userId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'revoked' | 'expired';
  reviewType: 'periodic' | 'triggered' | 'offboarding';
  roleAssignments: string[];
  createdAt: string;
  completedAt: string | null;
}

export interface MakerCheckerDecision {
  decisionId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  makerId: string;
  checkerId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt: string | null;
  reason: string | null;
}
