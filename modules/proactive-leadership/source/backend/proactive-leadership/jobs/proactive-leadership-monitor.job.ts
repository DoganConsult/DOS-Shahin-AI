import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getProactiveLeadershipJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'leadership-insight-generator',
      cron: '0 6 * * 1',
      description: 'Generate weekly AI-driven leadership insights from cross-module data',
      handler: async () => {
        logger.info('[Job] leadership-insight-generator started');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              logger.info(`[Job] leadership-insight-generator: processing tenant ${t.tenant_id}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] leadership-insight-generator error: ${toErrorMessage(err)}`);
        }
      },
    },
    {
      name: 'leadership-alert-check',
      cron: '0 */8 * * *',
      description: 'Check for conditions requiring executive alerts',
      handler: async () => {
        logger.info('[Job] leadership-alert-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS unack FROM "${schema}".proactive_leadership_alerts
                 WHERE acknowledged = false AND deleted_at IS NULL`,
              );
              const unack = result.rows[0]?.unack || 0;
              if (unack > 5) {
                logger.warn(`[Job] leadership-alert-check: tenant ${t.tenant_id} — ${unack} unacknowledged alerts`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] leadership-alert-check error: ${toErrorMessage(err)}`);
        }
      },
    },
  ];
}

