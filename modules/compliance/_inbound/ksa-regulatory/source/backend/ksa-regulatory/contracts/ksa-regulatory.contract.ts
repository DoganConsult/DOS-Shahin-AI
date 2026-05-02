export interface KsaRegulatoryAuthorityContract {
  authorityId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  website: string | null;
  status: 'active' | 'inactive';
}

export interface KsaRegulatoryObligationContract {
  obligationId: string;
  tenantId: string;
  authorityCode: string;
  frameworkCode: string;
  code: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  status: 'open' | 'in_progress' | 'met' | 'not_met' | 'waived' | 'overdue';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string | null;
  ownerId: string | null;
  evidenceCount: number;
  controlMappingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KsaRegulatoryChangeContract {
  changeId: string;
  tenantId: string;
  authorityCode: string;
  changeType: 'new_regulation' | 'amendment' | 'repeal' | 'guidance' | 'circular' | 'directive';
  titleEn: string;
  titleAr: string | null;
  summaryEn: string | null;
  effectiveDate: string | null;
  detectedAt: string;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'under_review' | 'assessed' | 'implemented' | 'dismissed';
  affectedFrameworks: string[];
  affectedObligations: string[];
  reviewedBy: string | null;
  createdAt: string;
}

export interface KsaRegulatoryReadinessSnapshotContract {
  snapshotId: string;
  tenantId: string;
  authorityCode: string;
  frameworkCode: string | null;
  overallScore: number;
  maturityLevel: number;
  obligationsMet: number;
  obligationsTotal: number;
  gapsIdentified: number;
  criticalGaps: number;
  sectorBenchmark: number | null;
  capturedAt: string;
}

export interface KsaRegulatoryFrameworkMappingContract {
  mappingId: string;
  tenantId: string;
  sourceFrameworkCode: string;
  targetFrameworkCode: string;
  mappingType: 'full' | 'partial' | 'equivalent' | 'superset';
  controlsCovered: number;
  controlsTotal: number;
  coveragePercent: number;
  lastReviewedAt: string | null;
  status: 'active' | 'draft' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}

export interface KsaRegulatoryDiagnosticsContract {
  tenantId: string;
  totalAuthorities: number;
  activeObligations: number;
  overdueObligations: number;
  pendingChanges: number;
  criticalChanges: number;
  avgReadinessScore: number | null;
  staleSnapshots: number;
  unmappedFrameworks: number;
  capturedAt: string;
}

export interface KsaRegulatoryAdminSettingsContract {
  changeDetectionEnabled: boolean;
  changeDetectionCron: string;
  maturityAutoScoreEnabled: boolean;
  sectorBenchmarkEnabled: boolean;
  notifyOnCriticalChange: boolean;
  snapshotRetentionDays: number;
}

export interface KsaRegulatoryListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  authorityCode?: string;
  frameworkCode?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface KsaRegulatoryListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
