export interface AiSystemRegistryContract {
  systemId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  description: string | null;
  riskLevel: 'unacceptable' | 'high' | 'limited' | 'minimal' | 'unclassified';
  status: 'draft' | 'registered' | 'under_review' | 'approved' | 'deployed' | 'suspended' | 'decommissioned';
  modelId: string | null;
  vendorId: string | null;
  ownerId: string | null;
  departmentId: string | null;
  purpose: string | null;
  deploymentType: 'internal' | 'external' | 'both' | null;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted' | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelCardContract {
  modelCardId: string;
  systemId: string;
  modelName: string;
  modelVersion: string;
  provider: string | null;
  modelType: 'classification' | 'generation' | 'regression' | 'recommendation' | 'nlp' | 'vision' | 'multimodal' | 'other';
  status: 'draft' | 'active' | 'deprecated' | 'retired';
  intendedUse: string | null;
  limitations: string | null;
  trainingDataDescription: string | null;
  biasAssessment: string | null;
  performanceMetrics: Record<string, unknown> | null;
  lastEvaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiPolicyContract {
  policyId: string;
  code: string;
  titleEn: string;
  titleAr: string | null;
  policyType: 'usage' | 'development' | 'deployment' | 'monitoring' | 'ethics' | 'data' | 'transparency';
  status: 'draft' | 'active' | 'under_review' | 'deprecated' | 'archived';
  version: number;
  ownerId: string | null;
  applicableRiskLevels: string[];
  lastReviewedAt: string | null;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiDpiaContract {
  dpiaId: string;
  systemId: string;
  systemCode: string;
  status: 'draft' | 'in_progress' | 'under_review' | 'completed' | 'expired';
  riskScore: number | null;
  mitigationCount: number;
  openMitigationCount: number;
  conductedBy: string | null;
  reviewedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AiSupplyChainContract {
  entryId: string;
  systemId: string;
  vendorName: string;
  componentType: 'model' | 'dataset' | 'api' | 'library' | 'infrastructure' | 'service';
  riskLevel: 'high' | 'medium' | 'low';
  status: 'active' | 'under_review' | 'deprecated' | 'blocked';
  lastAssessedAt: string | null;
  nextReviewDate: string | null;
}

export interface AiGovernanceDiagnosticsContract {
  tenantId: string;
  totalSystems: number;
  highRiskSystems: number;
  registeredSystems: number;
  deployedSystems: number;
  suspendedSystems: number;
  totalModelCards: number;
  activeModelCards: number;
  totalPolicies: number;
  activePolicies: number;
  pendingDpias: number;
  expiredDpias: number;
  overdueReviews: number;
  supplyChainRisks: number;
  capturedAt: string;
}

export interface AiGovernanceAdminSettingsContract {
  reviewCadenceDays: number;
  dpiaExpiryDays: number;
  autoClassificationEnabled: boolean;
  highRiskApprovalRequired: boolean;
  supplyChainMonitoringEnabled: boolean;
  transparencyReportingEnabled: boolean;
}

export interface AiGovernanceListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  riskLevel?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AiGovernanceListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AiGovernanceDetailResponse<T> {
  success: boolean;
  data: T;
}

export interface AiGovernanceMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}
