import type { AuditState, AuditUniverseState, AuditScheduleState, AuditFindingState } from '../workflows/audit-lifecycle';

export interface AuditQuery {
  tenantId: string;
  status?: AuditState | AuditState[];
  auditType?: 'internal' | 'external' | 'regulatory' | 'joint';
  leadAuditorActorId?: string;
  foundationScopeId?: string;
  universeEntryId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditUniverseQuery {
  tenantId: string;
  status?: AuditUniverseState | AuditUniverseState[];
  inherentRiskRating?: 'low' | 'medium' | 'high' | 'critical';
  ownerActorId?: string;
  overdueOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditScheduleQuery {
  tenantId: string;
  status?: AuditScheduleState | AuditScheduleState[];
  periodYear?: number;
  periodQuarter?: number;
  page?: number;
  pageSize?: number;
}

export interface AuditFindingQuery {
  tenantId: string;
  auditId?: string;
  status?: AuditFindingState | AuditFindingState[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ownerActorId?: string;
  overdueOnly?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditDashboardQuery {
  tenantId: string;
  foundationScopeId?: string;
  periodYear?: number;
  includeOverdueFindings?: boolean;
  includeStaleUniverse?: boolean;
}
