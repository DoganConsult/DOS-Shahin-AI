// @ts-nocheck
import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getAgrcEngineJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');
  return [
    {
      name: 'agrc-engine-stuck-run-detector',
      cron: '*/30 * * * *',
      description: 'Detect AGRC engine runs stuck in running state for >1h',
      handler: async () => {
        logger.info('[Job] agrc-engine-stuck-run-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS stuck FROM "${schema}".agrc_engine_runs WHERE status = 'running' AND started_at < NOW() - INTERVAL '1 hour'`);
              const stuck = result.rows[0]?.stuck || 0;
              if (stuck > 0) logger.warn(`[Job] agrc-engine-stuck-run-detector: tenant ${t.tenant_id} — ${stuck} stuck runs`);
            } catch { }
          }
        } catch (err: unknown) { logger.error(`[Job] agrc-engine-stuck-run-detector error: ${toErrorMessage(err)}`); }
      },
    },
  ];
}

