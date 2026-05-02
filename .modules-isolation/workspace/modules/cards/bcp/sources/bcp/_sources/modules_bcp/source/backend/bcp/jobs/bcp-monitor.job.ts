import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { BCP_BUSINESS_THRESHOLDS, BCP_TIMEOUTS } from '../data/bcp-constants';

export async function getBcpJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'bcp-testing-overdue',
      cron: '0 7 * * 1',
      description: `Detect active plans not tested in ${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] bcp-testing-overdue started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS never_tested,
                   COUNT(*) FILTER (WHERE last_tested IS NOT NULL AND last_tested < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')::int AS overdue_tested
                 FROM "${schema}".bcp_plans
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')`,
              );
              const r = result.rows[0] || {};
              if ((r.never_tested || 0) > 0) {
                logger.error(`[Job] bcp-testing-overdue: tenant ${t.tenant_id} — ${r.never_tested} active plans NEVER tested!`);
              }
              if ((r.overdue_tested || 0) > 0) {
                logger.warn(`[Job] bcp-testing-overdue: tenant ${t.tenant_id} — ${r.overdue_tested} plans overdue for testing`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-testing-overdue error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-test-reminder',
      cron: '0 8 * * *',
      description: `Remind about upcoming test deadlines (${BCP_TIMEOUTS.TEST_REMINDER_BEFORE_DAYS} days before)`,
      handler: async () => {
        logger.info('[Job] bcp-test-reminder started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".bcp_plans
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND last_tested IS NOT NULL
                   AND last_tested + INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS - BCP_TIMEOUTS.TEST_REMINDER_BEFORE_DAYS} days' < NOW()
                   AND last_tested + INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days' > NOW()`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.info(`[Job] bcp-test-reminder: tenant ${t.tenant_id} — ${count} plans need testing within ${BCP_TIMEOUTS.TEST_REMINDER_BEFORE_DAYS} days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-test-reminder error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-failed-test-followup',
      cron: '0 9 * * 1',
      description: 'Track plans that failed testing and need re-testing',
      handler: async () => {
        logger.info('[Job] bcp-failed-test-followup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, plan_type,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_since_fail
                 FROM "${schema}".bcp_plans
                 WHERE deleted_at IS NULL AND status = 'failed_test'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] bcp-failed-test-followup: tenant ${t.tenant_id} — ${result.rows.length} plans failed testing, need re-testing`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-failed-test-followup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-stale-draft',
      cron: '0 10 1 * *',
      description: 'Detect draft plans not progressed in 90+ days',
      handler: async () => {
        logger.info('[Job] bcp-stale-draft started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".bcp_plans
                 WHERE deleted_at IS NULL AND status = 'draft'
                   AND updated_at < NOW() - INTERVAL '90 days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] bcp-stale-draft: tenant ${t.tenant_id} — ${count} stale draft plans (90+ days)`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-stale-draft error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-rto-rpo-review',
      cron: '0 6 1 */3 *',
      description: 'Quarterly review — flag plans with no RTO/RPO or outdated values',
      handler: async () => {
        logger.info('[Job] bcp-rto-rpo-review started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS missing_rto_rpo
                 FROM "${schema}".bcp_plans
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND (rto_hours IS NULL OR rpo_hours IS NULL)`,
              );
              const count = result.rows[0]?.missing_rto_rpo || 0;
              if (count > 0) {
                logger.warn(`[Job] bcp-rto-rpo-review: tenant ${t.tenant_id} — ${count} active plans missing RTO/RPO definitions`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-rto-rpo-review error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-readiness-report',
      cron: '0 6 1 * *',
      description: 'Monthly BCP readiness report (coverage, test pass rate, RTO/RPO compliance)',
      handler: async () => {
        logger.info('[Job] bcp-readiness-report started');
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
                   COUNT(*) FILTER (WHERE status = 'active' AND last_tested > NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')::int AS tested,
                   COUNT(*) FILTER (WHERE status = 'failed_test')::int AS failed
                 FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] bcp-readiness-report: tenant ${t.tenant_id} — total=${r.total}, active=${r.active}, tested=${r.tested}, failed=${r.failed}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-readiness-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-auto-retire',
      cron: '0 3 * * 0',
      description: `Auto-retire plans not updated in ${BCP_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] bcp-auto-retire started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".bcp_plans
                 SET status = 'retired', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status NOT IN ('retired', 'archived')
                   AND updated_at < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] bcp-auto-retire: tenant ${t.tenant_id} — ${result.rowCount} plans retired`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-auto-retire error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'bcp-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived plans past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] bcp-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".bcp_plans
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'bcp' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] bcp-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

