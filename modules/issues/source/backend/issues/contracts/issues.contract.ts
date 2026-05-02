export interface IssuesListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  assignee?: string;
  sourceModule?: string;
  overdueOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface IssuesListResponse {
  success: boolean;
  data: IssueEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface IssuesDetailResponse {
  success: boolean;
  data: IssueEntityContract | null;
  assignment?: IssueAssignmentContract;
  escalation?: IssueEscalationContract;
}

export interface IssuesMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type IssueStatus = 'open' | 'assigned' | 'in_progress' | 'blocked' | 'escalated' | 'resolved' | 'closed' | 'archived';

export interface IssueEntityContract {
  issueId: string;
  tenantId: string;
  title: string;
  description?: string;
  issueType: 'finding' | 'deficiency' | 'observation' | 'non_conformity' | 'gap' | 'weakness';
  status: IssueStatus;
  severity: 'critical' | 'high' | 'medium' | 'low';
  sourceModule?: string;
  sourceEntityId?: string;
  sourceEntityType?: string;
  owner?: string;
  assignee?: string;
  dueDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  rootCause?: string;
  linkedRemediationId?: string;
  linkedRiskId?: string;
  linkedControlId?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueAssignmentContract {
  issueId: string;
  assignee: string;
  assignedBy: string;
  assignedAt: string;
  previousAssignee?: string;
  reassignmentReason?: string;
  delegatable: boolean;
  delegatedTo?: string;
}

export interface IssueEscalationContract {
  escalationId: string;
  issueId: string;
  escalatedBy: string;
  escalatedAt: string;
  escalationLevel: number;
  reason: string;
  escalatedTo: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface IssueStatusTransitionContract {
  issueId: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
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

export interface IssueReviewApprovalContract {
  reviewId: string;
  issueId: string;
  reviewType: 'closure_approval' | 'escalation_review' | 'resolution_verification';
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

export interface IssueDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  issueHealth: {
    totalOpen: number;
    criticalOpen: number;
    overdueCount: number;
    staleIssues: number;
  };
  assignmentHealth: {
    unassignedCount: number;
    noOwnerCount: number;
    reassignmentRate: number;
  };
  escalationHealth: {
    activeEscalations: number;
    unresolvedEscalations: number;
    escalationRate: number;
  };
  closureHealth: {
    blockedClosures: number;
    averageResolutionDays: number;
    pendingVerification: number;
  };
  sourceBreakdown: Record<string, number>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface IssueDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<IssueStatus, number>;
  severityBreakdown: Record<string, number>;
  overdueCount: number;
  escalatedCount: number;
  resolvedThisWeek: number;
  newThisWeek: number;
  averageResolutionDays: number;
  sourceModuleBreakdown: Record<string, number>;
  trends: { date: string; openCount: number; closedCount: number }[];
}
