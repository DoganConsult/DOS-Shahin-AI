export type PolicyStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'under_revision' | 'retired' | 'archived';

export type PolicyType = 'corporate' | 'operational' | 'technical' | 'regulatory' | 'standard' | 'guideline' | 'procedure';

export interface PolicyContract {
  policyId: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string | null;
  policyType: PolicyType;
  status: PolicyStatus;
  version: number;
  ownerId: string;
  approvedById: string | null;
  approvedAt: string | null;
  effectiveDate: string | null;
  reviewDueDate: string | null;
  retiredAt: string | null;
  parentPolicyId: string | null;
  linkedFrameworkIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersionContract {
  versionId: string;
  policyId: string;
  versionNumber: number;
  changeSummary: string;
  content: string;
  createdById: string;
  createdAt: string;
}

export interface PolicyAcknowledgementContract {
  acknowledgementId: string;
  policyId: string;
  userId: string;
  acknowledgedAt: string;
  version: number;
}

export interface PolicyDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalPolicies: number;
  overdueReviews: number;
  draftWithoutOwner: number;
  expiredWithoutRenewal: number;
  unacknowledgedCount: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface PolicyDashboardContract {
  totalPolicies: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  overdueReviews: number;
  pendingApprovals: number;
  recentlyPublished: number;
  acknowledgementRate: number;
  avgReviewCycleDays: number | null;
}
