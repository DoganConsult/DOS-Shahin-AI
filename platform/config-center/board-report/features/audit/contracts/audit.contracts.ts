export type AuditEngagementStatus = 'planning' | 'fieldwork' | 'reporting' | 'follow_up' | 'closed' | 'archived';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'observation';

export type FindingStatus = 'draft' | 'open' | 'remediation_in_progress' | 'verification' | 'closed' | 'accepted' | 'archived';

export interface AuditEngagementContract {
  engagementId: string;
  tenantId: string;
  titleEn: string;
  titleAr: string | null;
  auditType: 'internal' | 'external' | 'regulatory' | 'special';
  status: AuditEngagementStatus;
  leadAuditorId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  findingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFindingContract {
  findingId: string;
  engagementId: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  ownerId: string;
  dueDate: string | null;
  isRepeat: boolean;
  linkedControlIds: string[];
  linkedRiskIds: string[];
  createdAt: string;
}

export interface AuditDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalEngagements: number;
  overdueEngagements: number;
  openFindings: number;
  repeatFindings: number;
  staleFieldwork: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface AuditDashboardContract {
  totalEngagements: number;
  byStatus: Record<string, number>;
  openFindings: number;
  criticalFindings: number;
  repeatFindings: number;
  overdueRemediations: number;
  avgEngagementDurationDays: number | null;
  findingsBySeverity: Record<string, number>;
}
