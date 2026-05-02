export interface VendorEngagementContract {
  engagementId: string;
  tenantId: string;
  vendorName: string;
  vendorNameAr: string | null;
  vendorType: 'technology' | 'consulting' | 'outsourcing' | 'cloud' | 'managed_service' | 'other';
  status: 'prospective' | 'onboarding' | 'active' | 'under_review' | 'suspended' | 'offboarding' | 'terminated';
  riskTier: 'critical' | 'high' | 'medium' | 'low';
  engagementScore: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractValue: number | null;
  currency: string | null;
  ownerId: string | null;
  countryCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRiskAssessmentContract {
  assessmentId: string;
  engagementId: string;
  tenantId: string;
  assessmentType: 'initial' | 'periodic' | 'triggered' | 'exit';
  status: 'draft' | 'in_progress' | 'under_review' | 'completed' | 'expired';
  overallRiskScore: number | null;
  riskCategories: VendorRiskCategoryScore[];
  conductedBy: string | null;
  completedAt: string | null;
  nextDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRiskCategoryScore {
  category: string;
  score: number;
  maxScore: number;
  findings: number;
}

export interface VendorDueDiligenceContract {
  ddId: string;
  engagementId: string;
  tenantId: string;
  ddType: 'pre_engagement' | 'ongoing' | 'exit';
  status: 'not_started' | 'in_progress' | 'completed' | 'expired' | 'waived';
  stepsTotal: number;
  stepsCompleted: number;
  completionPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface VendorSlaDefinitionContract {
  slaId: string;
  engagementId: string;
  tenantId: string;
  nameEn: string;
  nameAr: string | null;
  metricType: 'uptime' | 'response_time' | 'resolution_time' | 'throughput' | 'quality' | 'custom';
  targetValue: number;
  unit: string;
  measurementFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  penaltyClause: string | null;
  status: 'active' | 'inactive' | 'breached';
  breachCount: number;
  lastMeasuredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFourthPartyRiskContract {
  fourthPartyId: string;
  engagementId: string;
  tenantId: string;
  subcontractorName: string;
  serviceProvided: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  concentrationRisk: boolean;
  countryCode: string | null;
  status: 'identified' | 'assessed' | 'approved' | 'flagged' | 'blocked';
  createdAt: string;
}

export interface VendorConcentrationAnalysisContract {
  analysisId: string;
  tenantId: string;
  dimension: 'service_type' | 'geography' | 'vendor_group' | 'technology' | 'contract_value';
  concentrationLevel: 'critical' | 'high' | 'moderate' | 'acceptable';
  vendorCount: number;
  totalExposure: number;
  topVendorShare: number;
  details: Record<string, unknown>;
  capturedAt: string;
}

export interface VendorPortalTokenContract {
  tokenId: string;
  engagementId: string;
  tenantId: string;
  contactEmail: string;
  status: 'active' | 'expired' | 'revoked';
  issuedAt: string;
  expiresAt: string;
  lastAccessedAt: string | null;
}

export interface VendorDiagnosticsContract {
  tenantId: string;
  totalEngagements: number;
  activeEngagements: number;
  criticalTierCount: number;
  overdueAssessments: number;
  expiredDueDiligence: number;
  slaBreaches: number;
  concentrationAlerts: number;
  fourthPartyFlagged: number;
  avgEngagementScore: number | null;
  capturedAt: string;
}

export interface VendorAdminSettingsContract {
  assessmentCadenceDays: number;
  ddExpiryDays: number;
  slaBreachEscalationEnabled: boolean;
  concentrationThresholdPercent: number;
  fourthPartyTrackingEnabled: boolean;
  portalEnabled: boolean;
  portalTokenExpiryDays: number;
}

export interface VendorListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  riskTier?: string;
  vendorType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VendorListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
