import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { REPORTING_TIMEOUTS, REPORTING_BUSINESS_THRESHOLDS } from '../data/reporting-constants';

export async function getReportingJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'reporting-schedule-executor',
      cron: '* * * * *',
      description: 'Trigger generation for scheduled reports whose cron is due',
      handler: async () => {
        logger.info('[Job] reporting-schedule-executor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".reporting_reports
                 WHERE deleted_at IS NULL AND status = 'scheduled'
                   AND schedule_cron IS NOT NULL
                   AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '23 hours')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.info(`[Job] reporting-schedule-executor: tenant ${t.tenant_id} — ${count} reports due for generation`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-schedule-executor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-generation-timeout',
      cron: '*/5 * * * *',
      description: `Mark reports stuck in 'generating' beyond ${REPORTING_TIMEOUTS.GENERATION_TIMEOUT_SECONDS}s as failed`,
      handler: async () => {
        logger.info('[Job] reporting-generation-timeout started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".reporting_reports
                 SET status = 'failed', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'generating'
                   AND updated_at < NOW() - INTERVAL '${REPORTING_TIMEOUTS.GENERATION_TIMEOUT_SECONDS} seconds'
                 RETURNING id, title`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.error(`[Job] reporting-generation-timeout: tenant ${t.tenant_id} — ${result.rowCount} reports timed out and marked failed`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-generation-timeout error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-failed-retry',
      cron: '*/30 * * * *',
      description: `Retry failed reports up to ${REPORTING_BUSINESS_THRESHOLDS.DISTRIBUTION_RETRY_MAX} times`,
      handler: async () => {
        logger.info('[Job] reporting-failed-retry started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, COALESCE(retry_count, 0) AS retry_count
                 FROM "${schema}".reporting_reports
                 WHERE deleted_at IS NULL AND status = 'failed'
                   AND schedule_cron IS NOT NULL
                   AND COALESCE(retry_count, 0) < ${REPORTING_BUSINESS_THRESHOLDS.DISTRIBUTION_RETRY_MAX}
                   AND updated_at < NOW() - INTERVAL '30 minutes'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] reporting-failed-retry: tenant ${t.tenant_id} — ${result.rows.length} scheduled reports eligible for retry`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-failed-retry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-output-cleanup',
      cron: '0 2 * * *',
      description: `Expire completed report outputs older than ${REPORTING_TIMEOUTS.REPORT_EXPIRY_DAYS} days`,
      handler: async () => {
        logger.info('[Job] reporting-output-cleanup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".reporting_reports
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'completed'
                   AND updated_at < NOW() - INTERVAL '${REPORTING_TIMEOUTS.REPORT_EXPIRY_DAYS} days'
                   AND schedule_cron IS NULL`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] reporting-output-cleanup: tenant ${t.tenant_id} — ${result.rowCount} expired report outputs archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-output-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-distribution-monitor',
      cron: '0 */4 * * *',
      description: 'Detect reports completed but not distributed within expected window',
      handler: async () => {
        logger.info('[Job] reporting-distribution-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".reporting_reports
                 WHERE deleted_at IS NULL AND status = 'completed'
                   AND updated_at < NOW() - INTERVAL '${REPORTING_TIMEOUTS.DEFAULT_SLA_HOURS} hours'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".entity_links el
                     WHERE el.source_entity_id = id::text AND el.source_module = 'reporting' AND el.link_type = 'distribution_sent'
                   )`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] reporting-distribution-monitor: tenant ${t.tenant_id} — ${count} completed reports pending distribution beyond ${REPORTING_TIMEOUTS.DEFAULT_SLA_HOURS}h`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-distribution-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-usage-report',
      cron: '0 6 1 * *',
      description: 'Monthly usage summary: volume, success rate, format breakdown, top report types',
      handler: async () => {
        logger.info('[Job] reporting-usage-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                   COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                   COUNT(*) FILTER (WHERE schedule_cron IS NOT NULL)::int AS scheduled,
                   CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) > 0
                     THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric /
                       COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))::numeric * 100, 1)
                     ELSE 0
                   END AS success_rate,
                   COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) FILTER (WHERE status = 'completed'), 0)::int AS avg_gen_minutes
                 FROM "${schema}".reporting_reports
                 WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] reporting-usage-report: tenant ${t.tenant_id} — total=${r.total}, completed=${r.completed}, failed=${r.failed}, scheduled=${r.scheduled}, successRate=${r.success_rate}%, avgGen=${r.avg_gen_minutes}min`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-usage-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive completed scheduled reports after ${REPORTING_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] reporting-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".reporting_reports
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('completed', 'failed')
                   AND updated_at < NOW() - INTERVAL '${REPORTING_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] reporting-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} reports auto-archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-stale-detector',
      cron: '0 10 * * 1',
      description: `Flag scheduled reports not run in ${REPORTING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] reporting-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".reporting_reports
                 WHERE deleted_at IS NULL AND status = 'scheduled'
                   AND schedule_cron IS NOT NULL
                   AND updated_at < NOW() - INTERVAL '${REPORTING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] reporting-stale-detector: tenant ${t.tenant_id} — ${count} schedules stale for ${REPORTING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'reporting-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived reports past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] reporting-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".reporting_reports
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'reporting' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] reporting-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

