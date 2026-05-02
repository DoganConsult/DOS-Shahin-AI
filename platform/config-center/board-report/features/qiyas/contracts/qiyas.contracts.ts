export type QiyasAssessmentStatus = 'draft' | 'in_progress' | 'submitted' | 'scored' | 'reviewed' | 'published' | 'archived';
export type QiyasDimension = 'governance' | 'risk_management' | 'compliance' | 'controls' | 'incident_response' | 'resilience' | 'privacy';

export interface QiyasAssessmentContract {
  assessmentId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: QiyasAssessmentStatus; assessmentPeriod: string;
  dimensions: QiyasDimensionScoreContract[];
  overallScore: number | null; overallMaturityLevel: number | null;
  assessorId: string; reviewerId: string | null;
  benchmarkComparison: { industryAvg: number; percentile: number } | null;
  submittedAt: string | null; publishedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface QiyasDimensionScoreContract {
  dimension: QiyasDimension; score: number; maturityLevel: 1 | 2 | 3 | 4 | 5;
  weight: number; gapCount: number; evidenceCount: number;
}

export interface QiyasBenchmarkContract {
  benchmarkId: string; dimension: QiyasDimension; period: string;
  industryAvg: number; topQuartile: number; bottomQuartile: number;
  sampleSize: number; updatedAt: string;
}

export interface QiyasDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalAssessments: number;
  inProgressCount: number; overdueSubmissions: number; staleAssessments: number;
  avgScore: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface QiyasDashboardContract {
  totalAssessments: number; byStatus: Record<string, number>;
  currentPeriodScore: number | null; previousPeriodScore: number | null;
  trendDirection: 'up' | 'down' | 'flat' | null;
  dimensionScores: Array<{ dimension: QiyasDimension; score: number; trend: 'up' | 'down' | 'flat' }>;
  industryBenchmark: number | null; maturityDistribution: Record<string, number>;
}
