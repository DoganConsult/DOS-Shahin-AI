import { randomUUID } from 'crypto';
import { query, tenantSchema } from '@dos/db';
import { logger } from '@dos/module-sdk';

function tbl(tenantId: string, table: string): string {
  return `"${tenantSchema(tenantId)}"."${table}"`;
}

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
  const payload = input.payload ? JSON.stringify(input.payload) : '{}';

  await query(
    `INSERT INTO ${tbl(input.tenantId, 'workflow_scheduled_jobs')}
       (job_id, name, cron_expression, job_type, payload, is_active, created_by,
        trigger_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, $6, 0, NOW(), NOW())`,
    [jobId, input.name, input.cronExpression, input.jobType, payload, input.createdBy || null],
  );

  logger.info('Scheduled job registered', { jobId, tenantId: input.tenantId, jobType: input.jobType });

  const job = await getScheduledJob(jobId, input.tenantId);
  if (!job) throw new Error('Failed to retrieve registered scheduled job');
  return job;
}

export async function getScheduledJob(jobId: string, tenantId: string): Promise<ScheduledJob | null> {
  const result = await query(
    `SELECT job_id, tenant_id, name, cron_expression, job_type, payload, is_active,
            created_by, last_triggered_at, last_triggered_by, trigger_count, created_at, updated_at
     FROM ${tbl(tenantId, 'workflow_scheduled_jobs')}
     WHERE job_id = $1`,
    [jobId],
  );
  if (result.rows.length === 0) return null;
  return result.rows[0] as ScheduledJob;
}

export async function listScheduledJobs(input: ListJobsInput): Promise<{ data: ScheduledJob[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.active !== undefined) {
    conditions.push(`is_active = $${idx}`);
    params.push(input.active);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;
  const table = tbl(input.tenantId, 'workflow_scheduled_jobs');

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM ${table} ${where}`,
    params,
  );
  const total = (countResult.rows[0] as any)?.total || 0;

  const dataResult = await query(
    `SELECT job_id, tenant_id, name, cron_expression, job_type, payload, is_active,
            created_by, last_triggered_at, last_triggered_by, trigger_count, created_at, updated_at
     FROM ${table} ${where}
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
    `UPDATE ${tbl(tenantId, 'workflow_scheduled_jobs')}
     SET last_triggered_at = NOW(), last_triggered_by = $1, trigger_count = trigger_count + 1, updated_at = NOW()
     WHERE job_id = $2`,
    [triggeredBy || null, jobId],
  );

  logger.info('Scheduled job triggered', { jobId, tenantId, triggeredBy });

  return getScheduledJob(jobId, tenantId);
}

export async function deactivateScheduledJob(
  jobId: string,
  tenantId: string,
): Promise<ScheduledJob | null> {
  const job = await getScheduledJob(jobId, tenantId);
  if (!job) return null;

  await query(
    `UPDATE ${tbl(tenantId, 'workflow_scheduled_jobs')}
     SET is_active = false, updated_at = NOW()
     WHERE job_id = $1`,
    [jobId],
  );

  logger.info('Scheduled job deactivated', { jobId, tenantId });

  return getScheduledJob(jobId, tenantId);
}
