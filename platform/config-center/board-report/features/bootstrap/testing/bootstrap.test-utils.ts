import type { BootstrapSessionContract, BootstrapTemplateContract, BootstrapDiagnosticsContract } from '../contracts/bootstrap.contracts';
export function mockBootstrapSession(overrides?: Partial<BootstrapSessionContract>): BootstrapSessionContract {
  return { sessionId: 'bs-001', tenantId: 'tenant-001', initiatedById: 'user-001', status: 'completed', templateCode: 'default',
    steps: [{ stepCode: 'init', stepName: 'Initialize', sequenceNo: 1, status: 'completed', result: null, errorMessage: null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 1200 }],
    totalSteps: 5, completedSteps: 5, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    failureReason: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockBootstrapTemplate(overrides?: Partial<BootstrapTemplateContract>): BootstrapTemplateContract {
  return { templateCode: 'default', nameEn: 'Standard Bootstrap', nameAr: null, description: 'Default tenant bootstrap template', stepCount: 5, isDefault: true, ...overrides };
}
export function mockBootstrapDiagnostics(overrides?: Partial<BootstrapDiagnosticsContract>): BootstrapDiagnosticsContract {
  return { moduleCode: 'bootstrap', healthy: true, totalSessions: 20, activeSessions: 1, failedSessions: 2, stuckSessions: 0,
    avgCompletionMs: 45000, checks: [{ name: 'bootstrap-pipeline', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
