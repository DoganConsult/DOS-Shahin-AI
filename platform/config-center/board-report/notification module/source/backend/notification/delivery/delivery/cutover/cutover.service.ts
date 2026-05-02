import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';
import type { CutoverPlan } from '../contracts/delivery.types';

export type CutoverStatus = 'planned' | 'in_progress' | 'completed' | 'aborted' | 'rolled_back';

export interface CutoverExecution {
  executionId: string;
  cutoverId: string;
  releaseId: string;
  status: CutoverStatus;
  currentCheckpoint: string | null;
  passedCheckpoints: string[];
  noGoTriggered: boolean;
  noGoReason: string | null;
  executedBy: string;
  startedAt: string;
  completedAt: string | null;
  abortedAt: string | null;
  notes: string | null;
}

export async function createCutoverPlan(input: {
  releaseId: string;
  scope: string;
  owner: string;
  executionSequence: string[];
  checkpoints: string[];
  noGoCriteria: string[];
  rollbackTriggers: string[];
  communicationPath: string;
  monitoringWindowMinutes?: number;
}): Promise<CutoverPlan> {
  const cutoverId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_cutover_plans (
      cutover_id, release_id, scope, owner,
      execution_sequence, checkpoints, no_go_criteria,
      rollback_triggers, communication_path,
      monitoring_window_minutes, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      cutoverId,
      input.releaseId,
      input.scope,
      input.owner,
      JSON.stringify(input.executionSequence),
      JSON.stringify(input.checkpoints),
      JSON.stringify(input.noGoCriteria),
      JSON.stringify(input.rollbackTriggers),
      input.communicationPath,
      input.monitoringWindowMinutes ?? 60,
      now,
    ],
  );
  return getCutoverPlan(cutoverId) as Promise<CutoverPlan>;
}

export async function getCutoverPlan(cutoverId: string): Promise<CutoverPlan | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_cutover_plans WHERE cutover_id = $1 LIMIT 1`,
    [cutoverId],
  );
  if (!result.rows[0]) return null;
  return mapPlanRow(result.rows[0]);
}

export async function getCutoverPlanByRelease(releaseId: string): Promise<CutoverPlan | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_cutover_plans WHERE release_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [releaseId],
  );
  if (!result.rows[0]) return null;
  return mapPlanRow(result.rows[0]);
}

export async function startCutover(cutoverId: string, executedBy: string): Promise<CutoverExecution> {
  const executionId = uuid();
  const now = new Date().toISOString();
  const plan = await getCutoverPlan(cutoverId);
  if (!plan) throw new Error(`Cutover plan not found: ${cutoverId}`);

  await safeQuery(
    `INSERT INTO public.dos_cutover_executions (
      execution_id, cutover_id, release_id, status,
      current_checkpoint, passed_checkpoints, no_go_triggered,
      no_go_reason, executed_by, started_at, completed_at, aborted_at, notes
    ) VALUES ($1,$2,$3,'in_progress',NULL,'[]',false,NULL,$4,$5,NULL,NULL,NULL)`,
    [executionId, cutoverId, plan.releaseId, executedBy, now],
  );
  await publish('delivery.cutover.started', 'platform', { executionId, cutoverId, releaseId: plan.releaseId }, {});
  return getCutoverExecution(executionId) as Promise<CutoverExecution>;
}

export async function advanceCutoverCheckpoint(
  executionId: string,
  checkpoint: string,
): Promise<void> {
  await safeQuery(
    `UPDATE public.dos_cutover_executions
     SET current_checkpoint = $1,
         passed_checkpoints = passed_checkpoints || $2::jsonb
     WHERE execution_id = $3`,
    [checkpoint, JSON.stringify([checkpoint]), executionId],
  );
}

export async function completeCutover(executionId: string, notes?: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_cutover_executions SET status = 'completed', completed_at = $1, notes = $2 WHERE execution_id = $3`,
    [now, notes ?? null, executionId],
  );
  const exec = await getCutoverExecution(executionId);
  if (exec) {
    await publish('delivery.cutover.completed', 'platform', { executionId, cutoverId: exec.cutoverId }, {});
  }
}

export async function abortCutover(executionId: string, reason: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_cutover_executions
     SET status = 'aborted', aborted_at = $1, no_go_triggered = true, no_go_reason = $2
     WHERE execution_id = $3`,
    [now, reason, executionId],
  );
  const exec = await getCutoverExecution(executionId);
  if (exec) {
    await publish('delivery.cutover.aborted', 'platform', { executionId, cutoverId: exec.cutoverId, reason }, {});
  }
}

export async function getCutoverExecution(executionId: string): Promise<CutoverExecution | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_cutover_executions WHERE execution_id = $1 LIMIT 1`,
    [executionId],
  );
  if (!result.rows[0]) return null;
  return mapExecutionRow(result.rows[0]);
}

export async function listCutoverExecutionsByRelease(releaseId: string): Promise<CutoverExecution[]> {
  const result = await safeQuery(
    `SELECT e.* FROM public.dos_cutover_executions e
     WHERE e.release_id = $1
     ORDER BY e.started_at DESC`,
    [releaseId],
  );
  return result.rows.map(mapExecutionRow);
}

function mapPlanRow(row: Record<string, any>): CutoverPlan {
  return {
    cutoverId: row.cutover_id as string,
    releaseId: row.release_id as string,
    scope: row.scope as string,
    owner: row.owner as string,
    executionSequence: (row.execution_sequence as string[]) ?? [],
    checkpoints: (row.checkpoints as string[]) ?? [],
    noGoCriteria: (row.no_go_criteria as string[]) ?? [],
    rollbackTriggers: (row.rollback_triggers as string[]) ?? [],
    communicationPath: row.communication_path as string,
    monitoringWindowMinutes: (row.monitoring_window_minutes as number) ?? 60,
    createdAt: row.created_at as string,
  };
}

function mapExecutionRow(row: Record<string, any>): CutoverExecution {
  return {
    executionId: row.execution_id as string,
    cutoverId: row.cutover_id as string,
    releaseId: row.release_id as string,
    status: row.status as CutoverStatus,
    currentCheckpoint: (row.current_checkpoint as string) ?? null,
    passedCheckpoints: (row.passed_checkpoints as string[]) ?? [],
    noGoTriggered: row.no_go_triggered as boolean,
    noGoReason: (row.no_go_reason as string) ?? null,
    executedBy: row.executed_by as string,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? null,
    abortedAt: (row.aborted_at as string) ?? null,
    notes: (row.notes as string) ?? null,
  };
}
