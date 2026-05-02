import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { RECORDS_BUSINESS_THRESHOLDS, RECORDS_TIMEOUTS } from '../data/records-constants';

export async function getRecordsJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'records-retention-monitor',
      cron: '0 1 * * *',
      description: `Flag records approaching retention expiry within ${RECORDS_BUSINESS_THRESHOLDS.RETENTION_WARNING_DAYS} days`,
      handler: async () => {
        logger.info('[Job] records-retention-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count FROM "${schema}".records_records
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('disposed', 'archived')
                   AND disposal_date IS NOT NULL
                   AND disposal_date BETWEEN NOW() AND NOW() + INTERVAL '${RECORDS_BUSINESS_THRESHOLDS.RETENTION_WARNING_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] records-retention-monitor: tenant ${t.tenant_id} — ${count} records approaching retention expiry`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-retention-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-overdue-disposal',
      cron: '0 2 * * *',
      description: 'Detect records past disposal date that have not been disposed',
      handler: async () => {
        logger.info('[Job] records-overdue-disposal started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, record_type, classification,
                   EXTRACT(DAY FROM NOW() - disposal_date)::int AS days_overdue
                 FROM "${schema}".records_records
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('disposed', 'archived')
                   AND disposal_date IS NOT NULL AND disposal_date < NOW()
                   AND legal_hold = false
                 ORDER BY disposal_date ASC LIMIT 100`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] records-overdue-disposal: tenant ${t.tenant_id} — ${result.rows.length} records overdue for disposal`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-overdue-disposal error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-legal-hold-review',
      cron: '0 9 * * 1',
      description: `Review legal holds older than ${RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS} days`,
      handler: async () => {
        logger.info('[Job] records-legal-hold-review started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, record_type, classification,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_on_hold
                 FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND legal_hold = true
                   AND updated_at < NOW() - INTERVAL '${RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS} days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] records-legal-hold-review: tenant ${t.tenant_id} — ${result.rows.length} records on legal hold for ${RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS}+ days need review`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-legal-hold-review error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-classification-audit',
      cron: '0 6 1 * *',
      description: 'Audit records with missing or invalid classification',
      handler: async () => {
        logger.info('[Job] records-classification-audit started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
                   AND (classification IS NULL OR classification = '')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] records-classification-audit: tenant ${t.tenant_id} — ${count} records missing classification`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-classification-audit error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-no-retention-policy',
      cron: '0 7 * * 1',
      description: 'Flag active records without a retention policy',
      handler: async () => {
        logger.info('[Job] records-no-retention-policy started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
                   AND retention_period IS NULL`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] records-no-retention-policy: tenant ${t.tenant_id} — ${count} active records without retention policy`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-no-retention-policy error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-stale-review',
      cron: '0 8 * * *',
      description: `Detect records stuck in review for ${RECORDS_TIMEOUTS.REVIEW_TIMEOUT_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] records-stale-review started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, record_type,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_in_review
                 FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND status = 'review'
                   AND updated_at < NOW() - INTERVAL '${RECORDS_TIMEOUTS.REVIEW_TIMEOUT_DAYS} days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] records-stale-review: tenant ${t.tenant_id} — ${result.rows.length} records stuck in review`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-stale-review error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive disposed records after ${RECORDS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] records-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".records_records
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status IN ('disposed')
                   AND updated_at < NOW() - INTERVAL '${RECORDS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] records-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} disposed records archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'records-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived records past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] records-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".records_records
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND legal_hold = false
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'records' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] records-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

