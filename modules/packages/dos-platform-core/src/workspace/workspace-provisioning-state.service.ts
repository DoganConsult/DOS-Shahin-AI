/**
 * Workspace Provisioning State Service — Tracks provisioning step execution.
 *
 * Manages the lifecycle of workspace provisioning runs: initialization,
 * step completion/failure/retry, progress tracking, and cancellation.
 * Each provisioning run consists of ordered steps stored in workspace_provisioning_steps.
 */

import {  safeQuery } from '@dos/db';
import { logger } from '../observability/logger';
import { randomUUID } from 'crypto';

// ── Types ──

export type ProvisioningRunStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ProvisioningStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface ProvisioningStepDef {
  stepCode: string;
  label: string;
  ordinal: number;
  isRequired: boolean;
  metadata?: Record<string, unknown>;
}

export interface StepResult {
  outputData?: Record<string, unknown>;
  durationMs?: number;
}

export interface ProvisioningState {
  runId: string;
  workspaceId: string;
  tenantId: string;
  status: ProvisioningRunStatus;
  startedAt: string;
  completedAt: string | null;
  cancelledBy: string | null;
  steps: ProvisioningStepRecord[];
}

export interface ProvisioningStepRecord {
  stepId: string;
  runId: string;
  stepCode: string;
  label: string;
  ordinal: number;
  isRequired: boolean;
  status: ProvisioningStepStatus;
  errorMessage: string | null;
  outputData: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
}

export interface ProvisioningProgress {
  runId: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  pendingSteps: number;
  percentComplete: number;
  steps: ProvisioningStepRecord[];
}

// ── Internal Helpers ──

function mapStepRow( r: Record<string, any>): ProvisioningStepRecord {
  return {
    stepId: r.step_id,
    runId: r.run_id,
    stepCode: r.step_code,
    label: r.label ?? r.step_code,
    ordinal: r.ordinal ?? 0,
    isRequired: r.is_required !== false,
    status: r.status ?? 'pending',
    errorMessage: r.error_message ?? null,
    outputData: r.output_data ?? {},
    startedAt: r.started_at?.toISOString?.() ?? r.started_at ?? null,
    completedAt: r.completed_at?.toISOString?.() ?? r.completed_at ?? null,
    retryCount: r.retry_count ?? 0,
  };
}

async function getActiveRunId(tenantId: string, workspaceId: string): Promise<string | null> {
  const { rows } = await safeQuery(
    `SELECT run_id FROM workspace_provisioning_runs
     WHERE workspace_id = $1 AND tenant_id = $2
       AND status IN ('pending', 'in_progress')
     ORDER BY started_at DESC LIMIT 1`,
    [workspaceId, tenantId],
  );
  return rows[0]?.run_id ?? null;
}

async function getRunSteps(runId: string): Promise<ProvisioningStepRecord[]> {
  const { rows } = await safeQuery(
    `SELECT step_id, run_id, step_code, label, ordinal, is_required, status,
            error_message, COALESCE(output_data, '{}'::jsonb) AS output_data,
            started_at, completed_at, retry_count
     FROM workspace_provisioning_steps
     WHERE run_id = $1
     ORDER BY ordinal ASC`,
    [runId],
  );
  return rows.map(mapStepRow);
}

async function recalculateRunStatus(runId: string): Promise<void> {
  const steps = await getRunSteps(runId);
  if (steps.length === 0) return;

  const allCompleted = steps.every((s) => s.status === 'completed' || s.status === 'skipped');
  const anyRequiredFailed = steps.some((s) => s.status === 'failed' && s.isRequired);

  let newStatus: ProvisioningRunStatus = 'in_progress';
  if (allCompleted) {
    newStatus = 'completed';
  } else if (anyRequiredFailed) {
    newStatus = 'failed';
  }

  const completedAt = newStatus === 'completed' || newStatus === 'failed' ? new Date().toISOString() : null;

  await safeQuery(
    `UPDATE workspace_provisioning_runs
     SET status = $1, completed_at = $2
     WHERE run_id = $3`,
    [newStatus, completedAt, runId],
  );
}

// ── Service Functions ──

/**
 * Retrieve the current provisioning state for a workspace, including all steps.
 */
export async function getProvisioningState(
  tenantId: string,
  workspaceId: string,
): Promise<ProvisioningState | null> {
  try {
    const { rows } = await safeQuery(
      `SELECT run_id, workspace_id, tenant_id, status, started_at, completed_at, cancelled_by
       FROM workspace_provisioning_runs
       WHERE workspace_id = $1 AND tenant_id = $2
       ORDER BY started_at DESC LIMIT 1`,
      [workspaceId, tenantId],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    const steps = await getRunSteps(r.run_id);
    return {
      runId: r.run_id,
      workspaceId: r.workspace_id,
      tenantId: r.tenant_id,
      status: r.status,
      startedAt: r.started_at?.toISOString?.() ?? r.started_at ?? '',
      completedAt: r.completed_at?.toISOString?.() ?? r.completed_at ?? null,
      cancelledBy: r.cancelled_by ?? null,
      steps,
    };
  } catch (err: any) {

    logger.error(`[WorkspaceProvisioning] Failed to get provisioning state for workspace ${workspaceId}: ${err.message}`);
    return null;
  }
}

/**
 * Initialize a new provisioning run for a workspace with the specified steps.
 * Throws if there is already an active (pending/in_progress) provisioning run.
 */
export async function startProvisioning(
  tenantId: string,
  workspaceId: string,
  steps: ProvisioningStepDef[],
): Promise<ProvisioningState> {
  const existingRunId = await getActiveRunId(tenantId, workspaceId);
  if (existingRunId) {
    const err: any = new Error(
      `Workspace ${workspaceId} already has an active provisioning run: ${existingRunId}`,
    );

    err.statusCode = 409;
    throw err;
  }

  if (steps.length === 0) {
    const err: any = new Error('Cannot start provisioning with zero steps');

    err.statusCode = 422;
    throw err;
  }

  const runId = randomUUID();
  const now = new Date().toISOString();

  try {
    await safeQuery(
      `INSERT INTO workspace_provisioning_runs
         (run_id, workspace_id, tenant_id, status, started_at)
       VALUES ($1, $2, $3, 'in_progress', $4)`,
      [runId, workspaceId, tenantId, now],
    );

    // Insert all steps in order
    for (const step of steps) {
      const stepId = randomUUID();
      await safeQuery(
        `INSERT INTO workspace_provisioning_steps
           (step_id, run_id, step_code, label, ordinal, is_required, status, retry_count)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0)`,
        [stepId, runId, step.stepCode, step.label, step.ordinal, step.isRequired],
      );
    }

    logger.info(
      `[WorkspaceProvisioning] Started provisioning run ${runId} for workspace ${workspaceId} with ${steps.length} steps`,
    );

    const allSteps = await getRunSteps(runId);
    return {
      runId,
      workspaceId,
      tenantId,
      status: 'in_progress',
      startedAt: now,
      completedAt: null,
      cancelledBy: null,
      steps: allSteps,
    };
  } catch (err: any) {

    if (err.statusCode) throw err;

    logger.error(`[WorkspaceProvisioning] Failed to start provisioning for workspace ${workspaceId}: ${err.message}`);
    throw err;
  }
}

/**
 * Mark a provisioning step as completed with optional result data.
 */
export async function completeStep(
  tenantId: string,
  workspaceId: string,
  stepCode: string,
  result: StepResult,
): Promise<ProvisioningStepRecord | null> {
  const runId = await getActiveRunId(tenantId, workspaceId);
  if (!runId) {
    logger.warn(`[WorkspaceProvisioning] No active provisioning run found for workspace ${workspaceId}`);
    return null;
  }

  const now = new Date().toISOString();
  const outputData = result.outputData ?? {};

  try {
    const { rows } = await safeQuery(
      `UPDATE workspace_provisioning_steps
       SET status = 'completed',
           output_data = $1,
           completed_at = $2,
           started_at = COALESCE(started_at, $2)
       WHERE run_id = $3 AND step_code = $4
       RETURNING step_id, run_id, step_code, label, ordinal, is_required, status,
                 error_message, output_data, started_at, completed_at, retry_count`,
      [JSON.stringify(outputData), now, runId, stepCode],
    );
    if (!rows[0]) {
      logger.warn(`[WorkspaceProvisioning] Step ${stepCode} not found in run ${runId}`);
      return null;
    }

    logger.info(`[WorkspaceProvisioning] Step ${stepCode} completed for workspace ${workspaceId}`);
    await recalculateRunStatus(runId);
    return mapStepRow(rows[0]);
  } catch (err: any) {

    logger.error(`[WorkspaceProvisioning] Failed to complete step ${stepCode} for workspace ${workspaceId}: ${err.message}`);
    throw err;
  }
}

/**
 * Mark a provisioning step as failed with an error message.
 */
export async function failStep(
  tenantId: string,
  workspaceId: string,
  stepCode: string,
  error: string,
): Promise<ProvisioningStepRecord | null> {
  const runId = await getActiveRunId(tenantId, workspaceId);
  if (!runId) {
    logger.warn(`[WorkspaceProvisioning] No active provisioning run found for workspace ${workspaceId}`);
    return null;
  }

  const now = new Date().toISOString();

  try {
    const { rows } = await safeQuery(
      `UPDATE workspace_provisioning_steps
       SET status = 'failed',
           error_message = $1,
           completed_at = $2,
           started_at = COALESCE(started_at, $2)
       WHERE run_id = $3 AND step_code = $4
       RETURNING step_id, run_id, step_code, label, ordinal, is_required, status,
                 error_message, output_data, started_at, completed_at, retry_count`,
      [error, now, runId, stepCode],
    );
    if (!rows[0]) {
      logger.warn(`[WorkspaceProvisioning] Step ${stepCode} not found in run ${runId}`);
      return null;
    }

    logger.warn(`[WorkspaceProvisioning] Step ${stepCode} failed for workspace ${workspaceId}: ${error}`);
    await recalculateRunStatus(runId);
    return mapStepRow(rows[0]);
  } catch (err: any) {

    logger.error(`[WorkspaceProvisioning] Failed to record step failure for ${stepCode}: ${err.message}`);
    throw err;
  }
}

/**
 * Retry a previously failed provisioning step. Resets the step to 'pending'
 * and increments the retry count.
 */
export async function retryStep(
  tenantId: string,
  workspaceId: string,
  stepCode: string,
): Promise<ProvisioningStepRecord | null> {
  const runId = await getActiveRunId(tenantId, workspaceId);
  if (!runId) {
    logger.warn(`[WorkspaceProvisioning] No active provisioning run found for workspace ${workspaceId}`);
    return null;
  }

  try {
    // Only allow retry of failed steps
    const { rows: checkRows } = await safeQuery(
      `SELECT status FROM workspace_provisioning_steps
       WHERE run_id = $1 AND step_code = $2 LIMIT 1`,
      [runId, stepCode],
    );
    if (!checkRows[0]) {
      logger.warn(`[WorkspaceProvisioning] Step ${stepCode} not found in run ${runId}`);
      return null;
    }
    if (checkRows[0].status !== 'failed') {
      const err: any = new Error(`Step ${stepCode} is not in 'failed' state, cannot retry`);

      err.statusCode = 422;
      throw err;
    }

    const { rows } = await safeQuery(
      `UPDATE workspace_provisioning_steps
       SET status = 'pending',
           error_message = NULL,
           completed_at = NULL,
           retry_count = retry_count + 1
       WHERE run_id = $1 AND step_code = $2
       RETURNING step_id, run_id, step_code, label, ordinal, is_required, status,
                 error_message, output_data, started_at, completed_at, retry_count`,
      [runId, stepCode],
    );

    // If the run was marked as failed, move it back to in_progress on retry
    await safeQuery(
      `UPDATE workspace_provisioning_runs SET status = 'in_progress', completed_at = NULL
       WHERE run_id = $1 AND status = 'failed'`,
      [runId],
    );

    logger.info(`[WorkspaceProvisioning] Step ${stepCode} queued for retry (attempt ${rows[0].retry_count}) for workspace ${workspaceId}`);
    return mapStepRow(rows[0]);
  } catch (err: any) {

    if (err.statusCode) throw err;

    logger.error(`[WorkspaceProvisioning] Failed to retry step ${stepCode}: ${err.message}`);
    throw err;
  }
}

/**
 * Get provisioning progress as a percentage with step-level breakdown.
 */
export async function getProvisioningProgress(
  tenantId: string,
  workspaceId: string,
): Promise<ProvisioningProgress | null> {
  const state = await getProvisioningState(tenantId, workspaceId);
  if (!state) return null;

  const totalSteps = state.steps.length;
  const completedSteps = state.steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length;
  const failedSteps = state.steps.filter((s) => s.status === 'failed').length;
  const pendingSteps = state.steps.filter((s) => s.status === 'pending' || s.status === 'in_progress').length;
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    runId: state.runId,
    totalSteps,
    completedSteps,
    failedSteps,
    pendingSteps,
    percentComplete,
    steps: state.steps,
  };
}

/**
 * Check whether the most recent provisioning run for a workspace has completed successfully.
 */
export async function isProvisioningComplete(
  tenantId: string,
  workspaceId: string,
): Promise<boolean> {
  try {
    const { rows } = await safeQuery(
      `SELECT status FROM workspace_provisioning_runs
       WHERE workspace_id = $1 AND tenant_id = $2
       ORDER BY started_at DESC LIMIT 1`,
      [workspaceId, tenantId],
    );
    if (!rows[0]) return false;
    return rows[0].status === 'completed';
  } catch (err: any) {

    logger.error(`[WorkspaceProvisioning] Failed to check completion for workspace ${workspaceId}: ${err.message}`);
    return false;
  }
}

/**
 * Cancel an in-progress provisioning run. Marks all pending steps as skipped.
 */
export async function cancelProvisioning(
  tenantId: string,
  workspaceId: string,
  cancelledBy: string,
): Promise<ProvisioningState | null> {
  const runId = await getActiveRunId(tenantId, workspaceId);
  if (!runId) {
    logger.warn(`[WorkspaceProvisioning] No active provisioning run to cancel for workspace ${workspaceId}`);
    return null;
  }

  const now = new Date().toISOString();

  try {
    // Mark all pending/in_progress steps as skipped
    await safeQuery(
      `UPDATE workspace_provisioning_steps
       SET status = 'skipped', completed_at = $1
       WHERE run_id = $2 AND status IN ('pending', 'in_progress')`,
      [now, runId],
    );

    // Mark the run as cancelled
    await safeQuery(
      `UPDATE workspace_provisioning_runs
       SET status = 'cancelled', completed_at = $1, cancelled_by = $2
       WHERE run_id = $3`,
      [now, cancelledBy, runId],
    );

    logger.info(`[WorkspaceProvisioning] Provisioning run ${runId} cancelled by ${cancelledBy} for workspace ${workspaceId}`);
    return getProvisioningState(tenantId, workspaceId);
  } catch (err: any) {

    logger.error(`[WorkspaceProvisioning] Failed to cancel provisioning for workspace ${workspaceId}: ${err.message}`);
    throw err;
  }
}
