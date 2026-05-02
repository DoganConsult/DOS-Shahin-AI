import type { OnboardingSessionContract, OnboardingStageContract, OnboardingDiagnosticsContract, OnboardingDashboardContract } from '../contracts/onboarding.contracts';

export function mockOnboardingSession(overrides?: Partial<OnboardingSessionContract>): OnboardingSessionContract {
  return {
    id: 'session-001',
    tenantId: null,
    userId: 'user-001',
    status: 'in_progress',
    organizationName: 'Test Corp',
    displayName: 'Test Corp',
    languageCode: 'en',
    currentStageCode: 'organization_identity',
    completedStages: [],
    metadata: {},
    emailVerified: false,
    approvedByUserId: null,
    approvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: [mockOnboardingStage()],
    ...overrides,
  };
}

export function mockOnboardingStage(overrides?: Partial<OnboardingStageContract>): OnboardingStageContract {
  return {
    stageCode: 'organization_identity',
    stageName: 'Organization Identity',
    sequenceNo: 1,
    isRequired: true,
    isCompleted: false,
    isLocked: false,
    completedAt: null,
    ...overrides,
  };
}

export function mockOnboardingDiagnostics(overrides?: Partial<OnboardingDiagnosticsContract>): OnboardingDiagnosticsContract {
  return {
    moduleCode: 'onboarding',
    healthy: true,
    sessionId: 'session-001',
    sessionStatus: 'in_progress',
    emailVerified: false,
    stagesCompleted: [],
    stagesBlocked: [],
    activeJobId: null,
    provisioningHealth: 'not_started',
    failedStepCodes: [],
    lastFailureReason: null,
    retryCount: 0,
    dependencyChecks: [
      { name: 'org_pack_templates', status: 'ok', detail: '3 active packs' },
      { name: 'provisioning_tables', status: 'ok' },
    ],
    correlationId: null,
    checks: [
      { name: 'provisioning_tables_exist', passed: true },
      { name: 'org_pack_templates_available', passed: true, detail: '3 active packs' },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockOnboardingDashboard(overrides?: Partial<OnboardingDashboardContract>): OnboardingDashboardContract {
  return {
    totalSessions: 5,
    byStatus: { in_progress: 2, provisioned: 2, cancelled: 1 },
    activeProvisioningJobs: 1,
    failedProvisioningJobs: 0,
    stuckSessionCount: 0,
    avgProvisioningDurationMs: 45000,
    stageCompletionRates: [],
    recentSessions: [],
    ...overrides,
  };
}
