import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { CONTROLS_TIMEOUTS, CONTROLS_BUSINESS_THRESHOLDS as _CONTROLS_BUSINESS_THRESHOLDS } from '../data/controls-constants';

const STALE_ARCHIVE_DAYS = CONTROLS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS;
const DATA_RETENTION_DAYS = 2555;

export async function getControlsJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'controls-overdue-monitor',
      cron: '0 */4 * * *',
      description: 'Monitor overdue controls items and emit escalation events',
      handler: async () => {
        logger.info('[Job] controls-overdue-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueResult = await safeQuery(`
                SELECT COUNT(*)::int AS count
                FROM "${schema}".controlss
                WHERE deleted_at IS NULL
                  AND due_date < NOW()
                  AND status NOT IN ('closed', 'archived')
              `);
              const count = overdueResult.rows[0]?.count ?? 0;
              if (count > 0) {
                logger.warn(`[Job] controls-overdue-monitor: tenant ${t.tenant_id} -- ${count} overdue items`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] controls-overdue-monitor error:`, toErrorMessage(err));
        }
      },
    },

    {
      name: 'controls-stale-auto-archive',
      cron: '0 10 * * 1',
      description: `Auto-archive controls items inactive for ${STALE_ARCHIVE_DAYS} days; respect legal holds`,
      handler: async () => {
        logger.info('[Job] controls-stale-auto-archive executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".controlss
                SET status = 'archived', updated_at = NOW()
                WHERE deleted_at IS NULL
                  AND status NOT IN ('closed', 'archived')
                  AND updated_at < NOW() - INTERVAL '${STALE_ARCHIVE_DAYS} days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id::text AND lh.entity_type = 'controls' AND lh.active = true
                  )
              `);
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] controls-stale-auto-archive: tenant ${t.tenant_id} -- ${result.rowCount} items auto-archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] controls-stale-auto-archive error:`, toErrorMessage(err));
        }
      },
    },

    {
      name: 'controls-data-retention',
      cron: '0 0 1 * *',
      description: `Enforce data retention policy: soft-delete archived controls items older than ${DATA_RETENTION_DAYS} days`,
      handler: async () => {
        logger.info('[Job] controls-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".controlss
                SET deleted_at = NOW()
                WHERE deleted_at IS NULL
                  AND status = 'archived'
                  AND updated_at < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id::text AND lh.entity_type = 'controls' AND lh.active = true
                  )
              `);
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] controls-data-retention: tenant ${t.tenant_id} -- ${result.rowCount} items soft-deleted`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] controls-data-retention error:`, toErrorMessage(err));
        }
      },
    },

    {
      name: 'controls-trend-report',
      cron: '0 6 * * 1',
      description: 'Generate weekly controls trend summary',
      handler: async () => {
        logger.info('[Job] controls-trend-report executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const trendResult = await safeQuery(`
                SELECT
                  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_this_week,
                  COUNT(*) FILTER (WHERE status IN ('closed', 'archived') AND updated_at >= NOW() - INTERVAL '7 days')::int AS closed_this_week,
                  COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS open_total
                FROM "${schema}".controlss
                WHERE deleted_at IS NULL
              `);
              const row = trendResult.rows[0] || {};
              logger.info(`[Job] controls-trend-report: tenant ${t.tenant_id} -- new=${row.new_this_week} closed=${row.closed_this_week} open=${row.open_total}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] controls-trend-report error:`, toErrorMessage(err));
        }
      },
    },
  ];
}

