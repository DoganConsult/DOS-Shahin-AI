export type DoraObligationStatus = 'identified' | 'mapped' | 'implementing' | 'compliant' | 'non_compliant' | 'partially_compliant' | 'archived';
export type DoraPillar = 'ict_risk_management' | 'incident_reporting' | 'resilience_testing' | 'third_party_risk' | 'information_sharing';

export interface DoraObligationContract {
  obligationId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  pillar: DoraPillar; status: DoraObligationStatus; description: string;
  linkedControlIds: string[]; linkedEvidenceIds: string[];
  ownerId: string; dueDate: string | null; lastAssessedAt: string | null;
  complianceScore: number | null; createdAt: string; updatedAt: string;
}

export interface DoraResilienceAssessmentContract {
  assessmentId: string; tenantId: string; pillar: DoraPillar;
  overallScore: number; gapCount: number; criticalGaps: number;
  assessedAt: string; assessedById: string;
}

export interface DoraDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalObligations: number;
  compliantCount: number; nonCompliantCount: number; overdueAssessments: number;
  gapsByPillar: Record<string, number>;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface DoraDashboardContract {
  totalObligations: number; byPillar: Record<string, number>; byStatus: Record<string, number>;
  overallComplianceRate: number; criticalGaps: number; overdueAssessments: number;
  pillarScores: Array<{ pillar: DoraPillar; score: number; trend: 'up' | 'down' | 'flat' }>;
}
