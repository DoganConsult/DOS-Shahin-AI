import type { RemediationContract, RemediationPlanStepContract, RemediationDiagnosticsContract } from '../contracts/remediation.contracts';

export function mockRemediation(overrides?: Partial<RemediationContract>): RemediationContract {
  return {
    remediationId: 'rem-001', tenantId: 'tenant-001', titleEn: 'Patch Critical Vulnerability', titleAr: null,
    description: 'Apply security patches to affected systems', status: 'in_progress', priority: 'critical',
    source: 'incident', sourceId: 'inc-001', assignedToId: 'user-002', verifiedById: null,
    planSummary: 'Staged rollout of patches across environments', dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    completedAt: null, verifiedAt: null, closedAt: null, escalationCount: 0, isOverdue: false,
    linkedFindingIds: ['find-001'], linkedControlIds: ['ctrl-003'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockPlanStep(overrides?: Partial<RemediationPlanStepContract>): RemediationPlanStepContract {
  return { stepId: 'step-001', remediationId: 'rem-001', stepNumber: 1, title: 'Assess impact', description: 'Evaluate affected systems', assignedToId: 'user-002', status: 'completed', dueDate: new Date().toISOString(), completedAt: new Date().toISOString(), ...overrides };
}

export function mockRemediationDiagnostics(overrides?: Partial<RemediationDiagnosticsContract>): RemediationDiagnosticsContract {
  return { moduleCode: 'remediation', healthy: true, totalRemediations: 35, openCount: 15, overdueCount: 4, blockedCount: 2, escalatedCount: 1, avgClosureDays: 21, pendingVerification: 3, checks: [{ name: 'remediation-pipeline', passed: true }, { name: 'overdue-monitoring', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}

export function mockRemediationList(count = 5): RemediationContract[] {
  return Array.from({ length: count }, (_, i) => mockRemediation({ remediationId: `rem-${String(i + 1).padStart(3, '0')}`, titleEn: `Remediation ${i + 1}` }));
}
