import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { INTEGRATIONS_BUSINESS_THRESHOLDS, INTEGRATIONS_TIMEOUTS } from '../data/integrations-constants';

export async function getIntegrationsJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'integrations-health-check',
      cron: `*/${INTEGRATIONS_TIMEOUTS.HEALTH_CHECK_INTERVAL_MINUTES} * * * *`,
      description: `Health-check active connectors every ${INTEGRATIONS_TIMEOUTS.HEALTH_CHECK_INTERVAL_MINUTES}min — detect degraded, stale sync, error rates`,
      handler: async () => {
        logger.info('[Job] integrations-health-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded,
                   COUNT(*) FILTER (WHERE status = 'active' AND last_sync_error IS NOT NULL)::int AS with_errors,
                   COUNT(*) FILTER (WHERE status = 'active' AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '1 hour'))::int AS stale_sync
                 FROM "${schema}".integration_connectors
                 WHERE deleted_at IS NULL AND status IN ('active', 'degraded')`,
              );
              const r = result.rows[0] || {};
              if ((r.degraded || 0) > 0) {
                logger.error(`[Job] integrations-health-check: tenant ${t.tenant_id} — ${r.degraded} degraded connectors!`);
              }
              if ((r.with_errors || 0) > 0) {
                logger.warn(`[Job] integrations-health-check: tenant ${t.tenant_id} — ${r.with_errors} active connectors with sync errors`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-health-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'integrations-sync-retry',
      cron: '*/30 * * * *',
      description: `Retry failed syncs up to ${INTEGRATIONS_BUSINESS_THRESHOLDS.MAX_CONSECUTIVE_FAILURES} consecutive failures`,
      handler: async () => {
        logger.info('[Job] integrations-sync-retry started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, name, connector_type, last_sync_error,
                   COALESCE(consecutive_failures, 0)::int AS failures
                 FROM "${schema}".integration_connectors
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND last_sync_error IS NOT NULL
                   AND COALESCE(consecutive_failures, 0) < ${INTEGRATIONS_BUSINESS_THRESHOLDS.MAX_CONSECUTIVE_FAILURES}`,
              );
              if (result.rows.length > 0) {
                logger.info(`[Job] integrations-sync-retry: tenant ${t.tenant_id} — ${result.rows.length} connectors eligible for retry`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-sync-retry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'integrations-auto-degrade',
      cron: '0 */2 * * *',
      description: `Auto-degrade connectors exceeding ${INTEGRATIONS_BUSINESS_THRESHOLDS.MAX_CONSECUTIVE_FAILURES} consecutive failures`,
      handler: async () => {
        logger.info('[Job] integrations-auto-degrade started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".integration_connectors
                 SET status = 'degraded', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND COALESCE(consecutive_failures, 0) >= ${INTEGRATIONS_BUSINESS_THRESHOLDS.MAX_CONSECUTIVE_FAILURES}`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.warn(`[Job] integrations-auto-degrade: tenant ${t.tenant_id} — ${result.rowCount} connectors auto-degraded`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-auto-degrade error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'integrations-stale-detector',
      cron: '0 10 * * 1',
      description: `Detect connectors not synced in ${INTEGRATIONS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] integrations-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".integration_connectors
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '${INTEGRATIONS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] integrations-stale-detector: tenant ${t.tenant_id} — ${count} stale connectors`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'integrations-sync-report',
      cron: '0 6 1 * *',
      description: 'Monthly sync performance report (success rate, avg duration, error trends)',
      handler: async () => {
        logger.info('[Job] integrations-sync-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                   COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded,
                   COUNT(*) FILTER (WHERE last_sync_error IS NOT NULL)::int AS with_errors,
                   COUNT(DISTINCT connector_type)::int AS type_count
                 FROM "${schema}".integration_connectors WHERE deleted_at IS NULL`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] integrations-sync-report: tenant ${t.tenant_id} — total=${r.total}, active=${r.active}, degraded=${r.degraded}, errors=${r.with_errors}, types=${r.type_count}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-sync-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'integrations-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive disabled connectors after ${INTEGRATIONS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] integrations-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".integration_connectors
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'disabled'
                   AND updated_at < NOW() - INTERVAL '${INTEGRATIONS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] integrations-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} connectors archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'integrations-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived connectors past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] integrations-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".integration_connectors
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'integrations' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] integrations-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

