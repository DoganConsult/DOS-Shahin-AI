/**
 * quality-gate — Run Orchestration Service
 * Manages quality gate run lifecycle: create, evaluate, override, query.
 * All queries are tenant-scoped via tenantSchema(tenantId).
 */

import { safeQuery, tenantSchema, assertTenantId } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { v4 as uuid } from 'uuid';
import type { QgateRunRecord, QgateStageResultRecord, StageResult, QgateRunOutput } from '../contracts/quality-gate.contracts';
import type { QgateRunStatus, QgateTriggerType, QgateStageCode } from '../types/quality-gate.types';
import { DEFAULT_THRESHOLDS } from '../contracts/quality-gate.contracts';

const ALL_STAGES: QgateStageCode[] = ['devsecops', 'unit', 'integration', 'ai-guardrails', 'e2e-visual', 'performance', 'mutation'];

// ── Create Run ──

export async function createRun(tenantId: string, input: {
  releaseId?: string;
  commitSha?: string;
  triggerType: QgateTriggerType;
  triggeredBy: string;
  stages?: QgateStageCode[];
  baseUrl?: string;
}): Promise<QgateRunRecord> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const runId = uuid();
  const stages = input.stages ?? ALL_STAGES;
  const now = new Date().toISOString();

  await safeQuery(
    `INSERT INTO "${schema}".qgate_runs
     (run_id, tenant_id, release_id, commit_sha, trigger_type, status,
      stages_total, triggered_by, metadata, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$9)`,
    [runId, tenantId, input.releaseId ?? null, input.commitSha ?? null,
     input.triggerType, stages.length, input.triggeredBy,
     JSON.stringify({ stages, baseUrl: input.baseUrl ?? null }), now],
  );

  // Pre-create stage result placeholders
  for (let i = 0; i < stages.length; i++) {
    await safeQuery(
      `INSERT INTO "${schema}".qgate_stage_results
       (run_id, tenant_id, stage_number, stage_code, status) VALUES ($1,$2,$3,$4,'pending')`,
      [runId, tenantId, i, stages[i]],
    );
  }

  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId: input.triggeredBy, module: 'quality-gate',
    event: 'run.started', entityType: 'qgate_runs', entityId: runId,
    data: { runId, triggerType: input.triggerType, stages },
  }));

  const run = await getRun(tenantId, runId);
  if (!run) {
    throw new Error(`Quality gate run ${runId} was created but could not be reloaded`);
  }

  return run;
}

// ── Get Run ──

export async function getRun(tenantId: string, runId: string): Promise<QgateRunRecord | null> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".qgate_runs WHERE run_id = $1 LIMIT 1`,
    [runId],
  );
  return result.rows[0] ? mapRunRow(result.rows[0]) : null;
}

export async function getRunWithStages(tenantId: string, runId: string): Promise<{ run: QgateRunRecord; stages: QgateStageResultRecord[] } | null> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const run = await getRun(tenantId, runId);
  if (!run) return null;
  const stagesResult = await safeQuery(
    `SELECT * FROM "${schema}".qgate_stage_results WHERE run_id = $1 ORDER BY stage_number`,
    [runId],
  );
  return { run, stages: stagesResult.rows.map(mapStageRow) };
}

// ── List Runs ──

export async function listRuns(tenantId: string, opts: {
  page?: number; limit?: number; status?: QgateRunStatus;
}): Promise<{ rows: QgateRunRecord[]; total: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];

  if (opts.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(opts.status);
  }

  const where = conditions.join(' AND ');
  const countResult = await safeQuery(
    `SELECT COUNT(*) AS total FROM "${schema}".qgate_runs WHERE ${where}`, params,
  );
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".qgate_runs WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows: dataResult.rows.map(mapRunRow), total: Number(countResult.rows[0]?.total ?? 0) };
}

// ── Latest Run ──

export async function getLatestRun(tenantId: string): Promise<QgateRunRecord | null> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".qgate_runs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  );
  return result.rows[0] ? mapRunRow(result.rows[0]) : null;
}

// ── Update Stage ──

export async function updateStageResult(tenantId: string, runId: string, stageCode: string, update: {
  status: QgateRunStatus;
  score?: number;
  threshold?: number;
  durationMs?: number;
  blockers?: Array<{ code: string; message: string; severity: string }>;
  details?: Record<string, unknown>;
}): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".qgate_stage_results
     SET status = $1, score = $2, threshold = $3, duration_ms = $4, blockers = $5, details = $6
     WHERE run_id = $7 AND stage_code = $8`,
    [update.status, update.score ?? null, update.threshold ?? null,
     update.durationMs ?? null, JSON.stringify(update.blockers ?? []),
     JSON.stringify(update.details ?? {}), runId, stageCode],
  );
}

// ── Finalize Run ──

export async function finalizeRun(tenantId: string, runId: string, stageResults: StageResult[]): Promise<QgateRunOutput> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const passed = stageResults.filter(s => s.passed).length;
  const failed = stageResults.filter(s => !s.passed).length;
  const overallScore = stageResults.length > 0
    ? stageResults.reduce((sum, s) => sum + (s.score ?? 0), 0) / stageResults.length
    : null;
  const status: QgateRunStatus = failed > 0 ? 'failed' : 'passed';
  const now = new Date().toISOString();

  await safeQuery(
    `UPDATE "${schema}".qgate_runs
     SET status = $1, overall_score = $2, stages_passed = $3, stages_failed = $4,
         completed_at = $5, updated_at = $5
     WHERE run_id = $6`,
    [status, overallScore, passed, failed, now, runId],
  );

  const eventName = status === 'passed' ? 'run.completed' : 'run.failed';
  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId: 'system', module: 'quality-gate',
    event: eventName, entityType: 'qgate_runs', entityId: runId,
    data: { runId, status, overallScore, passed, failed },
  }));

  return {
    runId, tenantId, status, overallScore,
    stagesTotal: stageResults.length, stagesPassed: passed, stagesFailed: failed,
    stages: stageResults, durationMs: stageResults.reduce((s, r) => s + r.durationMs, 0),
  };
}

// ── Override Run ──

export async function overrideRun(tenantId: string, runId: string, userId: string, reason: string): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE "${schema}".qgate_runs SET status = 'overridden', override_by = $1, override_reason = $2, updated_at = $3 WHERE run_id = $4 AND status = 'failed'`,
    [userId, reason, now, runId],
  );
  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId, module: 'quality-gate',
    event: 'run.overridden', entityType: 'qgate_runs', entityId: runId,
    data: { runId, overrideBy: userId, reason },
  }));
}

// ── Thresholds ──

export async function getThresholds(tenantId: string): Promise<Record<string, Record<string, number>>> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT stage_code, metric_code, min_value FROM "${schema}".qgate_thresholds WHERE tenant_id = $1`,
    [tenantId],
  );

  // Start with defaults, overlay tenant overrides
  const merged: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  for (const row of result.rows) {
    const stage = row.stage_code as string;
    const metric = row.metric_code as string;
    if (!merged[stage]) merged[stage] = {};
    merged[stage][metric] = Number(row.min_value);
  }
  return merged;
}

export async function updateThreshold(tenantId: string, stageCode: string, metricCode: string, minValue: number, userId: string, reason?: string): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".qgate_thresholds (tenant_id, stage_code, metric_code, min_value, override_reason, set_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant_id, stage_code, metric_code)
     DO UPDATE SET min_value = $4, override_reason = $5, set_by = $6`,
    [tenantId, stageCode, metricCode, minValue, reason ?? null, userId],
  );
  swallow(EC.EVENT_BUS, emitEvent({
    tenantId, userId, module: 'quality-gate',
    event: 'threshold.updated', entityType: 'qgate_thresholds', entityId: `${stageCode}:${metricCode}`,
    data: { stageCode, metricCode, minValue },
  }));
}

// ── Row Mappers ──

function mapRunRow(row: Record<string, unknown>): QgateRunRecord {
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

function mapStageRow(row: Record<string, unknown>): QgateStageResultRecord {
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
