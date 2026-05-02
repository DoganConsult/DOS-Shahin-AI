export interface IncidentListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  classification?: string;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface IncidentListResponse {
  success: boolean;
  data: IncidentEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface IncidentDetailResponse {
  success: boolean;
  data: IncidentEntityContract | null;
  severity?: IncidentSeverityContract;
  investigation?: IncidentInvestigationContract;
  response?: IncidentResponseContract;
  postIncidentReview?: IncidentPostIncidentReviewContract;
}

export interface IncidentMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type IncidentStatus = 'open' | 'triaged' | 'investigating' | 'escalated' | 'resolved_pending_review' | 'closed' | 'archived';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface IncidentEntityContract {
  incidentId: string;
  tenantId: string;
  title: string;
  description?: string;
  classification: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  priority?: string;
  reportedBy: string;
  reportedAt: string;
  owner?: string;
  assignee?: string;
  triageAssignee?: string;
  responseLeader?: string;
  detectedAt?: string;
  containedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDeadline?: string;
  slaBreached: boolean;
  impactAssessment?: string;
  rootCause?: string;
  tags?: string[];
  linkedRiskIds?: string[];
  linkedEvidenceIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentSeverityContract {
  incidentId: string;
  severity: IncidentSeverity;
  previousSeverity?: IncidentSeverity;
  classifiedBy: string;
  classifiedAt: string;
  reason?: string;
  impactScope: 'individual' | 'team' | 'department' | 'organization' | 'external';
  regulatoryReportable: boolean;
  breachIndicator: boolean;
}

export interface IncidentInvestigationContract {
  incidentId: string;
  investigationId: string;
  investigator: string;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'blocked' | 'escalated';
  findings?: string;
  rootCauseAnalysis?: string;
  timelineEntries: { timestamp: string; action: string; actor: string; detail?: string }[];
  evidenceIds?: string[];
}

export interface IncidentResponseContract {
  incidentId: string;
  responseType: 'containment' | 'eradication' | 'recovery' | 'communication';
  actions: { actionId: string; description: string; assignee: string; status: string; completedAt?: string }[];
  containmentStatus: 'not_started' | 'in_progress' | 'contained' | 'failed';
  communicationsSent: number;
  warRoomActive: boolean;
}

export interface IncidentPostIncidentReviewContract {
  incidentId: string;
  reviewId: string;
  reviewedBy: string;
  reviewedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  lessonsLearned?: string;
  recommendations?: string[];
  correctiveActionIds?: string[];
  preventiveMeasures?: string[];
}

export interface IncidentEvidenceLinkageContract {
  incidentId: string;
  evidenceId: string;
  linkedBy: string;
  linkedAt: string;
  linkType: 'attachment' | 'screenshot' | 'log' | 'system_generated' | 'external';
}

export interface IncidentStatusTransitionContract {
  incidentId: string;
  fromStatus: IncidentStatus;
  toStatus: IncidentStatus;
  transitionedBy: string;
  transitionedAt: string;
  reason?: string;
  evidenceIds?: string[];
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface IncidentReviewApprovalContract {
  reviewId: string;
  incidentId: string;
  reviewType: 'closure' | 'severity_escalation' | 'post_incident_review' | 'regulatory_report';
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface IncidentDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  stuckIncidents: {
    stuckInTriage: number;
    stuckInInvestigation: number;
    stuckInReview: number;
  };
  escalationHealth: {
    pendingEscalations: number;
    overdueEscalations: number;
    escalationRate: number;
  };
  closureHealth: {
    blockedClosures: number;
    averageClosureDays: number;
    pendingPostIncidentReview: number;
  };
  investigationIntegrity: {
    incidentsWithoutInvestigation: number;
    incidentsWithoutRootCause: number;
    incidentsWithoutEvidence: number;
  };
  slaHealth: {
    slaBreachedCount: number;
    slaApproachingCount: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface IncidentBulkOperationContract {
  operation: 'status_change' | 'assign' | 'escalate' | 'archive';
  incidentIds: string[];
  targetValue?: string;
  performedBy: string;
  performedAt: string;
  results: { id: string; success: boolean; error?: string }[];
}

export interface IncidentDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<IncidentStatus, number>;
  severityBreakdown: Record<IncidentSeverity, number>;
  slaBreachedCount: number;
  meanTimeToDetect?: number;
  meanTimeToContain?: number;
  meanTimeToResolve?: number;
  openThisWeek: number;
  closedThisWeek: number;
  repeatIncidentCount: number;
  escalationRate: number;
  trends: { date: string; openCount: number; closedCount: number }[];
}
