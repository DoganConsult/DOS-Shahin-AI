import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { REMEDIATION_BUSINESS_THRESHOLDS, REMEDIATION_TIMEOUTS } from '../data/remediation-constants';

export async function getRemediationJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'remediation-overdue-monitor',
      cron: '0 7 * * *',
      description: 'Detect overdue remediation plans and flag by priority',
      handler: async () => {
        logger.info('[Job] remediation-overdue-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical_overdue,
                   COUNT(*) FILTER (WHERE priority = 'high')::int AS high_overdue,
                   COUNT(*) FILTER (WHERE priority IN ('medium', 'low'))::int AS other_overdue
                 FROM "${schema}".remediation_plans
                 WHERE deleted_at IS NULL
                   AND due_date < NOW()
                   AND status NOT IN ('verified', 'closed', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.critical_overdue || 0) > 0) {
                logger.error(`[Job] remediation-overdue-monitor: tenant ${t.tenant_id} — ${r.critical_overdue} CRITICAL remediation plans overdue!`);
              }
              if ((r.high_overdue || 0) > 0) {
                logger.warn(`[Job] remediation-overdue-monitor: tenant ${t.tenant_id} — ${r.high_overdue} high-priority plans overdue`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-overdue-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-due-soon',
      cron: '0 8 * * *',
      description: `Warn about remediation plans due within ${REMEDIATION_BUSINESS_THRESHOLDS.OVERDUE_WARNING_DAYS} days`,
      handler: async () => {
        logger.info('[Job] remediation-due-soon started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".remediation_plans
                 WHERE deleted_at IS NULL
                   AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${REMEDIATION_BUSINESS_THRESHOLDS.OVERDUE_WARNING_DAYS} days'
                   AND status NOT IN ('verified', 'closed', 'archived')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] remediation-due-soon: tenant ${t.tenant_id} — ${count} plans due within ${REMEDIATION_BUSINESS_THRESHOLDS.OVERDUE_WARNING_DAYS} days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-due-soon error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-verification-stale',
      cron: '0 9 * * *',
      description: `Flag plans stuck in pending_verification for ${REMEDIATION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] remediation-verification-stale started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".remediation_plans
                 WHERE deleted_at IS NULL AND status = 'pending_verification'
                   AND updated_at < NOW() - INTERVAL '${REMEDIATION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] remediation-verification-stale: tenant ${t.tenant_id} — ${count} plans stuck in pending_verification`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-verification-stale error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-failed-recheck',
      cron: '0 10 * * 1',
      description: 'Flag failed verification plans needing re-remediation',
      handler: async () => {
        logger.info('[Job] remediation-failed-recheck started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, priority, assigned_to,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_since_fail
                 FROM "${schema}".remediation_plans
                 WHERE deleted_at IS NULL AND status = 'failed'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] remediation-failed-recheck: tenant ${t.tenant_id} — ${result.rows.length} failed plans need re-remediation`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-failed-recheck error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-stale-detector',
      cron: '0 9 * * 1',
      description: `Detect stale draft/in_progress plans not updated in ${REMEDIATION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] remediation-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".remediation_plans
                 WHERE deleted_at IS NULL AND status IN ('draft', 'in_progress')
                   AND updated_at < NOW() - INTERVAL '${REMEDIATION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] remediation-stale-detector: tenant ${t.tenant_id} — ${count} stale remediation plans`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-effectiveness-report',
      cron: '0 6 1 * *',
      description: 'Monthly remediation effectiveness report (completion rate, avg resolution, verification pass rate)',
      handler: async () => {
        logger.info('[Job] remediation-effectiveness-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status IN ('verified', 'closed'))::int AS resolved,
                   COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                   COALESCE(AVG(EXTRACT(DAY FROM updated_at - created_at)) FILTER (WHERE status IN ('verified', 'closed')), 0)::int AS avg_days
                 FROM "${schema}".remediation_plans
                 WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] remediation-effectiveness-report: tenant ${t.tenant_id} — total=${r.total}, resolved=${r.resolved}, failed=${r.failed}, avg_days=${r.avg_days}`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-effectiveness-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive closed/verified plans after ${REMEDIATION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] remediation-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".remediation_plans
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('verified', 'closed')
                   AND updated_at < NOW() - INTERVAL '${REMEDIATION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] remediation-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} plans archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'remediation-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived plans past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] remediation-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".remediation_plans
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'remediation' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] remediation-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

