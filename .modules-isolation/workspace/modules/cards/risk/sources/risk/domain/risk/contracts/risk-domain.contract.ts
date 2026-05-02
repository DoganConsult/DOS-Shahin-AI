import type { RiskState, RiskKriState, RiskTreatmentState, RiskAssessmentState } from '../workflows/risk-lifecycle';

export interface RiskRecord {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  status: RiskState;
  categoryId: string;
  threatId?: string;
  scenarioId?: string;
  inherentLikelihood: number;
  inherentImpact: number;
  inherentScore: number;
  residualLikelihood?: number;
  residualImpact?: number;
  residualScore?: number;
  riskOwnerActorId: string;
  foundationScopeId?: string;
  teamScopeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskKri {
  id: string;
  tenantId: string;
  riskId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  status: RiskKriState;
  thresholdWarning: number;
  thresholdBreach: number;
  currentValue?: number;
  unit: string;
  ownerActorId: string;
  lastMeasuredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskTreatmentReview {
  id: string;
  tenantId: string;
  riskId: string;
  treatmentType: 'mitigate' | 'transfer' | 'accept' | 'avoid';
  status: RiskTreatmentState;
  planDescriptionEn: string;
  planDescriptionAr?: string;
  ownerActorId: string;
  dueDate: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  id: string;
  tenantId: string;
  campaignId?: string;
  status: RiskAssessmentState;
  assessorActorId: string;
  reviewerActorId?: string;
  scopeType: 'tenant' | 'foundation' | 'team';
  scopeId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAppetiteConfig {
  id: string;
  tenantId: string;
  isActive: boolean;
  maxResidualScore: number;
  maxInherentScore: number;
  reviewIntervalDays: number;
  approvedByActorId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}
