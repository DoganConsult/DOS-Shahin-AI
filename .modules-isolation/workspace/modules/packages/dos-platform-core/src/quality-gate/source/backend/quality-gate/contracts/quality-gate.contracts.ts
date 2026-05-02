/**
 * quality-gate — Domain Contracts
 * Database record shapes and service interfaces.
 */

import type { QgateRunStatus, QgateTriggerType, QgateStageCode, QgateDriftSeverity, QgateBatteryCode } from '../types/quality-gate.types';

// ── Database Record Shapes ──

export interface QgateRunRecord {
  run_id: string;
  tenant_id: string;
  release_id: string | null;
  commit_sha: string | null;
  trigger_type: QgateTriggerType;
  status: QgateRunStatus;
  overall_score: number | null;
  stages_total: number;
  stages_passed: number;
  stages_failed: number;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  override_by: string | null;
  override_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QgateStageResultRecord {
  result_id: string;
  run_id: string;
  tenant_id: string;
  stage_number: number;
  stage_code: QgateStageCode;
  status: QgateRunStatus;
  score: number | null;
  threshold: number | null;
  duration_ms: number | null;
  blockers: Array<{ code: string; message: string; severity: string }>;
  details: Record<string, unknown>;
  created_at: string;
}

export interface QgateAiEvalScoreRecord {
  score_id: string;
  run_id: string;
  tenant_id: string;
  battery_code: QgateBatteryCode;
  agent_id: string;
  tests_run: number;
  tests_passed: number;
  score: number;
  threshold: number;
  passed: boolean;
  failures: Array<{ testId: string; reason: string; severity: string }>;
  langfuse_trace_id: string | null;
  created_at: string;
}

export interface QgateSchemaDriftRecord {
  drift_id: string;
  run_id: string | null;
  tenant_id: string;
  severity: QgateDriftSeverity;
  category: string;
  table_name: string | null;
  column_name: string | null;
  expected_value: string | null;
  actual_value: string | null;
  detail: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface QgateThresholdRecord {
  threshold_id: string;
  tenant_id: string;
  stage_code: QgateStageCode;
  metric_code: string;
  min_value: number;
  override_reason: string | null;
  set_by: string | null;
  created_at: string;
}

export interface QgateVrtSnapshotRecord {
  snapshot_id: string;
  tenant_id: string;
  scenario_code: string;
  baseline_hash: string | null;
  latest_hash: string | null;
  diff_percentage: number | null;
  threshold: number;
  passed: boolean | null;
  updated_at: string;
  created_at: string;
}

export interface QgateMutationReportRecord {
  report_id: string;
  run_id: string | null;
  tenant_id: string;
  module_code: string;
  mutants_total: number;
  mutants_killed: number;
  mutants_survived: number;
  mutation_score: number | null;
  threshold: number | null;
  passed: boolean | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ── Service Interfaces ──

export interface StageResult {
  stageCode: QgateStageCode;
  stageNumber: number;
  passed: boolean;
  score: number | null;
  threshold: number | null;
  durationMs: number;
  blockers: Array<{ code: string; message: string; severity: string }>;
  details: Record<string, unknown>;
}

export interface QgateRunOutput {
  runId: string;
  tenantId: string;
  status: QgateRunStatus;
  overallScore: number | null;
  stagesTotal: number;
  stagesPassed: number;
  stagesFailed: number;
  stages: StageResult[];
  durationMs: number;
}

export interface SchemaDriftReport {
  oracleVersion: string;
  runAt: string;
  schema: string;
  verdict: 'PASS' | 'FAIL' | 'WARN';
  totalDrifts: number;
  criticalDrifts: number;
  warningDrifts: number;
  infoDrifts: number;
  drifts: Array<{
    severity: QgateDriftSeverity;
    category: string;
    table?: string;
    column?: string;
    expected?: string;
    actual?: string;
    detail: string;
  }>;
  durationMs: number;
}

export interface AiGuardrailsReport {
  runAt: string;
  tenantId: string;
  overallVerdict: 'PASS' | 'FAIL' | 'WARN';
  batteries: {
    injection: BatteryResult;
    relevance: BatteryResult;
    isolation: BatteryResult;
    hallucination: BatteryResult;
  };
  langfuseTraceId: string | null;
  durationMs: number;
}

export interface BatteryResult {
  name: string;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  score: number;
  threshold: number;
  verdict: 'PASS' | 'FAIL';
  failures: Array<{ testId: string; reason: string; severity: string }>;
}

// ── Default Thresholds ──

export const DEFAULT_THRESHOLDS: Record<QgateStageCode, Record<string, number>> = {
  devsecops:      { 'architecture.pass': 1.0, 'secrets.found': 0 },
  unit:           { 'coverage.lines': 0.80, 'coverage.branches': 0.70, 'coverage.functions': 0.80 },
  integration:    { 'drift.critical': 0, 'contract.pass': 1.0 },
  'ai-guardrails': { 'ai.injection': 1.0, 'ai.relevance': 0.80, 'ai.isolation': 1.0, 'ai.hallucination': 0.85 },
  'e2e-visual':   { 'e2e.pass': 1.0, 'vrt.diff_pct': 0.10, 'a11y.critical': 0 },
  performance:    { 'load.p95_ms': 2000, 'load.error_rate': 0.05 },
  mutation:       { 'mutation.score': 0.50 },
};
