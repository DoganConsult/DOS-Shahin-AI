export interface TrainingListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  programType?: string;
  campaignId?: string;
  assignee?: string;
  completionStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface TrainingListResponse {
  success: boolean;
  data: TrainingProgramContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface TrainingDetailResponse {
  success: boolean;
  data: TrainingProgramContract | null;
  campaign?: TrainingCampaignContract;
  assignments?: TrainingAssignmentContract[];
  completionStats?: TrainingCompletionStatsContract;
}

export interface TrainingMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type TrainingStatus = 'draft' | 'active' | 'scheduled' | 'in_progress' | 'completed' | 'suspended' | 'archived';

export interface TrainingProgramContract {
  programId: string;
  tenantId: string;
  title: string;
  description?: string;
  programType: 'awareness' | 'compliance' | 'skill_based' | 'onboarding' | 'remedial' | 'certification';
  status: TrainingStatus;
  owner?: string;
  targetAudience?: string[];
  durationMinutes?: number;
  passingScore?: number;
  mandatory: boolean;
  recurrencePolicy?: 'none' | 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
  linkedComplianceFramework?: string;
  linkedPolicyId?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingCampaignContract {
  campaignId: string;
  programId: string;
  tenantId: string;
  title: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  targetGroupIds: string[];
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  reminderFrequency?: 'daily' | 'weekly' | 'none';
  createdBy: string;
  createdAt: string;
}

export interface TrainingAssignmentContract {
  assignmentId: string;
  campaignId: string;
  programId: string;
  assignee: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'exempted';
  completedAt?: string;
  score?: number;
  passed?: boolean;
  attempts: number;
  lastAttemptAt?: string;
}

export interface TrainingCompletionStatsContract {
  programId: string;
  campaignId?: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
  exempted: number;
  averageScore?: number;
  passRate?: number;
  completionRate: number;
}

export interface TrainingStatusTransitionContract {
  entityId: string;
  entityType: 'program' | 'campaign';
  fromStatus: string;
  toStatus: string;
  transitionedBy: string;
  transitionedAt: string;
  reason?: string;
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface TrainingDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  assignmentHealth: {
    overdueAssignments: number;
    stalledAssignments: number;
    unassignedPrograms: number;
  };
  completionHealth: {
    lowPassRatePrograms: number;
    noCompletionsIn90Days: number;
    averageCompletionRate: number;
  };
  campaignHealth: {
    activeCampaigns: number;
    stalledCampaigns: number;
    campaignsEndingSoon: number;
  };
  complianceGaps: {
    mandatoryNotAssigned: number;
    recurringOverdue: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface TrainingDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<TrainingStatus, number>;
  completionRateOverall: number;
  overdueAssignmentCount: number;
  activeCampaignCount: number;
  mandatoryComplianceRate: number;
  topPrograms: { programId: string; title: string; completionRate: number }[];
  trends: { date: string; completedCount: number; overdueCount: number }[];
}
