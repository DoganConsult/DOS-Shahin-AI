import type { ComplianceFrameworkContract, ComplianceObligationContract } from '../contracts/compliance.contracts';

export function mockFramework(overrides?: Partial<ComplianceFrameworkContract>): ComplianceFrameworkContract {
  return {
    frameworkId: 'fw-001',
    code: 'iso-27001',
    nameEn: 'ISO 27001',
    nameAr: null,
    version: '2022',
    status: 'active',
    obligationCount: 114,
    controlMappingCount: 93,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockObligation(overrides?: Partial<ComplianceObligationContract>): ComplianceObligationContract {
  return {
    obligationId: 'obl-001',
    frameworkId: 'fw-001',
    code: 'A.5.1',
    nameEn: 'Information security policies',
    nameAr: null,
    state: 'active',
    ownerId: 'user-001',
    dueDate: null,
    ...overrides,
  };
}
