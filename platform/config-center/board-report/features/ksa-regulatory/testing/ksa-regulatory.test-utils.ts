import type { KsaObligationContract, KsaCatalogEntryContract, KsaMappingContract, KsaRegulatoryDiagnosticsContract } from '../contracts/ksa-regulatory.contracts';

export function mockKsaObligation(overrides?: Partial<KsaObligationContract>): KsaObligationContract {
  return {
    obligationId: 'obl-001', tenantId: 'tenant-001', code: 'SAMA-ICT-6.1',
    titleEn: 'ICT Risk Management Framework', titleAr: 'إطار إدارة مخاطر تقنية المعلومات',
    status: 'mapped', regulatoryBody: 'sama', jurisdictionScope: 'sector_specific',
    description: 'Establish and maintain an ICT risk management framework per SAMA Cyber Security Framework',
    regulationReference: 'SAMA CSF v1.0', articleReference: 'Article 6.1',
    ownerId: 'user-001', dueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    linkedFrameworkIds: ['fw-001'], linkedControlIds: ['ctrl-001', 'ctrl-002'],
    complianceScore: 72, lastAssessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockKsaCatalogEntry(overrides?: Partial<KsaCatalogEntryContract>): KsaCatalogEntryContract {
  return {
    catalogId: 'cat-001', regulatoryBody: 'sama', regulationName: 'SAMA Cyber Security Framework',
    effectiveDate: '2024-01-01', version: '1.0', totalObligations: 85,
    mappedCount: 62, unmappedCount: 23, updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockKsaMapping(overrides?: Partial<KsaMappingContract>): KsaMappingContract {
  return {
    mappingId: 'map-001', obligationId: 'obl-001', targetType: 'control',
    targetId: 'ctrl-001', targetName: 'ICT Risk Assessment Control', mappingStrength: 'full',
    evidenceIds: ['ev-001'], createdAt: new Date().toISOString(), ...overrides,
  };
}

export function mockKsaDiagnostics(overrides?: Partial<KsaRegulatoryDiagnosticsContract>): KsaRegulatoryDiagnosticsContract {
  return {
    moduleCode: 'ksa-regulatory', healthy: true, totalObligations: 85,
    nonCompliantCount: 3, unmappedCount: 23, overdueAssessments: 1, staleReadinessScores: 0,
    checks: [{ name: 'obligation-mapping', passed: true }, { name: 'readiness-freshness', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}
