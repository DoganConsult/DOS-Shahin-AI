import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { VENDOR_BUSINESS_THRESHOLDS, VENDOR_TIMEOUTS } from '../data/vendor-constants';

export async function getVendorJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'vendor-reassessment-monitor',
      cron: '0 6 * * *',
      description: 'Flag vendors with critical/high risk ratings overdue for reassessment',
      handler: async () => {
        logger.info('[Job] vendor-reassessment-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE risk_rating = 'critical' AND updated_at < NOW() - INTERVAL '90 days')::int AS critical_overdue,
                   COUNT(*) FILTER (WHERE risk_rating = 'high' AND updated_at < NOW() - INTERVAL '180 days')::int AS high_overdue,
                   COUNT(*) FILTER (WHERE risk_rating = 'medium' AND updated_at < NOW() - INTERVAL '365 days')::int AS medium_overdue
                 FROM "${schema}".vendor_vendors
                 WHERE deleted_at IS NULL AND status NOT IN ('terminated', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.critical_overdue || 0) > 0) {
                logger.warn(`[Job] vendor-reassessment-monitor: tenant ${t.tenant_id} — ${r.critical_overdue} critical-risk vendors overdue for 90-day reassessment`);
              }
              if ((r.high_overdue || 0) > 0) {
                logger.warn(`[Job] vendor-reassessment-monitor: tenant ${t.tenant_id} — ${r.high_overdue} high-risk vendors overdue for 180-day reassessment`);
              }
              if ((r.medium_overdue || 0) > 0) {
                logger.info(`[Job] vendor-reassessment-monitor: tenant ${t.tenant_id} — ${r.medium_overdue} medium-risk vendors overdue for annual reassessment`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-reassessment-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'vendor-contract-expiry',
      cron: '0 7 * * *',
      description: `Flag vendor contracts expiring within ${VENDOR_TIMEOUTS.CONTRACT_EXPIRY_REMINDER_DAYS} days (30/60/90-day buckets)`,
      handler: async () => {
        logger.info('[Job] vendor-contract-expiry started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE contract_end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS expiring_30d,
                   COUNT(*) FILTER (WHERE contract_end_date BETWEEN NOW() + INTERVAL '30 days' AND NOW() + INTERVAL '60 days')::int AS expiring_60d,
                   COUNT(*) FILTER (WHERE contract_end_date BETWEEN NOW() + INTERVAL '60 days' AND NOW() + INTERVAL '${VENDOR_TIMEOUTS.CONTRACT_EXPIRY_REMINDER_DAYS} days')::int AS expiring_90d,
                   COUNT(*) FILTER (WHERE contract_end_date < NOW())::int AS already_expired
                 FROM "${schema}".vendor_vendors
                 WHERE deleted_at IS NULL AND status NOT IN ('terminated', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.expiring_30d || 0) > 0) {
                logger.warn(`[Job] vendor-contract-expiry: tenant ${t.tenant_id} — ${r.expiring_30d} contracts expiring within 30 days`);
              }
              if ((r.expiring_60d || 0) > 0) {
                logger.warn(`[Job] vendor-contract-expiry: tenant ${t.tenant_id} — ${r.expiring_60d} contracts expiring within 31-60 days`);
              }
              if ((r.expiring_90d || 0) > 0) {
                logger.info(`[Job] vendor-contract-expiry: tenant ${t.tenant_id} — ${r.expiring_90d} contracts expiring within 61-90 days`);
              }
              if ((r.already_expired || 0) > 0) {
                logger.warn(`[Job] vendor-contract-expiry: tenant ${t.tenant_id} — ${r.already_expired} contracts already expired on active vendors`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-contract-expiry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'vendor-risk-rating-audit',
      cron: '0 5 1 * *',
      description: 'Monthly audit of high-risk and critical vendors — status, contracts, reassessment gap',
      handler: async () => {
        logger.info('[Job] vendor-risk-rating-audit started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total_high_critical,
                   COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                   COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
                   COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
                   COUNT(*) FILTER (WHERE contract_end_date < NOW())::int AS expired_contracts,
                   COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '90 days' AND risk_rating = 'critical')::int AS critical_overdue
                 FROM "${schema}".vendor_vendors
                 WHERE deleted_at IS NULL AND risk_rating IN ('critical', 'high')`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] vendor-risk-rating-audit: tenant ${t.tenant_id} — total=${r.total_high_critical}, active=${r.active}, suspended=${r.suspended}, expired_contracts=${r.expired_contracts}, critical_overdue=${r.critical_overdue}`);
              if ((r.critical_overdue || 0) > 0) {
                logger.warn(`[Job] vendor-risk-rating-audit: tenant ${t.tenant_id} — ${r.critical_overdue} critical vendors not reviewed in 90+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-risk-rating-audit error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'vendor-sla-compliance',
      cron: '0 5 * * *',
      description: 'Check SLA compliance for active vendor engagements',
      handler: async () => {
        logger.info('[Job] vendor-sla-compliance started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS overdue
                 FROM "${schema}".vendor_vendors
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('terminated', 'archived')
                   AND due_date IS NOT NULL
                   AND due_date < NOW()`,
              );
              const overdueCount = result.rows[0]?.overdue || 0;
              if (overdueCount > 0) {
                logger.warn(`[Job] vendor-sla-compliance: tenant ${t.tenant_id} — ${overdueCount} vendor items past SLA due date`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-sla-compliance error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'vendor-suspended-review',
      cron: '0 9 * * 1',
      description: 'Flag suspended vendors not reviewed or reinstated within 30 days',
      handler: async () => {
        logger.info('[Job] vendor-suspended-review started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, name, risk_rating,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_suspended
                 FROM "${schema}".vendor_vendors
                 WHERE deleted_at IS NULL AND status = 'suspended'
                   AND updated_at < NOW() - INTERVAL '30 days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] vendor-suspended-review: tenant ${t.tenant_id} — ${result.rows.length} vendors suspended for 30+ days without review`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-suspended-review error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'vendor-stale-detector',
      cron: '0 10 * * 1',
      description: `Auto-archive terminated vendors after ${VENDOR_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] vendor-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".vendor_vendors
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'terminated'
                   AND updated_at < NOW() - INTERVAL '${VENDOR_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] vendor-stale-detector: tenant ${t.tenant_id} — ${result.rowCount} terminated vendors auto-archived`);
              }
              const staleResult = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".vendor_vendors
                 WHERE deleted_at IS NULL AND status = 'prospect'
                   AND created_at < NOW() - INTERVAL '${VENDOR_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const staleCount = staleResult.rows[0]?.count || 0;
              if (staleCount > 0) {
                logger.warn(`[Job] vendor-stale-detector: tenant ${t.tenant_id} — ${staleCount} prospect vendors stale for ${VENDOR_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'vendor-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention for vendor module — soft-delete archived vendors respecting legal holds',
      handler: async () => {
        logger.info('[Job] vendor-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".vendor_vendors
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'vendor' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] vendor-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

