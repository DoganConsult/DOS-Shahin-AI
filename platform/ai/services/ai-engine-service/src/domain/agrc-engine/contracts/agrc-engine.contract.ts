export interface AgrcEngineRunContract {
  runId: string;
  tenantId: string;
  runType: 'ccm_scan' | 'telemetry_cycle' | 'automation_cycle' | 'health_snapshot' | 'on_demand';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
  triggeredBy: 'scheduler' | 'manual' | 'event' | 'api';
  triggeredByUserId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  modulesScanned: string[];
  findingsCount: number;
  errorsCount: number;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgrcEngineResultContract {
  resultId: string;
  runId: string;
  tenantId: string;
  moduleCode: string;
  resultType: 'finding' | 'metric' | 'anomaly' | 'health_signal' | 'automation_outcome';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  payload: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface AgrcEngineConfigContract {
  configId: string;
  tenantId: string;
  ccmEnabled: boolean;
  ccmCronExpression: string;
  telemetryEnabled: boolean;
  telemetryCronExpression: string;
  automationEnabled: boolean;
  automationCronExpression: string;
  healthSnapshotEnabled: boolean;
  healthSnapshotCronExpression: string;
  maxConcurrentRuns: number;
  runTimeoutMs: number;
  modulesIncluded: string[];
  modulesExcluded: string[];
  updatedBy: string;
  updatedAt: string;
}

export interface AgrcEngineHealthSnapshotContract {
  snapshotId: string;
  tenantId: string;
  overallScore: number;
  moduleScores: Record<string, number>;
  criticalFindings: number;
  highFindings: number;
  openAnomalies: number;
  automationSuccessRate: number | null;
  capturedAt: string;
}

export interface AgrcEngineDiagnosticsContract {
  tenantId: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgDurationMs: number | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  stuckRuns: number;
  unacknowledgedCritical: number;
  configValid: boolean;
  capturedAt: string;
}

export interface AgrcEngineListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  runType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AgrcEngineListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
