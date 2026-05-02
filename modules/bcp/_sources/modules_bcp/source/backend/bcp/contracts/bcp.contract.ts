export interface BcpListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  planType?: string;
  readinessLevel?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface BcpListResponse {
  success: boolean;
  data: BcpPlanContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface BcpDetailResponse {
  success: boolean;
  data: BcpPlanContract | null;
  exercises?: BcpExerciseContract[];
  recoveryStrategy?: BcpRecoveryStrategyContract;
  readiness?: BcpReadinessContract;
}

export interface BcpMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type BcpStatus = 'draft' | 'under_review' | 'approved' | 'active' | 'exercised' | 'needs_update' | 'retired' | 'archived';

export interface BcpPlanContract {
  planId: string;
  tenantId: string;
  title: string;
  description?: string;
  planType: 'continuity' | 'disaster_recovery' | 'crisis_management' | 'pandemic' | 'it_recovery';
  status: BcpStatus;
  owner?: string;
  reviewer?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  rtoHours?: number;
  rpoHours?: number;
  criticalProcesses?: string[];
  linkedRiskIds?: string[];
  linkedAssetIds?: string[];
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BcpExerciseContract {
  exerciseId: string;
  planId: string;
  tenantId: string;
  exerciseType: 'tabletop' | 'walkthrough' | 'simulation' | 'full_scale';
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  conductedDate?: string;
  participants?: string[];
  scenarioDescription?: string;
  outcome?: 'pass' | 'partial' | 'fail';
  findings?: string;
  lessonsLearned?: string;
  correctiveActionIds?: string[];
  conductedBy?: string;
}

export interface BcpRecoveryStrategyContract {
  strategyId: string;
  planId: string;
  strategyType: 'hot_site' | 'warm_site' | 'cold_site' | 'cloud_failover' | 'manual_workaround';
  description?: string;
  rtoAchievable?: number;
  rpoAchievable?: number;
  costEstimate?: number;
  status: 'proposed' | 'approved' | 'implemented' | 'tested';
  lastTestedAt?: string;
}

export interface BcpReadinessContract {
  planId: string;
  tenantId: string;
  readinessScore: number;
  readinessLevel: 'not_ready' | 'partially_ready' | 'ready' | 'fully_tested';
  lastExerciseDate?: string;
  daysSinceExercise?: number;
  exercisePassRate?: number;
  openFindingsCount: number;
  criticalGaps: string[];
  assessedAt: string;
}

export interface BcpStatusTransitionContract {
  planId: string;
  fromStatus: BcpStatus;
  toStatus: BcpStatus;
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

export interface BcpReviewApprovalContract {
  reviewId: string;
  planId: string;
  reviewType: 'plan_approval' | 'exercise_review' | 'strategy_approval' | 'retirement';
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

export interface BcpDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  planHealth: {
    plansNeedingReview: number;
    plansNeverExercised: number;
    plansWithoutOwner: number;
  };
  exerciseHealth: {
    overdueExercises: number;
    failedExercises: number;
    noExerciseIn12Months: number;
  };
  recoveryReadiness: {
    plansExceedingRto: number;
    plansExceedingRpo: number;
    untestedStrategies: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface BcpDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<BcpStatus, number>;
  readinessBreakdown: Record<string, number>;
  averageReadinessScore: number;
  overdueExerciseCount: number;
  openFindingsCount: number;
  rtoComplianceRate: number;
  rpoComplianceRate: number;
  trends: { date: string; readinessScore: number; exerciseCount: number }[];
}
