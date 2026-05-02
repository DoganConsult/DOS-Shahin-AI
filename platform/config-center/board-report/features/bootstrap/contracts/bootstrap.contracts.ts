export type BootstrapStatus = 'not_started' | 'initializing' | 'configuring' | 'provisioning' | 'validating' | 'completed' | 'failed' | 'rolled_back';

export interface BootstrapSessionContract {
  sessionId: string; tenantId: string; initiatedById: string;
  status: BootstrapStatus; templateCode: string | null;
  steps: BootstrapStepContract[]; totalSteps: number; completedSteps: number;
  startedAt: string; completedAt: string | null; failureReason: string | null;
  createdAt: string; updatedAt: string;
}

export interface BootstrapStepContract {
  stepCode: string; stepName: string; sequenceNo: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result: Record<string, unknown> | null; errorMessage: string | null;
  startedAt: string | null; completedAt: string | null; durationMs: number | null;
}

export interface BootstrapTemplateContract {
  templateCode: string; nameEn: string; nameAr: string | null;
  description: string; stepCount: number; isDefault: boolean;
}

export interface BootstrapDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalSessions: number; activeSessions: number;
  failedSessions: number; stuckSessions: number; avgCompletionMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface BootstrapDashboardContract {
  totalSessions: number; byStatus: Record<string, number>;
  activeSessions: number; failedSessions: number; completionRate: number;
  avgDurationMs: number | null; recentSessions: Array<{ sessionId: string; status: BootstrapStatus; startedAt: string }>;
}
