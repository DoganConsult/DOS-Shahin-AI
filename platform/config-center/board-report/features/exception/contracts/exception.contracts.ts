export type ExceptionStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'active' | 'expiring' | 'expired' | 'revoked' | 'closed' | 'archived';

export type ExceptionType = 'policy' | 'control' | 'compliance' | 'risk_acceptance' | 'technical' | 'operational';

export interface ExceptionContract {
  exceptionId: string;
  tenantId: string;
  titleEn: string;
  titleAr: string | null;
  exceptionType: ExceptionType;
  status: ExceptionStatus;
  requestedById: string;
  approverId: string | null;
  rationale: string;
  riskAssessment: string | null;
  compensatingControlIds: string[];
  linkedPolicyIds: string[];
  linkedControlIds: string[];
  linkedRiskIds: string[];
  effectiveDate: string | null;
  expiryDate: string | null;
  renewalCount: number;
  lastRenewalDate: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExceptionRenewalContract {
  renewalId: string;
  exceptionId: string;
  renewalNumber: number;
  requestedById: string;
  justification: string;
  newExpiryDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ExceptionDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalExceptions: number;
  activeExceptions: number;
  expiringCount: number;
  expiredCount: number;
  overdueRenewals: number;
  blockedApprovals: number;
  highRiskExceptions: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface ExceptionDashboardContract {
  totalExceptions: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  activeCount: number;
  expiringCount: number;
  overdueRenewals: number;
  avgDurationDays: number;
  renewalRate: number;
  approvalLatencyHours: number | null;
}
