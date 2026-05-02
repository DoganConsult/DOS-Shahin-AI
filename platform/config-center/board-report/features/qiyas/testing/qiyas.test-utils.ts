import type { QiyasAssessmentContract, QiyasBenchmarkContract, QiyasDiagnosticsContract } from '../contracts/qiyas.contracts';
export function mockQiyasAssessment(overrides?: Partial<QiyasAssessmentContract>): QiyasAssessmentContract {
  return { assessmentId: 'qiy-001', tenantId: 'tenant-001', code: 'Q1-2026', titleEn: 'Q1 2026 GRC Maturity Assessment', titleAr: null,
    status: 'published', assessmentPeriod: 'Q1 2026',
    dimensions: [
      { dimension: 'governance', score: 78, maturityLevel: 4, weight: 0.2, gapCount: 2, evidenceCount: 15 },
      { dimension: 'risk_management', score: 72, maturityLevel: 3, weight: 0.2, gapCount: 4, evidenceCount: 12 },
      { dimension: 'compliance', score: 85, maturityLevel: 4, weight: 0.15, gapCount: 1, evidenceCount: 20 },
      { dimension: 'controls', score: 68, maturityLevel: 3, weight: 0.15, gapCount: 5, evidenceCount: 10 },
      { dimension: 'incident_response', score: 60, maturityLevel: 3, weight: 0.1, gapCount: 3, evidenceCount: 8 },
      { dimension: 'resilience', score: 55, maturityLevel: 2, weight: 0.1, gapCount: 6, evidenceCount: 5 },
      { dimension: 'privacy', score: 70, maturityLevel: 3, weight: 0.1, gapCount: 3, evidenceCount: 9 },
    ],
    overallScore: 71, overallMaturityLevel: 3, assessorId: 'user-001', reviewerId: 'user-002',
    benchmarkComparison: { industryAvg: 65, percentile: 72 },
    submittedAt: new Date().toISOString(), publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockQiyasBenchmark(overrides?: Partial<QiyasBenchmarkContract>): QiyasBenchmarkContract {
  return { benchmarkId: 'qb-001', dimension: 'governance', period: 'Q1 2026', industryAvg: 65, topQuartile: 82, bottomQuartile: 48,
    sampleSize: 150, updatedAt: new Date().toISOString(), ...overrides };
}
export function mockQiyasDiagnostics(overrides?: Partial<QiyasDiagnosticsContract>): QiyasDiagnosticsContract {
  return { moduleCode: 'qiyas', healthy: true, totalAssessments: 12, inProgressCount: 1, overdueSubmissions: 0, staleAssessments: 0,
    avgScore: 71, checks: [{ name: 'assessment-pipeline', passed: true }, { name: 'benchmark-freshness', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides };
}
export function mockQiyasAssessmentList(count = 5): QiyasAssessmentContract[] { return Array.from({ length: count }, (_, i) => mockQiyasAssessment({ assessmentId: `qiy-${String(i+1).padStart(3,'0')}`, titleEn: `Assessment ${i+1}` })); }
