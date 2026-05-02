/**
 * DORA Monitor Jobs — Background Health and Monitoring Tasks
 * =============================================================
 * Provides scheduled background jobs for DORA module health monitoring:
 *   - checkOverdueObligations: Flag obligations past deadline
 *   - checkResilienceTestSchedule: Alert on upcoming/overdue tests
 *   - recalculateReadinessScores: Batch recalculate and snapshot readiness
 *   - doraDataRetention: Archive stale records per retention policy
 *
 * Follows the pattern from `modules/compliance/jobs/compliance-monitor.job.ts`.
 *
 * MP-25 §11: Required observability — obligation changes, review decisions, AI usage.
 * MP-25 §11.2: Required metrics — obligation completion, readiness scores, overdue counts.
 *
 * @owner dora
 * @module dora
 * @since 2026-03-31
 */

import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Configuration Constants ────────────────────────────────────────────
const RESILIENCE_TEST_LOOKAHEAD_DAYS = 14;
const STALE_ARCHIVE_DAYS = 730;
const DATA_RETENTION_DAYS = 2555;

/**
 * Check for overdue DORA obligations across all provisioned tenants.
 * Flags obligations past their deadline that are still in active states.
 * Emits warning events for obligations approaching or past deadline.
 */
export async function checkOverdueObligations(tenantId: string): Promise<{
  overdueCount: number;
  flaggedCount: number;
}> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(tenantId);

  // Find obligations past their deadline
  const overdueResult = await safeQuery(
    `SELECT obligation_id, title, pillar, deadline, status, priority
     FROM "${schema}".dora_obligations
     WHERE deleted_at IS NULL
       AND status NOT IN ('expired', 'archived', 'approved')
       AND deadline < NOW()
     ORDER BY deadline ASC`,
  ).catch(() => ({ rows: [] }));

  const overdueCount = overdueResult.rows.length;
  let flaggedCount = 0;

  if (overdueCount > 0) {
    // Auto-flag overdue obligations that are not already flagged
    const flagResult = await safeQuery(
      `UPDATE "${schema}".dora_obligations
       SET status = 'overdue', updated_at = NOW()
       WHERE deleted_at IS NULL
         AND status NOT IN ('expired', 'archived', 'approved', 'overdue')
         AND deadline < NOW()
       RETURNING obligation_id`,
    ).catch(() => ({ rows: [], rowCount: 0 }));

    flaggedCount = flagResult.rows.length;

    // Emit events for newly flagged obligations
    if (flaggedCount > 0) {
      try {
        const { emitDoraEvent } = await import('../services/dora-event.service.js');
        for (const row of flagResult.rows as Record<string, unknown>[]) {
          await emitDoraEvent(tenantId, 'dora.obligation_overdue', 'obligation', (row as any).obligation_id, {
            flaggedByJob: true,
          }, 'warning');
        }
      } catch { /* event emission is non-fatal */ }
    }

    logger.warn(`[Job] dora-obligation-monitor: tenant ${tenantId} -- ${overdueCount} overdue, ${flaggedCount} newly flagged`);
  }

  return { overdueCount, flaggedCount };
}

/**
 * Check resilience test schedule for a tenant.
 * Alerts on upcoming tests (within lookahead window) and overdue tests.
 */
export async function checkResilienceTestSchedule(tenantId: string): Promise<{
  upcomingCount: number;
  overdueCount: number;
}> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(tenantId);

  // Find upcoming tests (within lookahead window)
  const upcomingResult = await safeQuery(
    `SELECT test_id, title, test_type, scheduled_date
     FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL
       AND status IN ('planned', 'scheduled')
       AND scheduled_date BETWEEN NOW() AND NOW() + ($1 || ' days')::interval
     ORDER BY scheduled_date ASC`,
    [RESILIENCE_TEST_LOOKAHEAD_DAYS],
  ).catch(() => ({ rows: [] }));

  // Find overdue tests (past scheduled date but not started)
  const overdueResult = await safeQuery(
    `SELECT test_id, title, test_type, scheduled_date
     FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL
       AND status IN ('planned', 'scheduled')
       AND scheduled_date < NOW()
     ORDER BY scheduled_date ASC`,
  ).catch(() => ({ rows: [] }));

  const upcomingCount = upcomingResult.rows.length;
  const overdueCount = overdueResult.rows.length;

  if (overdueCount > 0) {
    // Emit warning events for overdue tests
    try {
      const { emitDoraEvent } = await import('../services/dora-event.service.js');
      for (const row of overdueResult.rows as Record<string, unknown>[]) {
        await emitDoraEvent(tenantId, 'dora.resilience_test_overdue', 'resilience_test', (row as any).test_id, {
          title: row.title,
          scheduledDate: row.scheduled_date,
          flaggedByJob: true,
        }, 'warning');
      }
    } catch { /* event emission is non-fatal */ }

    logger.warn(`[Job] dora-resilience-schedule: tenant ${tenantId} -- ${overdueCount} overdue tests, ${upcomingCount} upcoming`);
  }

  return { upcomingCount, overdueCount };
}

/**
 * Recalculate readiness scores and persist a snapshot for trend tracking.
 * Calls the dashboard service to compute scores and save them.
 */
export async function recalculateReadinessScores(tenantId: string): Promise<{
  overallScore: number;
}> {
  try {
    const { saveReadinessSnapshot, getReadinessScores } = await import('../services/dora-dashboard.service.js');
    const readiness = await getReadinessScores(tenantId);
    await saveReadinessSnapshot(tenantId);

    logger.info(`[Job] dora-readiness-recalc: tenant ${tenantId} -- score ${readiness.overallScore}/100`);

    return { overallScore: readiness.overallScore };
  } catch (err) {
    logger.error(`[Job] dora-readiness-recalc: tenant ${tenantId} failed`, {
      error: toErrorMessage(err),
    });
    return { overallScore: 0 };
  }
}

/**
 * Export the DORA job definitions for the job scheduler.
 * Follows the same pattern as compliance-monitor.job.ts and risk-monitor.job.ts.
 */
export async function getDoraJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'dora-obligation-monitor',
      cron: '0 6 * * *',
      description: 'Detect overdue DORA obligations and flag them',
      handler: async () => {
        logger.info('[Job] dora-obligation-monitor executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await checkOverdueObligations(t.tenant_id);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] dora-obligation-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'dora-resilience-schedule-monitor',
      cron: '0 7 * * *',
      description: 'Alert on upcoming and overdue resilience tests',
      handler: async () => {
        logger.info('[Job] dora-resilience-schedule-monitor executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await checkResilienceTestSchedule(t.tenant_id);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] dora-resilience-schedule-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'dora-readiness-recalculator',
      cron: '0 2 * * 0',
      description: 'Recalculate DORA readiness scores and persist snapshots',
      handler: async () => {
        logger.info('[Job] dora-readiness-recalculator executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await recalculateReadinessScores(t.tenant_id);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] dora-readiness-recalculator error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'dora-stale-detector',
      cron: '0 10 * * 1',
      description: 'Detect and archive stale DORA records not updated in 2+ years',
      handler: async () => {
        logger.info('[Job] dora-stale-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              // Auto-archive obligations not updated in STALE_ARCHIVE_DAYS
              const oblResult = await safeQuery(
                `UPDATE "${schema}".dora_obligations
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('archived', 'expired')
                   AND updated_at < NOW() - INTERVAL '${STALE_ARCHIVE_DAYS} days'`,
              ).catch(() => ({ rowCount: 0 }));
              if (oblResult.rowCount && oblResult.rowCount > 0) {
                logger.info(`[Job] dora-stale-detector: tenant ${t.tenant_id} -- ${oblResult.rowCount} obligations auto-archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] dora-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'dora-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy for DORA module',
      handler: async () => {
        logger.info('[Job] dora-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              // Soft-delete archived records past retention period
              const tables = ['dora_obligations', 'dora_resilience_tests'];
              for (const table of tables) {
                await safeQuery(
                  `UPDATE "${schema}".${table}
                   SET deleted_at = NOW()
                   WHERE deleted_at IS NULL
                     AND status = 'archived'
                     AND updated_at < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'`,
                ).catch(catchHandler(EC.FALLBACK_QUERY, {
                  operation: `archive retained records from ${table}`,

                  tenantId,

                  table,
                }));
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] dora-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

