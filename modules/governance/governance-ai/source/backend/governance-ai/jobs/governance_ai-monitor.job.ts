import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { GOVERNANCE_AI_TIMEOUTS } from '../data/governance_ai-constants';

const STALE_ARCHIVE_DAYS = GOVERNANCE_AI_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS;
const DATA_RETENTION_DAYS = 2555;

export async function getGovernanceAiJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'governance_ai-overdue-monitor',
      cron: '0 */4 * * *',
      description: 'Monitor overdue governance signals and escalation items',
      handler: async () => {
        logger.info('[Job] governance_ai-overdue-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueSignals = await safeQuery(`
                SELECT COUNT(*)::int AS count
                FROM "${schema}".governance_signals
                WHERE deleted_at IS NULL
                  AND status NOT IN ('resolved', 'dismissed', 'archived')
                  AND severity IN ('critical', 'high')
                  AND detected_at < NOW() - INTERVAL '72 hours'
              `);
              const overdueEscalations = await safeQuery(`
                SELECT COUNT(*)::int AS count
                FROM "${schema}".governance_escalation_events
                WHERE status NOT IN ('closed', 'resolved')
                  AND sla_deadline IS NOT NULL
                  AND sla_deadline < NOW()
              `).catch(() => ({ rows: [{ count: 0 }] }));
              const signalCount = overdueSignals.rows[0]?.count ?? 0;
              const escalationCount = overdueEscalations.rows[0]?.count ?? 0;
              if (signalCount > 0 || escalationCount > 0) {
                logger.warn(`[Job] governance_ai-overdue-monitor: tenant ${t.tenant_id} -- ${signalCount} overdue signals, ${escalationCount} overdue escalations`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] governance_ai-overdue-monitor error:`, toErrorMessage(err));
        }
      },
    },

    {
      name: 'governance_ai-stale-auto-archive',
      cron: '0 10 * * 1',
      description: `Auto-archive governance signals inactive for ${STALE_ARCHIVE_DAYS} days; respect legal holds`,
      handler: async () => {
        logger.info('[Job] governance_ai-stale-auto-archive executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".governance_signals
                SET status = 'archived', updated_at = NOW()
                WHERE deleted_at IS NULL
                  AND status NOT IN ('resolved', 'archived')
                  AND updated_at < NOW() - INTERVAL '${STALE_ARCHIVE_DAYS} days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id::text AND lh.entity_type = 'governance_signal' AND lh.active = true
                  )
              `);
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] governance_ai-stale-auto-archive: tenant ${t.tenant_id} -- ${result.rowCount} signals auto-archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] governance_ai-stale-auto-archive error:`, toErrorMessage(err));
        }
      },
    },

    {
      name: 'governance_ai-data-retention',
      cron: '0 0 1 * *',
      description: `Enforce data retention policy: soft-delete archived governance signals older than ${DATA_RETENTION_DAYS} days`,
      handler: async () => {
        logger.info('[Job] governance_ai-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".governance_signals
                SET deleted_at = NOW()
                WHERE deleted_at IS NULL
                  AND status = 'archived'
                  AND updated_at < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id::text AND lh.entity_type = 'governance_signal' AND lh.active = true
                  )
              `);
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] governance_ai-data-retention: tenant ${t.tenant_id} -- ${result.rowCount} signals soft-deleted`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] governance_ai-data-retention error:`, toErrorMessage(err));
        }
      },
    },

    {
      name: 'governance_ai-trend-report',
      cron: '0 6 * * 1',
      description: 'Generate weekly governance signal trend summary',
      handler: async () => {
        logger.info('[Job] governance_ai-trend-report executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const trendResult = await safeQuery(`
                SELECT
                  COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '7 days')::int AS new_this_week,
                  COUNT(*) FILTER (WHERE status IN ('resolved', 'archived') AND updated_at >= NOW() - INTERVAL '7 days')::int AS resolved_this_week,
                  COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'dismissed', 'archived'))::int AS active_total,
                  COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved', 'dismissed', 'archived'))::int AS critical_active
                FROM "${schema}".governance_signals
                WHERE deleted_at IS NULL
              `);
              const row = trendResult.rows[0] || {};
              logger.info(`[Job] governance_ai-trend-report: tenant ${t.tenant_id} -- new=${row.new_this_week} resolved=${row.resolved_this_week} active=${row.active_total} critical=${row.critical_active}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] governance_ai-trend-report error:`, toErrorMessage(err));
        }
      },
    },
  ];
}

