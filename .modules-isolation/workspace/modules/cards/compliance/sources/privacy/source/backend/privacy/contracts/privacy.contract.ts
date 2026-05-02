export interface PrivacyListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  activityType?: string;
  legalBasis?: string;
  dataSubjectCategory?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PrivacyListResponse {
  success: boolean;
  data: PrivacyProcessingActivityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface PrivacyDetailResponse {
  success: boolean;
  data: PrivacyProcessingActivityContract | null;
  assessment?: PrivacyAssessmentContract;
  obligations?: PrivacyObligationContract[];
}

export interface PrivacyMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type PrivacyStatus = 'draft' | 'under_review' | 'approved' | 'active' | 'suspended' | 'retired' | 'archived';

export interface PrivacyProcessingActivityContract {
  activityId: string;
  tenantId: string;
  title: string;
  description?: string;
  activityType: 'collection' | 'storage' | 'processing' | 'transfer' | 'deletion' | 'sharing';
  status: PrivacyStatus;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interest' | 'public_interest' | 'legitimate_interest';
  dataSubjectCategories: string[];
  dataCategories: string[];
  processingPurpose: string;
  retentionPeriodDays?: number;
  crossBorderTransfer: boolean;
  transferDestinations?: string[];
  dataProtectionOfficer?: string;
  owner?: string;
  linkedVendorIds?: string[];
  linkedAssetIds?: string[];
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyAssessmentContract {
  assessmentId: string;
  activityId: string;
  tenantId: string;
  assessmentType: 'dpia' | 'pia' | 'tia' | 'lia';
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  riskLevel: 'high' | 'medium' | 'low';
  assessor: string;
  startedAt: string;
  completedAt?: string;
  findings?: string;
  mitigationMeasures?: string[];
  dpoReview?: { reviewedBy: string; reviewedAt: string; approved: boolean; comments?: string };
  supervisoryConsultationRequired: boolean;
}

export interface PrivacyObligationContract {
  obligationId: string;
  tenantId: string;
  title: string;
  regulatoryFramework: string;
  obligationType: 'record_keeping' | 'consent_management' | 'breach_notification' | 'data_subject_rights' | 'cross_border' | 'dpo_appointment';
  status: 'pending' | 'in_progress' | 'compliant' | 'non_compliant' | 'not_applicable';
  dueDate?: string;
  owner?: string;
  linkedActivities: string[];
}

export interface PrivacyDataSubjectRequestContract {
  requestId: string;
  tenantId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  subjectIdentifier: string;
  status: 'received' | 'verified' | 'in_progress' | 'completed' | 'rejected';
  receivedAt: string;
  deadlineAt: string;
  completedAt?: string;
  handledBy?: string;
  responseProvided: boolean;
  extensionApplied: boolean;
}

export interface PrivacyStatusTransitionContract {
  activityId: string;
  fromStatus: PrivacyStatus;
  toStatus: PrivacyStatus;
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

export interface PrivacyReviewApprovalContract {
  reviewId: string;
  entityId: string;
  entityType: 'activity' | 'assessment' | 'obligation';
  reviewType: 'approval' | 'dpia_review' | 'dpo_sign_off' | 'retirement';
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

export interface PrivacyDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  processingActivityHealth: {
    activitiesWithoutLegalBasis: number;
    activitiesWithoutAssessment: number;
    stalledActivities: number;
  };
  assessmentHealth: {
    overdueAssessments: number;
    highRiskWithoutMitigation: number;
    pendingDpoReview: number;
  };
  obligationHealth: {
    nonCompliantObligations: number;
    overdueObligations: number;
    pendingObligations: number;
  };
  dsrHealth: {
    overdueRequests: number;
    pendingVerification: number;
    averageResponseDays: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface PrivacyDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  activityStatusBreakdown: Record<PrivacyStatus, number>;
  obligationComplianceRate: number;
  activeDpiaCount: number;
  crossBorderTransferCount: number;
  openDsrCount: number;
  overdueDsrCount: number;
  legalBasisBreakdown: Record<string, number>;
  trends: { date: string; activitiesCount: number; dsrCount: number }[];
}
