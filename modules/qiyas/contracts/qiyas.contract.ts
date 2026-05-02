export interface QiyasAssessmentContract {
  assessmentId: string;
  tenantId: string;
  frameworkId: string;
  maturityModelId: string;
  nameEn: string;
  nameAr: string | null;
  assessmentType: 'full' | 'gap' | 'delta' | 'readiness' | 'self';
  status: 'draft' | 'in_progress' | 'under_review' | 'completed' | 'cancelled';
  overallScore: number | null;
  maturityLevel: number | null;
  targetMaturityLevel: number | null;
  conductedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QiyasMaturityModelContract {
  modelId: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  levels: QiyasMaturityLevelContract[];
  dimensionCount: number;
  status: 'active' | 'draft' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}

export interface QiyasMaturityLevelContract {
  level: number;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  minScore: number;
  maxScore: number;
}

export interface QiyasDimensionScoreContract {
  dimensionId: string;
  assessmentId: string;
  dimensionCode: string;
  nameEn: string;
  nameAr: string | null;
  score: number;
  maxScore: number;
  maturityLevel: number;
  gapCount: number;
  evidenceCount: number;
}

export interface QiyasGapAnalysisContract {
  gapId: string;
  assessmentId: string;
  tenantId: string;
  dimensionCode: string;
  capabilityCode: string | null;
  gapType: 'missing_capability' | 'insufficient_maturity' | 'missing_evidence' | 'process_gap' | 'tool_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentLevel: number;
  targetLevel: number;
  descriptionEn: string;
  remediationId: string | null;
  status: 'open' | 'planned' | 'in_progress' | 'closed';
  createdAt: string;
}

export interface QiyasRoadmapItemContract {
  roadmapId: string;
  tenantId: string;
  assessmentId: string;
  titleEn: string;
  titleAr: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high' | 'very_high';
  targetQuarter: string | null;
  ownerId: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
  expectedMaturityGain: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QiyasBenchmarkContract {
  benchmarkId: string;
  tenantId: string;
  assessmentId: string;
  cohortType: 'industry' | 'region' | 'size' | 'custom';
  cohortCode: string;
  tenantScore: number;
  cohortAvgScore: number;
  cohortMedianScore: number;
  percentile: number | null;
  sampleSize: number;
  capturedAt: string;
}

export interface QiyasStrategyDirectionContract {
  directionId: string;
  tenantId: string;
  assessmentId: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  targetMaturityLevel: number;
  timeframeMonths: number;
  investmentLevel: 'minimal' | 'moderate' | 'significant' | 'transformational';
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'abandoned';
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QiyasDiagnosticsContract {
  tenantId: string;
  totalAssessments: number;
  completedAssessments: number;
  avgMaturityScore: number | null;
  currentMaturityLevel: number | null;
  openGaps: number;
  criticalGaps: number;
  activeRoadmapItems: number;
  overdueRoadmapItems: number;
  latestBenchmarkPercentile: number | null;
  capturedAt: string;
}

export interface QiyasListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  assessmentType?: string;
  frameworkId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QiyasListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
