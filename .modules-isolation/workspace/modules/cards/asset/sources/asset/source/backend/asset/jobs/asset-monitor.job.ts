import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { ASSET_BUSINESS_THRESHOLDS as _ASSET_BUSINESS_THRESHOLDS, ASSET_TIMEOUTS } from '../data/asset-constants';

export async function getAssetJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'asset-unclassified-monitor',
      cron: '0 7 * * *',
      description: 'Flag assets without classification or criticality assignment',
      handler: async () => {
        logger.info('[Job] asset-unclassified-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE classification IS NULL OR classification = '')::int AS unclassified,
                   COUNT(*) FILTER (WHERE criticality IS NULL OR criticality = '')::int AS no_criticality,
                   COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS no_owner
                 FROM "${schema}".asset_assets
                 WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.unclassified || 0) > 0) {
                logger.warn(`[Job] asset-unclassified-monitor: tenant ${t.tenant_id} — ${r.unclassified} assets unclassified`);
              }
              if ((r.no_owner || 0) > 0) {
                logger.warn(`[Job] asset-unclassified-monitor: tenant ${t.tenant_id} — ${r.no_owner} assets without owner`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-unclassified-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-review-overdue',
      cron: '0 8 * * 1',
      description: `Flag active assets not reviewed in ${ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] asset-review-overdue started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".asset_assets
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND updated_at < NOW() - INTERVAL '${ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] asset-review-overdue: tenant ${t.tenant_id} — ${count} assets overdue for review`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-review-overdue error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-decommission-check',
      cron: '0 9 * * *',
      description: 'Flag assets in decommissioning status for extended periods',
      handler: async () => {
        logger.info('[Job] asset-decommission-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, asset_type,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_in_decommission
                 FROM "${schema}".asset_assets
                 WHERE deleted_at IS NULL AND status = 'decommissioning'
                   AND updated_at < NOW() - INTERVAL '30 days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] asset-decommission-check: tenant ${t.tenant_id} — ${result.rows.length} assets stuck in decommissioning 30+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-decommission-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-critical-audit',
      cron: '0 6 1 * *',
      description: 'Monthly audit of critical assets — ownership, classification, linked risks/controls',
      handler: async () => {
        logger.info('[Job] asset-critical-audit started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total_critical,
                   COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS no_owner,
                   COUNT(*) FILTER (WHERE classification IS NULL OR classification = '')::int AS no_classification
                 FROM "${schema}".asset_assets
                 WHERE deleted_at IS NULL AND criticality = 'critical' AND status = 'active'`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] asset-critical-audit: tenant ${t.tenant_id} — critical=${r.total_critical}, no_owner=${r.no_owner}, no_class=${r.no_classification}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-critical-audit error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-inventory-report',
      cron: '0 6 1 * *',
      description: 'Monthly inventory report (type distribution, environment coverage)',
      handler: async () => {
        logger.info('[Job] asset-inventory-report started');
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
                   COUNT(*) FILTER (WHERE status = 'discovered')::int AS discovered,
                   COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
                   COUNT(DISTINCT asset_type)::int AS type_count
                 FROM "${schema}".asset_assets WHERE deleted_at IS NULL`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] asset-inventory-report: tenant ${t.tenant_id} — total=${r.total}, active=${r.active}, discovered=${r.discovered}, types=${r.type_count}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-inventory-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-stale-discovered',
      cron: '0 10 * * 1',
      description: 'Flag discovered assets not registered in 30+ days',
      handler: async () => {
        logger.info('[Job] asset-stale-discovered started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".asset_assets
                 WHERE deleted_at IS NULL AND status = 'discovered'
                   AND created_at < NOW() - INTERVAL '30 days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] asset-stale-discovered: tenant ${t.tenant_id} — ${count} discovered assets not registered in 30+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-stale-discovered error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive disposed assets after ${ASSET_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] asset-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".asset_assets
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'disposed'
                   AND updated_at < NOW() - INTERVAL '${ASSET_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] asset-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} assets archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'asset-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived assets past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] asset-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".asset_assets
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'asset' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] asset-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

