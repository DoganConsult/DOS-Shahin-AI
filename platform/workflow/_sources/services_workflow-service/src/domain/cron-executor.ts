import { query } from '@dos/db';
import { logger } from '@dos/module-sdk';
import { triggerScheduledJob } from './schedule.service';

let _interval: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL_MS = 60_000;

function cronMatches(expression: string, now: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [minPart, hourPart, domPart, monPart, dowPart] = parts;
  const minute = now.getMinutes();
  const hour = now.getHours();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;
  const dayOfWeek = now.getDay();

  return fieldMatches(minPart, minute)
    && fieldMatches(hourPart, hour)
    && fieldMatches(domPart, dayOfMonth)
    && fieldMatches(monPart, month)
    && fieldMatches(dowPart, dayOfWeek);
}

function fieldMatches(field: string, value: number): boolean {
  if (field === '*') return true;
  if (field.includes('/')) {
    const [, step] = field.split('/');
    return value % parseInt(step) === 0;
  }
  if (field.includes(',')) {
    return field.split(',').some((v) => parseInt(v) === value);
  }
  if (field.includes('-')) {
    const [min, max] = field.split('-').map(Number);
    return value >= min && value <= max;
  }
  return parseInt(field) === value;
}

async function checkAndTrigger(): Promise<void> {
  try {
    const now = new Date();
    const result = await query(
      `SELECT job_id, tenant_id, cron_expression, name
       FROM dos.workflow_scheduled_jobs
       WHERE is_active = TRUE`,
    );

    for (const job of result.rows as any[]) {
      if (cronMatches(job.cron_expression, now)) {
        logger.info('[cron] Triggering job', { jobId: job.job_id, name: job.name });
        await triggerScheduledJob(job.job_id, job.tenant_id, 'cron-executor').catch((err: any) => {
          logger.error('[cron] Trigger failed', { jobId: job.job_id, error: err?.message });
        });
      }
    }
  } catch (err: any) {
    logger.error('[cron] Check cycle failed', { error: err?.message });
  }
}

export function startCronExecutor(): void {
  if (_interval) return;
  logger.info('[cron] Starting cron executor', { intervalMs: CHECK_INTERVAL_MS });
  _interval = setInterval(checkAndTrigger, CHECK_INTERVAL_MS);
  _interval.unref();
}

export function stopCronExecutor(): void {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
    logger.info('[cron] Cron executor stopped');
  }
}
