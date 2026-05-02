export type EngineRunStatus = 'idle' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
export type EngineRuleType = 'compliance_check' | 'control_cycle' | 'risk_refresh' | 'evidence_collection' | 'corrective_action' | 'custom';

export interface EngineRuleContract {
  ruleId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  ruleType: EngineRuleType; enabled: boolean;
  schedule: string | null; targetModules: string[];
  lastRunAt: string | null; lastRunStatus: EngineRunStatus;
  ownerId: string; createdAt: string; updatedAt: string;
}

export interface EngineRunContract {
  runId: string; ruleId: string; status: EngineRunStatus;
  startedAt: string; completedAt: string | null;
  actionsTriggered: number; errorsCount: number;
  durationMs: number | null; errorMessage: string | null;
}

export interface AgrcEngineDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalRules: number; enabledRules: number;
  failedRuns: number; staleRules: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface AgrcEngineDashboardContract {
  totalRules: number; byType: Record<string, number>; enabledCount: number;
  recentRuns: Array<{ runId: string; ruleCode: string; status: EngineRunStatus; completedAt: string | null }>;
  failedRunsLast24h: number; actionsTriggeredLast24h: number;
}
