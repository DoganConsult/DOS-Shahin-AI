export interface PortalsListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  portalType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PortalsListResponse {
  success: boolean;
  data: PortalDefinitionContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface PortalsDetailResponse {
  success: boolean;
  data: PortalDefinitionContract | null;
  accessConfig?: PortalAccessContract;
  submissions?: PortalSubmissionContract[];
}

export interface PortalsMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type PortalStatus = 'draft' | 'active' | 'suspended' | 'retired' | 'archived';

export interface PortalDefinitionContract {
  portalId: string;
  tenantId: string;
  title: string;
  description?: string;
  portalType: 'vendor' | 'audit' | 'compliance' | 'stakeholder' | 'public' | 'custom';
  status: PortalStatus;
  owner: string;
  url?: string;
  brandingConfig?: Record<string, unknown>;
  allowedDomains?: string[];
  expiresAt?: string;
  maxUsers?: number;
  activeUserCount: number;
  linkedModules: string[];
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortalAccessContract {
  portalId: string;
  tenantId: string;
  accessType: 'token' | 'sso' | 'password' | 'invitation_only';
  registrationEnabled: boolean;
  approvalRequired: boolean;
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  ipWhitelist?: string[];
  activeTokenCount: number;
  lastAccessAt?: string;
}

export interface PortalSubmissionContract {
  submissionId: string;
  portalId: string;
  tenantId: string;
  submissionType: string;
  submittedBy: string;
  submittedByExternalId?: string;
  submittedAt: string;
  status: 'received' | 'under_review' | 'accepted' | 'rejected' | 'needs_revision';
  targetModule?: string;
  targetEntityId?: string;
  data: Record<string, unknown>;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
}

export interface PortalExternalUserContract {
  externalUserId: string;
  portalId: string;
  tenantId: string;
  email: string;
  name?: string;
  organization?: string;
  role: 'submitter' | 'reviewer' | 'viewer';
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  invitedBy: string;
  invitedAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface PortalStatusTransitionContract {
  portalId: string;
  fromStatus: PortalStatus;
  toStatus: PortalStatus;
  transitionedBy: string;
  transitionedAt: string;
  reason?: string;
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface PortalReviewApprovalContract {
  reviewId: string;
  entityId: string;
  entityType: 'portal' | 'submission' | 'user';
  reviewType: 'portal_activation' | 'submission_review' | 'user_approval' | 'portal_retirement';
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface PortalDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  portalHealth: {
    activePortals: number;
    expiredPortals: number;
    portalsWithoutOwner: number;
    suspendedPortals: number;
  };
  accessHealth: {
    expiredTokens: number;
    staleSessions: number;
    unauthorizedAttempts: number;
  };
  submissionHealth: {
    pendingReviewCount: number;
    overdueReviews: number;
    rejectionRate: number;
  };
  externalUserHealth: {
    pendingApprovals: number;
    inactiveUsers90Days: number;
    revokedUsers: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface PortalDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<PortalStatus, number>;
  typeBreakdown: Record<string, number>;
  totalExternalUsers: number;
  activeExternalUsers: number;
  submissionsThisMonth: number;
  pendingReviewCount: number;
  averageReviewDays: number;
  trends: { date: string; submissionCount: number; userCount: number }[];
}
