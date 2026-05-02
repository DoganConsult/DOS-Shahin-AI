import { randomUUID } from 'node:crypto';
import { query } from '@dos/db';
import { logger } from '@dos/module-sdk';
import { recordMetric } from '../../ports/telemetry.port';

export interface ScheduledJob {
  job_id: string;
  tenant_id: string;
  name: string;
  cron_expression: string;
  job_type: string;
  payload: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  last_triggered_at: string | null;
  last_triggered_by: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export interface RegisterJobInput {
  tenantId: string;
  name: string;
  cronExpression: string;
  jobType: string;
  payload?: Record<string, unknown>;
  createdBy?: string;
}

export interface ListJobsInput {
  tenantId: string;
  limit: number;
  offset: number;
  active?: boolean;
}

export async function registerScheduledJob(input: RegisterJobInput): Promise<ScheduledJob> {
  const jobId = randomUUID();
  const result = await query(
    `INSERT INTO dos.workflow_scheduled_jobs
      (job_id, tenant_id, name, cron_expression, job_type, payload, is_active, created_by, trigger_count)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, TRUE, $7, 0)
     RETURNING job_id, tenant_id, name, cron_expression, job_type, payload, is_active,
               created_by, last_triggered_at, last_triggered_by, trigger_count, created_at, updated_at`,
    [
      jobId,
      input.tenantId,
      input.name,
      input.cronExpression,
      input.jobType,
      JSON.stringify(input.payload ?? {}),
      input.createdBy ?? null,
    ],
  );
  return result.rows[0] as ScheduledJob;
}

export async function getScheduledJob(jobId: string, tenantId: string): Promise<ScheduledJob | null> {
  const result = await query(
    `SELECT job_id, tenant_id, name, cron_expression, job_type, payload, is_active,
            created_by, last_triggered_at, last_triggered_by, trigger_count, created_at, updated_at
     FROM dos.workflow_scheduled_jobs
     WHERE job_id = $1 AND tenant_id = $2`,
    [jobId, tenantId],
  );
  if (result.rows.length === 0) return null;
  return result.rows[0] as ScheduledJob;
}

export async function listScheduledJobs(input: ListJobsInput): Promise<{ data: ScheduledJob[]; total: number }> {
      const { tenantId } = input;
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [input.tenantId];
  let idx = 2;

  if (input.active !== undefined) {
    conditions.push(`is_active = $${idx}`);
    params.push(input.active);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM dos.workflow_scheduled_jobs ${where}`,
    params,
  );
  const total = (countResult.rows[0] as any)?.total || 0;

  const dataResult = await query(
    `SELECT job_id, tenant_id, name, cron_expression, job_type, payload, is_active,
            created_by, last_triggered_at, last_triggered_by, trigger_count, created_at, updated_at
     FROM dos.workflow_scheduled_jobs ${where}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { data: dataResult.rows as ScheduledJob[], total };
}

export async function triggerScheduledJob(
  jobId: string,
  tenantId: string,
  triggeredBy?: string,
): Promise<ScheduledJob | null> {
  const job = await getScheduledJob(jobId, tenantId);
  if (!job) return null;

  await query(
    `UPDATE dos.workflow_scheduled_jobs
     SET last_triggered_at = NOW(), last_triggered_by = $1, trigger_count = trigger_count + 1, updated_at = NOW()
     WHERE job_id = $2 AND tenant_id = $3`,
    [triggeredBy || null, jobId, tenantId],
  );

  logger.info('Scheduled job triggered', { jobId, tenantId, triggeredBy });
  // Operational metric: workflow scheduled-job triggers per tenant.
  try {
    recordMetric({
      name: 'workflow.scheduled_job.triggered',
      kind: 'counter',
      value: 1,
      labels: { tenant_id: tenantId, job_id: jobId },
    });
  } catch { /* telemetry must not block job execution */ }

  return getScheduledJob(jobId, tenantId);
}

export async function deactivateScheduledJob(
  jobId: string,
  tenantId: string,
): Promise<ScheduledJob | null> {
  const job = await getScheduledJob(jobId, tenantId);
  if (!job) return null;

  await query(
    `UPDATE dos.workflow_scheduled_jobs
     SET is_active = false, updated_at = NOW()
     WHERE job_id = $1 AND tenant_id = $2`,
    [jobId, tenantId],
  );

  logger.info('Scheduled job deactivated', { jobId, tenantId });

  return getScheduledJob(jobId, tenantId);
}
