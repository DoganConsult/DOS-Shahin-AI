import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

const FAILURE_RETENTION_DAYS = 90;
const SESSION_EVENT_RETENTION_DAYS = 30;

/** Delete CSRF failures older than retention policy. */
export async function cleanupCsrfFailures(): Promise<{ deleted: number }> {
  try {
    const { rows } = await safeQuery(
      `DELETE FROM csrf_failures
       WHERE occurred_at < NOW() - ($1 || ' days')::interval
       RETURNING failure_id`,
      [FAILURE_RETENTION_DAYS],
    );
    const deleted = rows.length;
    if (deleted > 0) {
      logger.info('[Job] csrf-failure-cleanup completed', { deleted });
    }
    return { deleted };
  } catch (err) {
    logger.warn('[Job] csrf-failure-cleanup failed', { error: (err as Error).message });
    return { deleted: 0 };
  }
}

/** Delete session security events older than retention policy. */
export async function cleanupSessionSecurityEvents(): Promise<{ deleted: number }> {
  try {
    const { rows } = await safeQuery(
      `DELETE FROM session_security_events
       WHERE occurred_at < NOW() - ($1 || ' days')::interval
       RETURNING event_id`,
      [SESSION_EVENT_RETENTION_DAYS],
    );
    const deleted = rows.length;
    if (deleted > 0) {
      logger.info('[Job] session-event-cleanup completed', { deleted });
    }
    return { deleted };
  } catch (err) {
    logger.warn('[Job] session-event-cleanup failed', { error: (err as Error).message });
    return { deleted: 0 };
  }
}

/** Return job definitions for the scheduler. */
export function getCsrfJobs() {
  return [
    {
      name: 'csrf-failure-cleanup',
      cron: '0 3 * * *',
      description: `Delete CSRF failure records older than ${FAILURE_RETENTION_DAYS} days`,
      handler: cleanupCsrfFailures,
    },
    {
      name: 'session-event-cleanup',
      cron: '0 4 * * *',
      description: `Delete session security events older than ${SESSION_EVENT_RETENTION_DAYS} days`,
      handler: cleanupSessionSecurityEvents,
    },
  ];
}
