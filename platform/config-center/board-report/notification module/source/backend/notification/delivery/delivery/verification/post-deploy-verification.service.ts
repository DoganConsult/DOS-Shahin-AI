import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';

export type VerificationCheckStatus = 'pending' | 'passed' | 'failed' | 'skipped';
export type VerificationRunStatus = 'running' | 'passed' | 'failed' | 'partial';

export interface VerificationCheck {
  checkId: string;
  runId: string;
  releaseId: string;
  checkCode: string;
  category: 'health' | 'auth' | 'workflow' | 'integration' | 'ai' | 'admin' | 'smoke' | 'regression';
  status: VerificationCheckStatus;
  owner: string;
  durationMs: number | null;
  failureDetail: string | null;
  executedAt: string | null;
  createdAt: string;
}

export interface VerificationRun {
  runId: string;
  releaseId: string;
  deploymentId: string;
  status: VerificationRunStatus;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
  rollbackDecision: 'no-rollback' | 'rollback' | 'pending' | null;
  startedAt: string;
  completedAt: string | null;
  completedBy: string | null;
}

export async function startVerificationRun(input: {
  releaseId: string;
  deploymentId: string;
}): Promise<VerificationRun> {
  const runId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_verification_runs (
      run_id, release_id, deployment_id, status,
      total_checks, passed_checks, failed_checks, skipped_checks,
      rollback_decision, started_at, completed_at, completed_by
    ) VALUES ($1,$2,$3,'running',0,0,0,0,NULL,$4,NULL,NULL)`,
    [runId, input.releaseId, input.deploymentId, now],
  );
  await publish('delivery.verification.started', 'platform', { runId, releaseId: input.releaseId }, {});
  return getVerificationRun(runId) as Promise<VerificationRun>;
}

export async function registerVerificationCheck(input: {
  runId: string;
  releaseId: string;
  checkCode: string;
  category: VerificationCheck['category'];
  owner: string;
}): Promise<VerificationCheck> {
  const checkId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_verification_checks (
      check_id, run_id, release_id, check_code, category,
      status, owner, duration_ms, failure_detail, executed_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,'pending',$6,NULL,NULL,NULL,$7)`,
    [checkId, input.runId, input.releaseId, input.checkCode, input.category, input.owner, now],
  );
  return getVerificationCheck(checkId) as Promise<VerificationCheck>;
}

export async function recordCheckResult(
  checkId: string,
  status: VerificationCheckStatus,
  durationMs?: number,
  failureDetail?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_verification_checks
     SET status = $1, duration_ms = $2, failure_detail = $3, executed_at = $4
     WHERE check_id = $5`,
    [status, durationMs ?? null, failureDetail ?? null, now, checkId],
  );
}

export async function completeVerificationRun(
  runId: string,
  completedBy: string,
  rollbackDecision: VerificationRun['rollbackDecision'],
): Promise<VerificationRun | null> {
  const checks = await listChecksByRun(runId);
  const total = checks.length;
  const passed = checks.filter((c) => c.status === 'passed').length;
  const failed = checks.filter((c) => c.status === 'failed').length;
  const skipped = checks.filter((c) => c.status === 'skipped').length;
  const runStatus: VerificationRunStatus = failed > 0 ? 'failed' : passed + skipped === total ? 'passed' : 'partial';

  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_verification_runs
     SET status = $1, total_checks = $2, passed_checks = $3, failed_checks = $4,
         skipped_checks = $5, rollback_decision = $6, completed_at = $7, completed_by = $8
     WHERE run_id = $9`,
    [runStatus, total, passed, failed, skipped, rollbackDecision ?? 'pending', now, completedBy, runId],
  );

  const run = await getVerificationRun(runId);
  if (run) {
    await publish('delivery.verification.completed', 'platform', {
      runId,
      releaseId: run.releaseId,
      status: runStatus,
      rollbackDecision,
    }, {});
  }
  return run;
}

export async function getVerificationRun(runId: string): Promise<VerificationRun | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_verification_runs WHERE run_id = $1 LIMIT 1`,
    [runId],
  );
  if (!result.rows[0]) return null;
  return mapRunRow(result.rows[0]);
}

export async function getVerificationCheck(checkId: string): Promise<VerificationCheck | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_verification_checks WHERE check_id = $1 LIMIT 1`,
    [checkId],
  );
  if (!result.rows[0]) return null;
  return mapCheckRow(result.rows[0]);
}

export async function listChecksByRun(runId: string): Promise<VerificationCheck[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_verification_checks WHERE run_id = $1 ORDER BY created_at`,
    [runId],
  );
  return result.rows.map(mapCheckRow);
}

export async function listRunsByRelease(releaseId: string): Promise<VerificationRun[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_verification_runs WHERE release_id = $1 ORDER BY started_at DESC`,
    [releaseId],
  );
  return result.rows.map(mapRunRow);
}

function mapRunRow(row: Record<string, any>): VerificationRun {
  return {
    runId: row.run_id as string,
    releaseId: row.release_id as string,
    deploymentId: row.deployment_id as string,
    status: row.status as VerificationRunStatus,
    totalChecks: (row.total_checks as number) ?? 0,
    passedChecks: (row.passed_checks as number) ?? 0,
    failedChecks: (row.failed_checks as number) ?? 0,
    skippedChecks: (row.skipped_checks as number) ?? 0,
    rollbackDecision: (row.rollback_decision as VerificationRun['rollbackDecision']) ?? null,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? null,
    completedBy: (row.completed_by as string) ?? null,
  };
}

function mapCheckRow(row: Record<string, any>): VerificationCheck {
  return {
    checkId: row.check_id as string,
    runId: row.run_id as string,
    releaseId: row.release_id as string,
    checkCode: row.check_code as string,
    category: row.category as VerificationCheck['category'],
    status: row.status as VerificationCheckStatus,
    owner: row.owner as string,
    durationMs: (row.duration_ms as number) ?? null,
    failureDetail: (row.failure_detail as string) ?? null,
    executedAt: (row.executed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
