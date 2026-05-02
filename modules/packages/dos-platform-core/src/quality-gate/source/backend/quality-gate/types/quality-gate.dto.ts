/**
 * quality-gate — DTO Types
 * Request/response DTOs for quality gate API endpoints.
 */

import type { QgateRunStatus, QgateTriggerType, QgateStageCode, QgateDriftSeverity, QgateBatteryCode } from './quality-gate.types';

// ── Run DTOs ──

export interface QgateCreateRunDTO {
  releaseId?: string;
  commitSha?: string;
  triggerType: QgateTriggerType;
  stages?: QgateStageCode[];
  baseUrl?: string;
}

export interface QgateRunResponseDTO {
  runId: string;
  tenantId: string;
  releaseId: string | null;
  commitSha: string | null;
  triggerType: QgateTriggerType;
  status: QgateRunStatus;
  overallScore: number | null;
  stagesTotal: number;
  stagesPassed: number;
  stagesFailed: number;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string;
  overrideBy: string | null;
  overrideReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface QgateRunWithStagesDTO extends QgateRunResponseDTO {
  stages: QgateStageResultDTO[];
}

export interface QgateStageResultDTO {
  resultId: string;
  stageNumber: number;
  stageCode: QgateStageCode;
  status: QgateRunStatus;
  score: number | null;
  threshold: number | null;
  durationMs: number | null;
  blockers: Array<{ code: string; message: string; severity: string }>;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface QgateRunOverrideDTO {
  reason: string;
}

// ── Threshold DTOs ──

export interface QgateThresholdDTO {
  thresholdId: string;
  tenantId: string;
  stageCode: QgateStageCode;
  metricCode: string;
  minValue: number;
  overrideReason: string | null;
  setBy: string | null;
  createdAt: string;
}

export interface QgateThresholdUpdateDTO {
  metricCode: string;
  minValue: number;
  overrideReason?: string;
}

// ── Drift DTOs ──

export interface QgateDriftEntryDTO {
  driftId: string;
  runId: string | null;
  tenantId: string;
  severity: QgateDriftSeverity;
  category: string;
  tableName: string | null;
  columnName: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  detail: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

// ── AI Eval DTOs ──

export interface QgateAiEvalScoreDTO {
  scoreId: string;
  runId: string;
  tenantId: string;
  batteryCode: QgateBatteryCode;
  agentId: string;
  testsRun: number;
  testsPassed: number;
  score: number;
  threshold: number;
  passed: boolean;
  failures: Array<{ testId: string; reason: string; severity: string }>;
  langfuseTraceId: string | null;
  createdAt: string;
}

// ── Dashboard DTOs ──

export interface QgateDashboardSummaryDTO {
  latestRun: QgateRunResponseDTO | null;
  passRate30d: number;
  totalRuns30d: number;
  aiGuardrailScore: number | null;
  schemaDriftCount: { critical: number; warning: number; info: number };
  mutationScore: number | null;
  stageHealth: Array<{ stageCode: QgateStageCode; lastStatus: QgateRunStatus; lastScore: number | null }>;
}

export interface QgateTrendPointDTO {
  date: string;
  overallScore: number | null;
  stageScores: Record<QgateStageCode, number | null>;
}

export interface QgateHealthStatusDTO {
  stages: Array<{
    stageCode: QgateStageCode;
    healthy: boolean;
    lastRunAt: string | null;
    consecutiveFailures: number;
    alertLevel: 'ok' | 'warn' | 'critical';
  }>;
}
