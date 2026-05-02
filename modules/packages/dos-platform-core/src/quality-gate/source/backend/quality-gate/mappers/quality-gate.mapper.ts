/**
 * quality-gate — Row Mappers
 * Maps database rows to typed DTOs for API responses.
 */

import type { QgateRunRecord, QgateStageResultRecord, QgateThresholdRecord, QgateSchemaDriftRecord, QgateAiEvalScoreRecord } from '../contracts/quality-gate.contracts';
import type { QgateRunStatus, QgateTriggerType, QgateStageCode, QgateDriftSeverity, QgateBatteryCode } from '../types/quality-gate.types';

export function mapRunRow(row: Record<string, unknown>): QgateRunRecord {
  return {
    run_id: row.run_id as string,
    tenant_id: row.tenant_id as string,
    release_id: (row.release_id as string) ?? null,
    commit_sha: (row.commit_sha as string) ?? null,
    trigger_type: row.trigger_type as QgateTriggerType,
    status: row.status as QgateRunStatus,
    overall_score: row.overall_score != null ? Number(row.overall_score) : null,
    stages_total: Number(row.stages_total),
    stages_passed: Number(row.stages_passed),
    stages_failed: Number(row.stages_failed),
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    triggered_by: (row.triggered_by as string) ?? null,
    override_by: (row.override_by as string) ?? null,
    override_reason: (row.override_reason as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapStageRow(row: Record<string, unknown>): QgateStageResultRecord {
  return {
    result_id: row.result_id as string,
    run_id: row.run_id as string,
    tenant_id: row.tenant_id as string,
    stage_number: Number(row.stage_number),
    stage_code: row.stage_code as QgateStageCode,
    status: row.status as QgateRunStatus,
    score: row.score != null ? Number(row.score) : null,
    threshold: row.threshold != null ? Number(row.threshold) : null,
    duration_ms: row.duration_ms != null ? Number(row.duration_ms) : null,
    blockers: (row.blockers as Array<{ code: string; message: string; severity: string }>) ?? [],
    details: (row.details as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  };
}

export function mapThresholdRow(row: Record<string, unknown>): QgateThresholdRecord {
  return {
    threshold_id: row.threshold_id as string,
    tenant_id: row.tenant_id as string,
    stage_code: row.stage_code as QgateStageCode,
    metric_code: row.metric_code as string,
    min_value: Number(row.min_value),
    override_reason: (row.override_reason as string) ?? null,
    set_by: (row.set_by as string) ?? null,
    created_at: row.created_at as string,
  };
}

export function mapDriftRow(row: Record<string, unknown>): QgateSchemaDriftRecord {
  return {
    drift_id: row.drift_id as string,
    run_id: (row.run_id as string) ?? null,
    tenant_id: row.tenant_id as string,
    severity: row.severity as QgateDriftSeverity,
    category: row.category as string,
    table_name: (row.table_name as string) ?? null,
    column_name: (row.column_name as string) ?? null,
    expected_value: (row.expected_value as string) ?? null,
    actual_value: (row.actual_value as string) ?? null,
    detail: row.detail as string,
    resolved: row.resolved as boolean,
    resolved_at: (row.resolved_at as string) ?? null,
    resolved_by: (row.resolved_by as string) ?? null,
    created_at: row.created_at as string,
  };
}

export function mapAiEvalRow(row: Record<string, unknown>): QgateAiEvalScoreRecord {
  return {
    score_id: row.score_id as string,
    run_id: row.run_id as string,
    tenant_id: row.tenant_id as string,
    battery_code: row.battery_code as QgateBatteryCode,
    agent_id: row.agent_id as string,
    tests_run: Number(row.tests_run),
    tests_passed: Number(row.tests_passed),
    score: Number(row.score),
    threshold: Number(row.threshold),
    passed: row.passed as boolean,
    failures: (row.failures as Array<{ testId: string; reason: string; severity: string }>) ?? [],
    langfuse_trace_id: (row.langfuse_trace_id as string) ?? null,
    created_at: row.created_at as string,
  };
}
