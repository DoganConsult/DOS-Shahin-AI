export type VendorStatus = 'prospect' | 'onboarding' | 'active' | 'under_review' | 'suspended' | 'offboarding' | 'terminated' | 'archived';

export type VendorRiskTier = 'critical' | 'high' | 'medium' | 'low';

export type DueDiligenceStatus = 'not_started' | 'in_progress' | 'completed' | 'expired' | 'failed';

export interface VendorContract {
  vendorId: string;
  tenantId: string;
  name: string;
  code: string;
  status: VendorStatus;
  riskTier: VendorRiskTier;
  category: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  contractExpiryDate: string | null;
  lastAssessmentDate: string | null;
  nextAssessmentDate: string | null;
  dueDiligenceStatus: DueDiligenceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAssessmentContract {
  assessmentId: string;
  vendorId: string;
  assessmentType: 'initial' | 'periodic' | 'event_driven';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  overallScore: number | null;
  completedAt: string | null;
  nextDueDate: string | null;
}

export interface VendorDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalVendors: number;
  expiredContracts: number;
  overdueAssessments: number;
  criticalTierVendors: number;
  staleOnboarding: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface VendorDashboardContract {
  totalVendors: number;
  byStatus: Record<string, number>;
  byRiskTier: Record<string, number>;
  expiredContracts: number;
  overdueAssessments: number;
  pendingOnboarding: number;
  avgAssessmentScore: number | null;
  criticalVendorsCount: number;
}
