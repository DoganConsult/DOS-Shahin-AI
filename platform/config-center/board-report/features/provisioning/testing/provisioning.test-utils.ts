import type { ProvisioningJobContract, ProvisioningStepContract, ProvisioningDiagnosticsContract } from '../contracts/provisioning.contracts';
export function mockProvisioningJob(overrides?: Partial<ProvisioningJobContract>): ProvisioningJobContract {
  return { jobId: 'prov-001', tenantId: 'tenant-001', sessionId: 'bs-001', status: 'completed', packCode: 'grc-standard',
    totalSteps: 8, completedSteps: 8, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    failureReason: null, retryCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockProvisioningStep(overrides?: Partial<ProvisioningStepContract>): ProvisioningStepContract {
  return { stepId: 'ps-001', jobId: 'prov-001', stepCode: 'create-schema', stepName: 'Create Tenant Schema', sequenceNo: 1,
    status: 'completed', result: null, errorMessage: null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 2500, ...overrides };
}
export function mockProvisioningDiagnostics(overrides?: Partial<ProvisioningDiagnosticsContract>): ProvisioningDiagnosticsContract {
  return { moduleCode: 'provisioning', healthy: true, totalJobs: 30, activeJobs: 1, failedJobs: 2, stuckJobs: 0,
    avgDurationMs: 55000, checks: [{ name: 'provisioning-pipeline', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
