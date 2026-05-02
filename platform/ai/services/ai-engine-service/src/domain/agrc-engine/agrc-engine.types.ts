export interface EngineRunContext {
  tenantId: string;
  schema: string;
  runId: string;
  startedAt: Date;
  triggerMode: 'manual' | 'scheduled';
  triggeredBy?: string | null;
}

export interface EngineWorkerResult {
  controlsEvaluated?: number;
  staleControls?: number;
  overdueRemediations?: number;
  kriBreaches?: number;
  policyReviewsStarted?: number;
  tasksCreated?: number;
  notificationsCreated?: number;
  escalationsTriggered?: number;
}

export interface EngineRunResult {
  tenantId: string;
  schema: string;
  runId: string;
  cycleMs: number;
  status: 'completed' | 'failed';
  summary: Required<EngineWorkerResult>;
}
