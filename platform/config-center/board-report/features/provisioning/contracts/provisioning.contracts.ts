export type ProvisioningJobStatus = 'queued' | 'validating' | 'running' | 'waiting' | 'completed' | 'failed' | 'rolled_back';

export interface ProvisioningJobContract {
  jobId: string; tenantId: string; sessionId: string | null;
  status: ProvisioningJobStatus; packCode: string | null;
  totalSteps: number; completedSteps: number;
  startedAt: string | null; completedAt: string | null;
  failureReason: string | null; retryCount: number;
  createdAt: string; updatedAt: string;
}

export interface ProvisioningStepContract {
  stepId: string; jobId: string; stepCode: string; stepName: string;
  sequenceNo: number; status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'rolled_back';
  result: Record<string, unknown> | null; errorMessage: string | null;
  startedAt: string | null; completedAt: string | null; durationMs: number | null;
}

export interface ProvisioningDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalJobs: number; activeJobs: number;
  failedJobs: number; stuckJobs: number; avgDurationMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface ProvisioningDashboardContract {
  totalJobs: number; byStatus: Record<string, number>;
  activeJobs: number; failedJobs: number; completionRate: number;
  avgDurationMs: number | null; recentJobs: Array<{ jobId: string; status: ProvisioningJobStatus; startedAt: string | null }>;
}
