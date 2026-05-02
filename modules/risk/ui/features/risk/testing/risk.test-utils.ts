import type { RiskEntityContract, KRIContract, TreatmentPlanContract, RiskDiagnosticsContract } from '../contracts/risk.contracts';

export function mockRiskEntity(overrides?: Partial<RiskEntityContract>): RiskEntityContract {
  return {
    riskId: 'risk-001',
    tenantId: 'tenant-001',
    title: 'Operational Risk — IT System Failure',
    description: 'Risk of critical system downtime impacting operations',
    category: 'operational',
    likelihood: 3,
    impact: 4,
    inherentScore: 12,
    residualScore: 8,
    status: 'active',
    owner: 'user-001',
    treatmentStatus: 'in_progress',
    appetiteStatus: 'within',
    nextReviewDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockKRI(overrides?: Partial<KRIContract>): KRIContract {
  return {
    kriId: 'kri-001',
    name: 'System Uptime KRI',
    description: 'Monitors IT system availability',
    linkedRiskId: 'risk-001',
    linkedRiskTitle: 'IT System Failure',
    linkedCategory: 'operational',
    owner: 'user-001',
    currentValue: 99.5,
    threshold: { red: 95, amber: 98, green: 99 },
    status: 'active',
    collectionFrequency: 'daily',
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

export function mockTreatmentPlan(overrides?: Partial<TreatmentPlanContract>): TreatmentPlanContract {
  return {
    treatmentId: 'treat-001',
    title: 'Implement redundant failover',
    description: 'Deploy active-passive failover for critical systems',
    linkedRiskId: 'risk-001',
    linkedRiskTitle: 'IT System Failure',
    strategy: 'mitigate',
    owner: 'user-001',
    status: 'in_progress',
    targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    expectedReduction: 40,
    targetResidualScore: 5,
    overdue: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockRiskDiagnostics(overrides?: Partial<RiskDiagnosticsContract>): RiskDiagnosticsContract {
  return {
    moduleCode: 'risk',
    healthy: true,
    tenantId: 'tenant-001',
    scoringHealth: { modelsCount: 2, risksWithoutScore: 0, staleScores: 1 },
    kriHealth: { totalKris: 15, breachedCount: 2, staleCollectionCount: 0, missingLinkedRisk: 1 },
    treatmentHealth: { totalTreatments: 8, overdueCount: 1, pendingValidationCount: 2, noOwnerCount: 0 },
    approvalHealth: { blockedApprovals: 0, delegatedCount: 1, escalatedCount: 0 },
    warnings: [],
    errors: [],
    checks: [
      { name: 'scoring_models_exist', passed: true },
      { name: 'no_stale_scores', passed: false, detail: '1 stale score detected' },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}
