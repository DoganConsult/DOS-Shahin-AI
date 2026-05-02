// @ts-nocheck
import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getAiJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'ai-sla-monitor',
      cron: '0 */1 * * *',
      description: 'Monitor agent health and clean stale tasks',
      handler: async () => {
        logger.info('[Job] ai-sla-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueResult = await safeQuery(
                `SELECT COUNT(*)::int as count FROM "${schema}".ai_agents
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived', 'completed')
                   AND due_date < NOW()`,
              );
              const overdueCount = overdueResult.rows[0]?.count || 0;
              if (overdueCount > 0) {
                logger.warn(`[Job] ai-sla-monitor: tenant ${t.tenant_id} -- ${overdueCount} overdue items`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] ai-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'ai-stale-detector',
      cron: '0 10 * * 1',
      description: 'Detect stale ai items not updated in 90+ days',
      handler: async () => {
        logger.info('[Job] ai-stale-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".ai_agents
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived')
                   AND updated_at < NOW() - INTERVAL '365 days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] ai-stale-detector: tenant ${t.tenant_id} -- ${result.rowCount} items auto-archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] ai-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'ai-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy for ai module',
      handler: async () => {
        logger.info('[Job] ai-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".ai_agents
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id AND lh.entity_type = 'ai' AND lh.active = true
                   )`,
              );
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] ai-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

