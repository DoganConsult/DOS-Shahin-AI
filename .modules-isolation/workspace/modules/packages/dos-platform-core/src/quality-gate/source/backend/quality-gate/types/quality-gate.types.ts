/**
 * quality-gate — Core Types
 * Domain types for quality gate runs, stages, evaluations.
 */

export type QgateRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'overridden' | 'skipped';
export type QgateTriggerType = 'manual' | 'ci' | 'temporal' | 'provisioning';
export type QgateStageCode = 'devsecops' | 'unit' | 'integration' | 'ai-guardrails' | 'e2e-visual' | 'performance' | 'mutation';
export type QgateDriftSeverity = 'critical' | 'warning' | 'info';
export type QgateBatteryCode = 'injection' | 'relevance' | 'isolation' | 'hallucination';

export interface QgateEventPayload {
  tenantId: string;
  runId: string;
  stageCode?: QgateStageCode;
  status: QgateRunStatus;
  score?: number;
  detail?: string;
}

export type QgateStatusReason =
  | 'all_stages_passed'
  | 'stage_failure'
  | 'manual_override'
  | 'manual_skip'
  | 'cancelled'
  | 'timeout';

export type QgateSource = 'ci' | 'admin_dashboard' | 'temporal_schedule' | 'provisioning_hook' | 'api';
