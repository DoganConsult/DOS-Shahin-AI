export type KsaObligationStatus = 'identified' | 'mapped' | 'under_review' | 'compliant' | 'non_compliant' | 'remediation' | 'archived';
export type KsaRegulatoryBody = 'sama' | 'cma' | 'ndmo' | 'sdaia' | 'nca' | 'citc' | 'moci' | 'other';
export type KsaJurisdictionScope = 'national' | 'sector_specific' | 'cross_sector' | 'international_aligned';

export interface KsaObligationContract {
  obligationId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: KsaObligationStatus; regulatoryBody: KsaRegulatoryBody;
  jurisdictionScope: KsaJurisdictionScope; description: string;
  regulationReference: string; articleReference: string | null;
  ownerId: string; dueDate: string | null;
  linkedFrameworkIds: string[]; linkedControlIds: string[];
  complianceScore: number | null; lastAssessedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface KsaCatalogEntryContract {
  catalogId: string; regulatoryBody: KsaRegulatoryBody; regulationName: string;
  effectiveDate: string; version: string; totalObligations: number;
  mappedCount: number; unmappedCount: number; updatedAt: string;
}

export interface KsaMappingContract {
  mappingId: string; obligationId: string; targetType: 'framework' | 'control' | 'policy';
  targetId: string; targetName: string; mappingStrength: 'full' | 'partial' | 'gap';
  evidenceIds: string[]; createdAt: string;
}

export interface KsaReadinessContract {
  tenantId: string; regulatoryBody: KsaRegulatoryBody;
  totalObligations: number; compliantCount: number; nonCompliantCount: number;
  remediationCount: number; unmappedCount: number;
  readinessScore: number; assessedAt: string;
}

export interface KsaRegulatoryDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalObligations: number;
  nonCompliantCount: number; unmappedCount: number; overdueAssessments: number;
  staleReadinessScores: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface KsaRegulatoryDashboardContract {
  totalObligations: number; byStatus: Record<string, number>;
  byBody: Record<string, number>; byScope: Record<string, number>;
  overallReadiness: number; nonCompliantCount: number;
  recentChanges: Array<{ obligationId: string; code: string; change: string; changedAt: string }>;
}
