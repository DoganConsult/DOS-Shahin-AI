import type { RiskState, RiskKriState, RiskTreatmentState, RiskAssessmentState } from '../workflows/risk-lifecycle';

export interface RiskQuery {
  tenantId: string;
  status?: RiskState | RiskState[];
  categoryId?: string;
  riskOwnerActorId?: string;
  foundationScopeId?: string;
  teamScopeId?: string;
  minResidualScore?: number;
  maxResidualScore?: number;
  appetiteBreached?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RiskKriQuery {
  tenantId: string;
  riskId?: string;
  status?: RiskKriState | RiskKriState[];
  ownerActorId?: string;
  breachedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RiskTreatmentQuery {
  tenantId: string;
  riskId?: string;
  status?: RiskTreatmentState | RiskTreatmentState[];
  ownerActorId?: string;
  overdueOnly?: boolean;
  treatmentType?: 'mitigate' | 'transfer' | 'accept' | 'avoid';
  page?: number;
  pageSize?: number;
}

export interface RiskAssessmentQuery {
  tenantId: string;
  campaignId?: string;
  status?: RiskAssessmentState | RiskAssessmentState[];
  assessorActorId?: string;
  scopeType?: 'tenant' | 'foundation' | 'team';
  scopeId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface RiskDashboardQuery {
  tenantId: string;
  foundationScopeId?: string;
  teamScopeId?: string;
  includeKriBreaches?: boolean;
  includeAppetiteBreaches?: boolean;
}
