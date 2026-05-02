export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus =
  | 'draft'
  | 'reported'
  | 'triaged'
  | 'investigating'
  | 'escalated'
  | 'containment'
  | 'resolved_pending_review'
  | 'closed'
  | 'archived';

export type IncidentCategory =
  | 'security'
  | 'operational'
  | 'compliance'
  | 'data_breach'
  | 'system_failure'
  | 'third_party'
  | 'fraud'
  | 'physical'
  | 'other';

export interface IncidentContract {
  incidentId: string;
  tenantId: string;
  titleEn: string;
  titleAr: string | null;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  reportedById: string;
  assignedToId: string | null;
  triageOwnerId: string | null;
  detectedAt: string;
  reportedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  impactSummary: string | null;
  rootCause: string | null;
  linkedRiskIds: string[];
  linkedControlIds: string[];
  linkedEvidenceIds: string[];
  isRepeat: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineEntryContract {
  entryId: string;
  incidentId: string;
  entryType: 'action' | 'note' | 'status_change' | 'escalation' | 'evidence_attached' | 'communication';
  description: string;
  actorId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface IncidentResponseActionContract {
  actionId: string;
  incidentId: string;
  title: string;
  description: string;
  assignedToId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PostIncidentReviewContract {
  reviewId: string;
  incidentId: string;
  lessonsLearned: string;
  rootCauseAnalysis: string;
  preventiveMeasures: string[];
  reviewedById: string;
  reviewedAt: string;
  status: 'draft' | 'submitted' | 'approved' | 'archived';
}

export interface IncidentDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalIncidents: number;
  openIncidents: number;
  criticalOpen: number;
  stuckInvestigations: number;
  overdueResponseActions: number;
  repeatIncidentCount: number;
  avgResolutionHours: number | null;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface IncidentDashboardContract {
  totalIncidents: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  openIncidents: number;
  criticalIncidents: number;
  avgResolutionHours: number | null;
  escalatedCount: number;
  repeatRate: number;
  overdueActions: number;
  recentIncidents: Array<{
    incidentId: string;
    titleEn: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    reportedAt: string;
  }>;
}
