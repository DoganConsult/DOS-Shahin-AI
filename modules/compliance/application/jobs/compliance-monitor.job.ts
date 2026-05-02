import { logger, toErrorMessage } from '@dos/module-sdk';

interface ComplianceJobDefinition {
  name: string;
  cron: string;
  description: string;
  handler: () => Promise<void>;
}

export async function getComplianceJobs(): Promise<ComplianceJobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/tenancy');

  return [
    {
      name: 'compliance-sla-monitor',
      cron: '0 5 * * *',
      description: 'Detect compliance drift and stale evidence',
      handler: async () => {
        logger.info('[Job] compliance-sla-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueResult = await safeQuery(
                `SELECT COUNT(*)::int as count FROM "${schema}".compliance_obligations
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived', 'completed')
                   AND due_date < NOW()`,
              );
              const overdueCount = overdueResult.rows[0]?.count || 0;
              if (overdueCount > 0) {
                logger.warn(`[Job] compliance-sla-monitor: tenant ${t.tenant_id} -- ${overdueCount} overdue items`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] compliance-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'compliance-stale-detector',
      cron: '0 10 * * 1',
      description: 'Detect stale compliance items not updated in 90+ days',
      handler: async () => {
        logger.info('[Job] compliance-stale-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".compliance_obligations
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived')
                   AND updated_at < NOW() - INTERVAL '365 days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] compliance-stale-detector: tenant ${t.tenant_id} -- ${result.rowCount} items auto-archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] compliance-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'compliance-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy for compliance module',
      handler: async () => {
        logger.info('[Job] compliance-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".compliance_obligations
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id AND lh.entity_type = 'compliance' AND lh.active = true
                   )`,
              );
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] compliance-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}
