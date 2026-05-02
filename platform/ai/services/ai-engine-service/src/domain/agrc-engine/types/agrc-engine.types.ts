export interface EngineRun {
  id: string;
  tenant_id: string;
  run_type: RunType;
  status: RunStatus;
  config: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export type RunType = 'ccm_scan' | 'telemetry_collection' | 'automation_cycle' | 'health_check' | 'full_orchestration';
export const RUN_TYPES: readonly RunType[] = ['ccm_scan', 'telemetry_collection', 'automation_cycle', 'health_check', 'full_orchestration'] as const;

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export const RUN_STATUSES: readonly RunStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;

export interface EngineResult {
  id: string;
  run_id: string;
  result_type: string;
  data: Record<string, unknown>;
  severity?: string;
  created_at: string;
}

export interface AgrcEngineEventPayload {
  tenantId: string;
  entityType: 'run' | 'result' | 'config';
  entityId: string;
  moduleCode: 'agrc-engine';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  data: Record<string, unknown>;
}
