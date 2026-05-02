import type { GovernanceRitualContract, GovernanceCouncilContract, GovernanceOsDiagnosticsContract } from '../contracts/governance-os.contracts';
export function mockRitual(overrides?: Partial<GovernanceRitualContract>): GovernanceRitualContract {
  return { ritualId: 'rit-001', tenantId: 'tenant-001', code: 'BOARD-QUARTERLY', titleEn: 'Quarterly Board Risk Review', titleAr: null,
    status: 'scheduled', frequency: 'quarterly', ownerId: 'user-001', participantIds: ['user-001', 'user-002', 'user-003'],
    nextOccurrence: new Date(Date.now() + 30 * 86400000).toISOString(), lastCompletedAt: new Date().toISOString(), agenda: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockCouncil(overrides?: Partial<GovernanceCouncilContract>): GovernanceCouncilContract {
  return { councilId: 'cncl-001', tenantId: 'tenant-001', nameEn: 'Risk Committee', nameAr: null, status: 'active',
    chairId: 'user-001', memberIds: ['user-001', 'user-002', 'user-003'], mandate: 'Oversee enterprise risk management',
    meetingFrequency: 'Monthly', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockGovOsDiagnostics(overrides?: Partial<GovernanceOsDiagnosticsContract>): GovernanceOsDiagnosticsContract {
  return { moduleCode: 'governance-os', healthy: true, totalRituals: 12, overdueRituals: 1, activeCouncils: 4, suspendedCouncils: 0,
    checks: [{ name: 'ritual-cadence', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
