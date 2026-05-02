import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getKsaRegulatoryJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'ksa-regulatory-change-scanner',
      cron: '0 6 * * *',
      description: 'Scan for new KSA regulatory changes and flag pending impact assessments',
      handler: async () => {
        logger.info('[Job] ksa-regulatory-change-scanner started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS pending FROM "${schema}".regulatory_changes
                 WHERE deleted_at IS NULL AND impact_assessment IS NULL
                   AND effective_date > NOW()`,
              );
              const pending = result.rows[0]?.pending || 0;
              if (pending > 0) {
                logger.warn(`[Job] ksa-regulatory-change-scanner: tenant ${t.tenant_id} — ${pending} changes awaiting impact assessment`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] ksa-regulatory-change-scanner error: ${toErrorMessage(err)}`);
        }
      },
    },
    {
      name: 'ksa-obligation-overdue-check',
      cron: '0 8 * * *',
      description: 'Detect overdue KSA regulatory obligations',
      handler: async () => {
        logger.info('[Job] ksa-obligation-overdue-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS overdue FROM "${schema}".obligations
                 WHERE deleted_at IS NULL AND due_date < NOW()
                   AND status NOT IN ('compliant', 'waived', 'archived')`,
              );
              const overdue = result.rows[0]?.overdue || 0;
              if (overdue > 0) {
                logger.warn(`[Job] ksa-obligation-overdue-check: tenant ${t.tenant_id} — ${overdue} overdue obligations`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] ksa-obligation-overdue-check error: ${toErrorMessage(err)}`);
        }
      },
    },
    {
      name: 'ksa-maturity-snapshot',
      cron: '0 2 1 * *',
      description: 'Monthly sector maturity snapshot for trend analysis',
      handler: async () => {
        logger.info('[Job] ksa-maturity-snapshot started');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const maturitySvc = await import('../services/ksa-sector-maturity.service.js');
              await maturitySvc.assessMaturity(t.tenant_id);
              logger.info(`[Job] ksa-maturity-snapshot: tenant ${t.tenant_id} — snapshot recorded`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] ksa-maturity-snapshot error: ${toErrorMessage(err)}`);
        }
      },
    },
  ];
}

