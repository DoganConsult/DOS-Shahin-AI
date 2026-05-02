import type { JourneyContract, JourneyMilestoneContract, JourneyDiagnosticsContract } from '../contracts/journey.contracts';
export function mockJourney(overrides?: Partial<JourneyContract>): JourneyContract {
  return { journeyId: 'jrn-001', tenantId: 'tenant-001', userId: 'user-001', journeyCode: 'onboard-grc',
    titleEn: 'GRC Onboarding Journey', titleAr: null, status: 'in_progress',
    totalMilestones: 8, completedMilestones: 3, progressPercent: 37.5,
    currentMilestoneCode: 'risk-setup', startedAt: new Date().toISOString(), completedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockMilestone(overrides?: Partial<JourneyMilestoneContract>): JourneyMilestoneContract {
  return { milestoneId: 'ms-001', journeyId: 'jrn-001', code: 'risk-setup', titleEn: 'Configure Risk Module', titleAr: null,
    sequenceNo: 4, status: 'active', completedAt: null, requiredActions: 5, completedActions: 2, ...overrides };
}
export function mockJourneyDiagnostics(overrides?: Partial<JourneyDiagnosticsContract>): JourneyDiagnosticsContract {
  return { moduleCode: 'journey', healthy: true, totalJourneys: 50, activeJourneys: 15, stuckJourneys: 2, abandonedCount: 5,
    avgCompletionDays: 14, checks: [{ name: 'journey-pipeline', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockJourneyList(count = 5): JourneyContract[] { return Array.from({ length: count }, (_, i) => mockJourney({ journeyId: `jrn-${String(i+1).padStart(3,'0')}`, titleEn: `Journey ${i+1}` })); }
