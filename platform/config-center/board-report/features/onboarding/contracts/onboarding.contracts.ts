export type OnboardingLifecycleState =
  | 'not_started'
  | 'draft'
  | 'in_progress'
  | 'awaiting_review'
  | 'review_blocked'
  | 'review_ready'
  | 'approved_for_provisioning'
  | 'provisioning_started'
  | 'provisioning'
  | 'provisioning_partial'
  | 'provisioned'
  | 'handover_pending'
  | 'active'
  | 'failed'
  | 'cancelled'
  | 'archived';

export interface OnboardingSessionContract {
  id: string;
  tenantId: string | null;
  userId: string;
  status: OnboardingLifecycleState;
  organizationName: string | null;
  displayName: string | null;
  languageCode: 'en' | 'ar';
  currentStageCode: string | null;
  completedStages: string[];
  metadata: Record<string, unknown>;
  emailVerified: boolean;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stages?: OnboardingStageContract[];
}

export interface OnboardingStageContract {
  stageCode: string;
  stageName: string;
  sequenceNo: number;
  isRequired: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  completedAt: string | null;
}

export interface SaveBulkAnswersContract {
  stageCode: string;
  sectionCode?: string;
  answers: Array<{
    questionCode: string;
    answerText?: string | null;
    answerNumber?: number | null;
    answerBool?: boolean | null;
    answerDate?: string | null;
    answerJson?: unknown;
  }>;
}

export interface ScoreContract {
  sessionId: string;
  overallScore: number;
  readinessLevel: 'foundational' | 'developing' | 'managed' | 'optimized';
  dimensionScores: Record<string, number>;
  computedAt: string;
}

export interface RecommendationContract {
  sessionId: string;
  packCode: string | null;
  packName: string | null;
  enabledModules: string[];
  dashboardProfile: string | null;
  startupMode: string | null;
  confidence: number;
  reasonCodes: string[];
}

export interface ProvisioningJobContract {
  jobId: string;
  sessionId: string;
  tenantId: string;
  status: 'queued' | 'validating' | 'running' | 'waiting' | 'failed' | 'completed' | 'rolled_back';
  packCode: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  retryCount: number;
}

export interface ProvisioningStepContract {
  stepId: string;
  jobId: string;
  stepCode: string;
  stepName: string;
  sequenceNo: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'rolled_back';
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface StartupChecklistContract {
  sessionId: string;
  items: Array<{
    itemCode: string;
    category: string;
    titleEn: string;
    titleAr: string;
    isComplete: boolean;
    dueInDays: number | null;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  totalItems: number;
  completedItems: number;
}

export interface OnboardingDiagnosticsContract {
  sessionId: string;
  sessionStatus: OnboardingLifecycleState;
  emailVerified: boolean;
  stagesCompleted: string[];
  stagesBlocked: string[];
  activeJobId: string | null;
  provisioningHealth: 'healthy' | 'partial' | 'failed' | 'not_started';
  failedStepCodes: string[];
  lastFailureReason: string | null;
  retryCount: number;
  dependencyChecks: Array<{
    name: string;
    status: 'ok' | 'degraded' | 'unavailable';
    detail?: string;
  }>;
  activationHealth: ActivationDiagnostics | null;
  correlationId: string | null;
  diagnosedAt: string;
}

export interface ActivationDiagnostics {
  tenantExists: boolean;
  schemaExists: boolean;
  workspaceExists: boolean;
  membershipExists: boolean;
  tenantId: string | null;
}

export interface StageDropOffContract {
  stageCode: string;
  started: number;
  completed: number;
  completionRate: number;
}

export interface OnboardingDashboardContract {
  totalSessions: number;
  byStatus: Record<string, number>;
  activeProvisioningJobs: number;
  failedProvisioningJobs: number;
  stuckSessionCount: number;
  avgProvisioningDurationMs: number | null;
  stageCompletionRates: StageDropOffContract[];
  recentSessions: Array<{
    sessionId: string;
    status: string;
    organizationName: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
