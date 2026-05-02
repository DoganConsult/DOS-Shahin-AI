export interface ExceptionListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  riskLevel?: string;
  expiryStatus?: string;
  requestedBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ExceptionListResponse {
  success: boolean;
  data: ExceptionEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface ExceptionDetailResponse {
  success: boolean;
  data: ExceptionEntityContract | null;
  justification?: ExceptionJustificationContract;
  compensatingControls?: ExceptionCompensatingControlContract[];
  renewal?: ExceptionRenewalContract;
}

export interface ExceptionMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type ExceptionStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'expiring' | 'expired' | 'revoked' | 'closed';

export interface ExceptionEntityContract {
  exceptionId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: ExceptionStatus;
  requestedBy: string;
  requestedAt: string;
  exceptionType: 'policy' | 'control' | 'compliance' | 'risk_acceptance' | 'process';
  linkedPolicyId?: string;
  linkedControlId?: string;
  linkedRiskId?: string;
  linkedObligationId?: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  approvedBy?: string;
  approvedAt?: string;
  effectiveDate?: string;
  expiryDate?: string;
  renewalCount: number;
  owner?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExceptionJustificationContract {
  exceptionId: string;
  businessJustification: string;
  riskAcceptanceStatement?: string;
  impactAnalysis?: string;
  alternativesConsidered?: string[];
  justifiedBy: string;
  justifiedAt: string;
}

export interface ExceptionCompensatingControlContract {
  linkId: string;
  exceptionId: string;
  controlId: string;
  controlTitle: string;
  effectivenessRating: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  linkedBy: string;
  linkedAt: string;
}

export interface ExceptionRenewalContract {
  renewalId: string;
  exceptionId: string;
  renewalNumber: number;
  previousExpiryDate: string;
  newExpiryDate: string;
  renewalJustification: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ExceptionStatusTransitionContract {
  exceptionId: string;
  fromStatus: ExceptionStatus;
  toStatus: ExceptionStatus;
  transitionedBy: string;
  transitionedAt: string;
  reason?: string;
  evidenceIds?: string[];
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface ExceptionReviewApprovalContract {
  reviewId: string;
  exceptionId: string;
  reviewType: 'initial_approval' | 'renewal_approval' | 'revocation' | 'closure';
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

export interface ExceptionDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  expiryPipeline: {
    approachingExpiry30Days: number;
    approachingExpiry7Days: number;
    expiredNotClosed: number;
  };
  approvalHealth: {
    blockedApprovals: number;
    averageApprovalDays: number;
    pendingOver7Days: number;
  };
  compensatingControlHealth: {
    exceptionsWithoutCompensating: number;
    ineffectiveCompensatingControls: number;
  };
  staleExceptions: {
    noUpdateIn90Days: number;
    highRiskStale: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface ExceptionDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<ExceptionStatus, number>;
  riskLevelBreakdown: Record<string, number>;
  expiringThisMonth: number;
  overdueRenewals: number;
  highRiskActive: number;
  approvalLatencyAvg: number;
  revokedThisQuarter: number;
  trends: { date: string; activeCount: number; expiredCount: number }[];
}
