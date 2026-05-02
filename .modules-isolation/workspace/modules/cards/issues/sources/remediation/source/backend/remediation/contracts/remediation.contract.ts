export interface RemediationListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assignee?: string;
  sourceModule?: string;
  overdueOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface RemediationListResponse {
  success: boolean;
  data: RemediationEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface RemediationDetailResponse {
  success: boolean;
  data: RemediationEntityContract | null;
  plan?: RemediationPlanContract;
  verification?: RemediationVerificationContract;
  escalation?: RemediationEscalationContract;
}

export interface RemediationMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type RemediationStatus = 'planned' | 'in_progress' | 'blocked' | 'escalated' | 'pending_verification' | 'closed' | 'archived';

export interface RemediationEntityContract {
  remediationId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: RemediationStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  sourceModule: string;
  sourceEntityId: string;
  sourceEntityType: string;
  owner?: string;
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
  verifiedAt?: string;
  slaHours?: number;
  slaBreached: boolean;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemediationPlanContract {
  planId: string;
  remediationId: string;
  actions: RemediationActionContract[];
  totalActions: number;
  completedActions: number;
  progressPercent: number;
  estimatedCompletionDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface RemediationActionContract {
  actionId: string;
  planId: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: string;
  completedBy?: string;
  order: number;
}

export interface RemediationVerificationContract {
  verificationId: string;
  remediationId: string;
  verifiedBy: string;
  verifiedAt: string;
  result: 'pass' | 'fail' | 'partial';
  findings?: string;
  evidenceIds?: string[];
  requiresRemediation: boolean;
}

export interface RemediationEscalationContract {
  escalationId: string;
  remediationId: string;
  escalatedBy: string;
  escalatedAt: string;
  escalationLevel: number;
  reason: string;
  escalatedTo: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface RemediationStatusTransitionContract {
  remediationId: string;
  fromStatus: RemediationStatus;
  toStatus: RemediationStatus;
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

export interface RemediationReviewApprovalContract {
  reviewId: string;
  remediationId: string;
  reviewType: 'verification_approval' | 'closure_approval' | 'escalation_review';
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

export interface RemediationDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  overduePipeline: {
    overdueCount: number;
    criticalOverdue: number;
    averageDaysOverdue: number;
  };
  blockedClosure: {
    blockedCount: number;
    pendingVerification: number;
    failedVerification: number;
  };
  assignmentHealth: {
    unassignedCount: number;
    reassignmentRate: number;
    noOwnerCount: number;
  };
  escalationPipeline: {
    activeEscalations: number;
    unresolvedEscalations: number;
    escalationRate: number;
  };
  sourceBreakdown: Record<string, number>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface RemediationDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<RemediationStatus, number>;
  priorityBreakdown: Record<string, number>;
  overdueCount: number;
  blockedCount: number;
  closureLatencyAvg: number;
  reassignmentRate: number;
  sourceToRemediationConversion: Record<string, number>;
  trends: { date: string; openCount: number; closedCount: number }[];
}
