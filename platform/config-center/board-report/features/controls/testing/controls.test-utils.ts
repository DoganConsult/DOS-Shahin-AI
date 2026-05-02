import type { ControlContract, ControlMappingContract, ControlTestResultContract, ControlDiagnosticsContract } from '../contracts/controls.contracts';

export function mockControl(overrides?: Partial<ControlContract>): ControlContract {
  return {
    controlId: 'ctrl-001',
    tenantId: 'tenant-001',
    code: 'AC-001',
    titleEn: 'Access Review Control',
    titleAr: null,
    description: 'Quarterly user access review for critical systems',
    category: 'detective',
    status: 'active',
    automationState: 'semi_automated',
    ownerId: 'user-001',
    designEffectiveness: 'effective',
    operatingEffectiveness: 'effective',
    lastTestedAt: new Date().toISOString(),
    nextTestDueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    linkedFrameworkIds: ['fw-001'],
    linkedRiskIds: ['risk-001'],
    linkedPolicyIds: ['pol-001'],
    linkedEvidenceIds: [],
    taxonomyTags: ['access', 'review'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockControlMapping(overrides?: Partial<ControlMappingContract>): ControlMappingContract {
  return {
    mappingId: 'map-001',
    controlId: 'ctrl-001',
    targetType: 'framework',
    targetId: 'fw-001',
    targetName: 'ISO 27001 A.9.2.5',
    mappingStrength: 'primary',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockControlTestResult(overrides?: Partial<ControlTestResultContract>): ControlTestResultContract {
  return {
    testId: 'test-001',
    controlId: 'ctrl-001',
    testType: 'operating',
    result: 'effective',
    testerId: 'user-002',
    testedAt: new Date().toISOString(),
    findings: null,
    evidenceIds: [],
    nextScheduledDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    ...overrides,
  };
}

export function mockControlDiagnostics(overrides?: Partial<ControlDiagnosticsContract>): ControlDiagnosticsContract {
  return {
    moduleCode: 'controls',
    healthy: true,
    totalControls: 120,
    activeControls: 95,
    ineffectiveControls: 5,
    overdueTests: 8,
    ownershipGaps: 2,
    unmappedControls: 12,
    automationCoverage: 45,
    checks: [
      { name: 'control-library', passed: true },
      { name: 'effectiveness-testing', passed: true },
      { name: 'mapping-completeness', passed: false, detail: '12 unmapped controls' },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockControlList(count = 5): ControlContract[] {
  return Array.from({ length: count }, (_, i) =>
    mockControl({ controlId: `ctrl-${String(i + 1).padStart(3, '0')}`, code: `AC-${String(i + 1).padStart(3, '0')}`, titleEn: `Control ${i + 1}` })
  );
}
