import type { BcpPlanContract, BcpExerciseContract, BcpDiagnosticsContract } from '../contracts/bcp.contracts';
export function mockBcpPlan(overrides?: Partial<BcpPlanContract>): BcpPlanContract {
  return { planId: 'bcp-001', tenantId: 'tenant-001', titleEn: 'Data Center Disaster Recovery', titleAr: null,
    status: 'active', ownerId: 'user-001', approverId: 'user-002', scenarioDescription: 'Full DC failure scenario',
    recoveryStrategy: 'hot_standby', rtoHours: 4, rpoHours: 1, linkedAssetIds: ['ast-001'], linkedRiskIds: ['risk-001'],
    lastExerciseDate: new Date().toISOString(), nextExerciseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    approvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockBcpExercise(overrides?: Partial<BcpExerciseContract>): BcpExerciseContract {
  return { exerciseId: 'ex-001', planId: 'bcp-001', title: 'Q1 DR Drill', status: 'completed', exerciseType: 'simulation',
    scheduledDate: new Date().toISOString(), conductedAt: new Date().toISOString(), outcome: 'pass', findings: null,
    participantCount: 15, createdAt: new Date().toISOString(), ...overrides };
}
export function mockBcpDiagnostics(overrides?: Partial<BcpDiagnosticsContract>): BcpDiagnosticsContract {
  return { moduleCode: 'bcp', healthy: true, totalPlans: 8, activePlans: 5, outdatedPlans: 1, overdueExercises: 2, noOwnerPlans: 0,
    checks: [{ name: 'plan-coverage', passed: true }, { name: 'exercise-cadence', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockBcpPlanList(count = 5): BcpPlanContract[] { return Array.from({ length: count }, (_, i) => mockBcpPlan({ planId: `bcp-${String(i+1).padStart(3,'0')}`, titleEn: `BCP Plan ${i+1}` })); }
