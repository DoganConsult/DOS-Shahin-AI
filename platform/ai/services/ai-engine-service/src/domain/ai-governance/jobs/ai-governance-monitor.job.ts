// @ts-nocheck
import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getAiGovernanceJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'ai-governance-sla-monitor',
      cron: '0 */4 * * *',
      description: 'Monitor AI model drift and policy compliance',
      handler: async () => {
        logger.info('[Job] ai-governance-sla-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueResult = await safeQuery(
                `SELECT COUNT(*)::int as count FROM "${schema}".ai_governance_model_registrys
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived', 'completed')
                   AND due_date < NOW()`,
              );
              const overdueCount = overdueResult.rows[0]?.count || 0;
              if (overdueCount > 0) {
                logger.warn(`[Job] ai-governance-sla-monitor: tenant ${t.tenant_id} -- ${overdueCount} overdue items`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] ai-governance-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'ai-governance-stale-detector',
      cron: '0 10 * * 1',
      description: 'Detect stale ai-governance items not updated in 90+ days',
      handler: async () => {
        logger.info('[Job] ai-governance-stale-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".ai_governance_model_registrys
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived')
                   AND updated_at < NOW() - INTERVAL '365 days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] ai-governance-stale-detector: tenant ${t.tenant_id} -- ${result.rowCount} items auto-archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] ai-governance-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'ai-governance-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy for ai-governance module',
      handler: async () => {
        logger.info('[Job] ai-governance-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".ai_governance_model_registrys
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id AND lh.entity_type = 'ai-governance' AND lh.active = true
                   )`,
              );
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] ai-governance-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

