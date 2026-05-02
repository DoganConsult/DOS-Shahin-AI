import type { AuditState, AuditUniverseState, AuditScheduleState, AuditWorkingPaperState, AuditFindingState } from '../workflows/audit-lifecycle';

export interface Audit {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  auditType: 'internal' | 'external' | 'regulatory' | 'joint';
  status: AuditState;
  universeEntryId?: string;
  scheduleId?: string;
  leadAuditorActorId: string;
  planApprovedByActorId?: string;
  scopeId?: string;
  foundationScopeId?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  overallRating?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditUniverseEntry {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  status: AuditUniverseState;
  auditableEntityType: string;
  auditableEntityId?: string;
  inherentRiskRating: 'low' | 'medium' | 'high' | 'critical';
  auditFrequencyMonths: number;
  lastAuditDate?: string;
  nextAuditDueDate?: string;
  ownerActorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditSchedule {
  id: string;
  tenantId: string;
  periodYear: number;
  periodQuarter?: number;
  status: AuditScheduleState;
  approvedByActorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditWorkingPaper {
  id: string;
  tenantId: string;
  auditId: string;
  code: string;
  titleEn: string;
  titleAr?: string;
  status: AuditWorkingPaperState;
  preparedByActorId: string;
  reviewedByActorId?: string;
  approvedByActorId?: string;
  testPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFinding {
  id: string;
  tenantId: string;
  auditId: string;
  code: string;
  titleEn: string;
  titleAr?: string;
  status: AuditFindingState;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ratingId?: string;
  ownerActorId: string;
  remediationDueDate?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
