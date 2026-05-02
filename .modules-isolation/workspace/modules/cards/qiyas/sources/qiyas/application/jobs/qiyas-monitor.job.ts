import { JobDefinition } from '../../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { QIYAS_BUSINESS_THRESHOLDS, QIYAS_TIMEOUTS } from '../data/qiyas-constants';

export async function getQiyasJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'qiyas-maturity-score-monitor',
      cron: '0 1 * * *',
      description: `Flag assessments with maturity score below ${QIYAS_BUSINESS_THRESHOLDS.IMPROVEMENT_THRESHOLD_SCORE}`,
      handler: async () => {
        logger.info('[Job] qiyas-maturity-score-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, model_code, scope, overall_score
                 FROM "${schema}".qiyas_assessments
                 WHERE deleted_at IS NULL AND overall_score IS NOT NULL
                   AND overall_score < ${QIYAS_BUSINESS_THRESHOLDS.IMPROVEMENT_THRESHOLD_SCORE}
                   AND status IN ('completed', 'published')`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] qiyas-maturity-score-monitor: tenant ${t.tenant_id} — ${result.rows.length} assessments below threshold (score < ${QIYAS_BUSINESS_THRESHOLDS.IMPROVEMENT_THRESHOLD_SCORE})`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-maturity-score-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'qiyas-stale-assessment-detector',
      cron: '0 9 * * 1',
      description: `Detect assessments stuck in draft/in_progress for ${QIYAS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] qiyas-stale-assessment-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, model_code, scope, status,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_stale
                 FROM "${schema}".qiyas_assessments
                 WHERE deleted_at IS NULL AND status IN ('draft', 'in_progress')
                   AND updated_at < NOW() - INTERVAL '90 days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] qiyas-stale-assessment-detector: tenant ${t.tenant_id} — ${result.rows.length} stale assessments`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-stale-assessment-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'qiyas-response-rate-monitor',
      cron: '0 10 * * 1',
      description: `Alert on assessments with response rate below ${QIYAS_BUSINESS_THRESHOLDS.MIN_RESPONSE_RATE}%`,
      handler: async () => {
        logger.info('[Job] qiyas-response-rate-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT model_code,
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE overall_score IS NOT NULL)::int AS responded,
                   CASE WHEN COUNT(*) > 0
                     THEN ROUND(COUNT(*) FILTER (WHERE overall_score IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
                     ELSE 0
                   END AS rate
                 FROM "${schema}".qiyas_assessments
                 WHERE deleted_at IS NULL AND status IN ('in_progress', 'completed')
                 GROUP BY model_code
                 HAVING CASE WHEN COUNT(*) > 0
                   THEN ROUND(COUNT(*) FILTER (WHERE overall_score IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
                   ELSE 0 END < ${QIYAS_BUSINESS_THRESHOLDS.MIN_RESPONSE_RATE}`,
              );
              for (const row of result.rows) {
                logger.warn(`[Job] qiyas-response-rate-monitor: tenant ${t.tenant_id} — model ${row.model_code} has ${row.rate}% response rate (${row.responded}/${row.total})`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-response-rate-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'qiyas-assessment-timeout',
      cron: '0 8 * * *',
      description: `Flag in-progress assessments exceeding ${QIYAS_TIMEOUTS.ASSESSMENT_TIMEOUT_HOURS}h timeout`,
      handler: async () => {
        logger.info('[Job] qiyas-assessment-timeout started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, model_code, scope,
                   EXTRACT(HOUR FROM NOW() - updated_at)::int AS hours_elapsed
                 FROM "${schema}".qiyas_assessments
                 WHERE deleted_at IS NULL AND status = 'in_progress'
                   AND updated_at < NOW() - INTERVAL '${QIYAS_TIMEOUTS.ASSESSMENT_TIMEOUT_HOURS} hours'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] qiyas-assessment-timeout: tenant ${t.tenant_id} — ${result.rows.length} assessments past timeout`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-assessment-timeout error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'qiyas-trend-snapshot',
      cron: '0 0 1 * *',
      description: 'Capture monthly maturity trend snapshot for benchmarking',
      handler: async () => {
        logger.info('[Job] qiyas-trend-snapshot started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   model_code,
                   COALESCE(AVG(overall_score), 0)::numeric(5,2) AS avg_score,
                   COUNT(*)::int AS assessment_count
                 FROM "${schema}".qiyas_assessments
                 WHERE deleted_at IS NULL AND overall_score IS NOT NULL
                   AND status IN ('completed', 'published')
                 GROUP BY model_code`,
              );
              for (const row of result.rows) {
                logger.info(`[Job] qiyas-trend-snapshot: tenant ${t.tenant_id} — model ${row.model_code}: avg=${row.avg_score}, count=${row.assessment_count}`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-trend-snapshot error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'qiyas-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive old completed assessments after ${QIYAS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] qiyas-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".qiyas_assessments
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('completed', 'reviewed')
                   AND updated_at < NOW() - INTERVAL '${QIYAS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] qiyas-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} assessments archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'qiyas-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived assessments past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] qiyas-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".qiyas_assessments
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'qiyas' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] qiyas-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

