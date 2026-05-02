import type { ExceptionContract, ExceptionRenewalContract, ExceptionDiagnosticsContract } from '../contracts/exception.contracts';

export function mockException(overrides?: Partial<ExceptionContract>): ExceptionContract {
  return {
    exceptionId: 'exc-001',
    tenantId: 'tenant-001',
    titleEn: 'Password Policy Exception',
    titleAr: null,
    exceptionType: 'policy',
    status: 'active',
    requestedById: 'user-001',
    approverId: 'user-002',
    rationale: 'Legacy system cannot support new password requirements',
    riskAssessment: 'Medium risk — compensating MFA control in place',
    compensatingControlIds: ['ctrl-005'],
    linkedPolicyIds: ['pol-001'],
    linkedControlIds: [],
    linkedRiskIds: ['risk-003'],
    effectiveDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
    renewalCount: 0,
    lastRenewalDate: null,
    approvedAt: new Date().toISOString(),
    revokedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockExceptionRenewal(overrides?: Partial<ExceptionRenewalContract>): ExceptionRenewalContract {
  return {
    renewalId: 'ren-001',
    exceptionId: 'exc-001',
    renewalNumber: 1,
    requestedById: 'user-001',
    justification: 'System migration delayed by 6 months',
    newExpiryDate: new Date(Date.now() + 360 * 86400000).toISOString(),
    status: 'pending',
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockExceptionDiagnostics(overrides?: Partial<ExceptionDiagnosticsContract>): ExceptionDiagnosticsContract {
  return {
    moduleCode: 'exception',
    healthy: true,
    totalExceptions: 25,
    activeExceptions: 12,
    expiringCount: 3,
    expiredCount: 2,
    overdueRenewals: 1,
    blockedApprovals: 0,
    highRiskExceptions: 4,
    checks: [
      { name: 'exception-intake', passed: true },
      { name: 'renewal-pipeline', passed: true },
      { name: 'expiry-monitoring', passed: true },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockExceptionList(count = 5): ExceptionContract[] {
  return Array.from({ length: count }, (_, i) =>
    mockException({ exceptionId: `exc-${String(i + 1).padStart(3, '0')}`, titleEn: `Exception ${i + 1}` })
  );
}
