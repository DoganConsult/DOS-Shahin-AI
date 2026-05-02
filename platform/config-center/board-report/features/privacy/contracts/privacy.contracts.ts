export type PrivacyStatus = 'draft' | 'under_review' | 'active' | 'non_compliant' | 'remediation' | 'archived';
export type ProcessingBasis = 'consent' | 'contract' | 'legal_obligation' | 'vital_interest' | 'public_task' | 'legitimate_interest';
export type DataCategory = 'personal' | 'sensitive' | 'biometric' | 'financial' | 'health' | 'children' | 'criminal';

export interface ProcessingActivityContract {
  activityId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  status: PrivacyStatus; processingBasis: ProcessingBasis; dataCategoriesProcessed: DataCategory[];
  purpose: string; ownerId: string; dpoReviewedById: string | null;
  dataSubjectCategories: string[]; recipientCategories: string[];
  retentionPeriodDays: number | null; crossBorderTransfer: boolean; transferSafeguard: string | null;
  dpiaRequired: boolean; dpiaCompletedAt: string | null;
  lastReviewDate: string | null; nextReviewDate: string | null;
  createdAt: string; updatedAt: string;
}

export interface PrivacyAssessmentContract {
  assessmentId: string; activityId: string; assessmentType: 'dpia' | 'pia' | 'tia';
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  riskLevel: 'high' | 'medium' | 'low' | null;
  assessedById: string; completedAt: string | null; findings: string | null;
}

export interface PrivacyDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalActivities: number;
  nonCompliantCount: number; overdueReviews: number; pendingDpias: number;
  crossBorderWithoutSafeguard: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface PrivacyDashboardContract {
  totalActivities: number; byStatus: Record<string, number>; byBasis: Record<string, number>;
  nonCompliantCount: number; crossBorderCount: number; pendingDpias: number;
  overdueReviews: number; dataCategories: Record<string, number>;
}
