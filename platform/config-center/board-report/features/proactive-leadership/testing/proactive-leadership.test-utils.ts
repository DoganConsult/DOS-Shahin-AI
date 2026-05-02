import type { LeadershipInsightContract, ForesightContract, ProactiveLeadershipDiagnosticsContract } from '../contracts/proactive-leadership.contracts';

export function mockLeadershipInsight(overrides?: Partial<LeadershipInsightContract>): LeadershipInsightContract {
  return {
    insightId: 'ins-001', tenantId: 'tenant-001', code: 'INSIGHT-RISK-Q1',
    titleEn: 'Emerging Cyber Risk Trend Detected', titleAr: null,
    status: 'reviewed', insightType: 'risk_foresight', impactArea: 'operational',
    confidence: 0.82,
    narrative: 'Cross-module analysis indicates increasing cyber risk exposure in Q1 driven by third-party dependency changes',
    recommendation: 'Schedule executive review of third-party risk posture and initiate vendor reassessment for top-10 critical vendors',
    sourceModules: ['risk', 'vendor', 'controls'], sourceMetricIds: ['met-001', 'met-002'],
    generatedAt: new Date().toISOString(), presentedAt: null,
    actionedById: null, actionedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockForesight(overrides?: Partial<ForesightContract>): ForesightContract {
  return {
    foresightId: 'frs-001', tenantId: 'tenant-001',
    horizon: '90_day', riskTrend: 'deteriorating', complianceTrend: 'stable',
    keyRisks: ['Third-party cyber exposure', 'Regulatory deadline approaching'],
    keyOpportunities: ['Automation coverage increase opportunity'],
    confidenceScore: 0.75, generatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockProactiveLeadershipDiagnostics(overrides?: Partial<ProactiveLeadershipDiagnosticsContract>): ProactiveLeadershipDiagnosticsContract {
  return {
    moduleCode: 'proactive-leadership', healthy: true, totalInsights: 34,
    pendingReview: 5, staleInsights: 2, avgConfidence: 0.79, generationLatencyMs: 1200,
    checks: [{ name: 'insight-pipeline', passed: true }, { name: 'source-availability', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}
