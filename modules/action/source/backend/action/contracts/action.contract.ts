export interface ActionListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assignee?: string;
  sourceModule?: string;
  overdueOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ActionListResponse {
  success: boolean;
  data: ActionEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface ActionDetailResponse {
  success: boolean;
  data: ActionEntityContract | null;
  assignment?: ActionAssignmentContract;
  tracking?: ActionTrackingContract;
}

export interface ActionMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

/** Canonical action item states — aligned with lifecycle-registration.ts */
export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'closed' | 'overdue' | 'escalated' | 'cancelled';

export interface ActionEntityContract {
  actionId: string;
  tenantId: string;
  title: string;
  description?: string;
  actionType: 'corrective' | 'preventive' | 'improvement' | 'follow_up' | 'task';
  status: ActionStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  sourceModule?: string;
  sourceEntityId?: string;
  sourceEntityType?: string;
  owner?: string;
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  slaHours?: number;
  slaBreached: boolean;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionAssignmentContract {
  actionId: string;
  assignee: string;
  assignedBy: string;
  assignedAt: string;
  previousAssignee?: string;
  reassignmentReason?: string;
  delegatable: boolean;
  delegatedTo?: string;
}

export interface ActionTrackingContract {
  actionId: string;
  progressPercent: number;
  checkpoints: { label: string; dueDate?: string; completedAt?: string; status: string }[];
  comments: { author: string; text: string; createdAt: string }[];
  lastActivityAt: string;
  daysOpen: number;
  daysOverdue?: number;
}

export interface ActionCompletionContract {
  actionId: string;
  completedBy: string;
  completedAt: string;
  completionNotes?: string;
  evidenceIds?: string[];
  verificationRequired: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationResult?: 'accepted' | 'rejected' | 'needs_rework';
}

export interface ActionStatusTransitionContract {
  actionId: string;
  fromStatus: ActionStatus;
  toStatus: ActionStatus;
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

export interface ActionReviewApprovalContract {
  reviewId: string;
  actionId: string;
  reviewType: 'completion_review' | 'verification' | 'cancellation';
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

export interface ActionDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  overdueActions: {
    totalOverdue: number;
    criticalOverdue: number;
    averageDaysOverdue: number;
  };
  assignmentHealth: {
    unassignedCount: number;
    noOwnerCount: number;
    reassignmentRate: number;
  };
  completionHealth: {
    pendingVerification: number;
    rejectedCount: number;
    averageCompletionDays: number;
  };
  staleDrafts: {
    draftOver30Days: number;
    blockedOver7Days: number;
  };
  sourceBreakdown: Record<string, number>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface ActionDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<ActionStatus, number>;
  priorityBreakdown: Record<string, number>;
  overdueCount: number;
  completedThisWeek: number;
  newThisWeek: number;
  averageResolutionDays: number;
  slaComplianceRate: number;
  trends: { date: string; openCount: number; completedCount: number }[];
}
