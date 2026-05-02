import type { DoraObligationContract, DoraResilienceAssessmentContract, DoraDiagnosticsContract } from '../contracts/dora.contracts';
export function mockDoraObligation(overrides?: Partial<DoraObligationContract>): DoraObligationContract {
  return { obligationId: 'dora-001', tenantId: 'tenant-001', code: 'DORA-ICT-001', titleEn: 'ICT Risk Management Framework', titleAr: null,
    pillar: 'ict_risk_management', status: 'implementing', description: 'Establish ICT risk management framework per DORA Art. 6',
    linkedControlIds: ['ctrl-001'], linkedEvidenceIds: [], ownerId: 'user-001', dueDate: new Date(Date.now() + 60 * 86400000).toISOString(),
    lastAssessedAt: null, complianceScore: 65, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockDoraAssessment(overrides?: Partial<DoraResilienceAssessmentContract>): DoraResilienceAssessmentContract {
  return { assessmentId: 'da-001', tenantId: 'tenant-001', pillar: 'ict_risk_management', overallScore: 72, gapCount: 5, criticalGaps: 1,
    assessedAt: new Date().toISOString(), assessedById: 'user-001', ...overrides };
}
export function mockDoraDiagnostics(overrides?: Partial<DoraDiagnosticsContract>): DoraDiagnosticsContract {
  return { moduleCode: 'dora', healthy: true, totalObligations: 45, compliantCount: 28, nonCompliantCount: 5, overdueAssessments: 3,
    gapsByPillar: { ict_risk_management: 3, incident_reporting: 1, resilience_testing: 2, third_party_risk: 4, information_sharing: 0 },
    checks: [{ name: 'obligation-coverage', passed: true }, { name: 'assessment-freshness', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockDoraObligationList(count = 5): DoraObligationContract[] { return Array.from({ length: count }, (_, i) => mockDoraObligation({ obligationId: `dora-${String(i+1).padStart(3,'0')}`, titleEn: `DORA Obligation ${i+1}` })); }
