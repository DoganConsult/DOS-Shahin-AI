import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { PRIVACY_BUSINESS_THRESHOLDS, PRIVACY_TIMEOUTS } from '../data/privacy-constants';

export async function getPrivacyJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'privacy-dsr-sla-monitor',
      cron: '0 */4 * * *',
      description: `Monitor DSR SLA deadlines — flag requests approaching ${PRIVACY_TIMEOUTS.DSR_RESPONSE_DAYS}-day limit`,
      handler: async () => {
        logger.info('[Job] privacy-dsr-sla-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE due_date < NOW())::int AS overdue,
                   COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '${PRIVACY_BUSINESS_THRESHOLDS.DSR_OVERDUE_WARNING_DAYS} days')::int AS approaching
                 FROM "${schema}".privacy_dsrs
                 WHERE deleted_at IS NULL AND status NOT IN ('completed', 'closed', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.overdue || 0) > 0) {
                logger.error(`[Job] privacy-dsr-sla-monitor: tenant ${t.tenant_id} — ${r.overdue} DSRs overdue!`);
              }
              if ((r.approaching || 0) > 0) {
                logger.warn(`[Job] privacy-dsr-sla-monitor: tenant ${t.tenant_id} — ${r.approaching} DSRs approaching deadline`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-dsr-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-breach-notification-monitor',
      cron: '0 */2 * * *',
      description: `Monitor breach notification deadlines — ${PRIVACY_TIMEOUTS.BREACH_NOTIFICATION_HOURS}h regulatory requirement`,
      handler: async () => {
        logger.info('[Job] privacy-breach-notification-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, severity, detected_at,
                   EXTRACT(HOUR FROM NOW() - detected_at)::int AS hours_since_detection
                 FROM "${schema}".privacy_breach_records
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'resolved')
                   AND regulator_notified_at IS NULL
                   AND detected_at < NOW() - INTERVAL '${PRIVACY_BUSINESS_THRESHOLDS.BREACH_ESCALATION_HOURS} hours'`,
              );
              for (const row of result.rows) {
                logger.error(`[Job] privacy-breach-notification-monitor: tenant ${t.tenant_id} — breach "${row.title}" (${row.severity}) NOT notified after ${row.hours_since_detection}h`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-breach-notification-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-consent-expiry',
      cron: '0 6 * * *',
      description: `Flag consents expiring within ${PRIVACY_BUSINESS_THRESHOLDS.CONSENT_EXPIRY_WARNING_DAYS} days`,
      handler: async () => {
        logger.info('[Job] privacy-consent-expiry started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count FROM "${schema}".privacy_consent_records
                 WHERE revoked = false AND expires_at IS NOT NULL
                   AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '${PRIVACY_BUSINESS_THRESHOLDS.CONSENT_EXPIRY_WARNING_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] privacy-consent-expiry: tenant ${t.tenant_id} — ${count} consents expiring within ${PRIVACY_BUSINESS_THRESHOLDS.CONSENT_EXPIRY_WARNING_DAYS} days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-consent-expiry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-expired-consent-cleanup',
      cron: '0 3 * * *',
      description: 'Auto-revoke expired consents',
      handler: async () => {
        logger.info('[Job] privacy-expired-consent-cleanup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".privacy_consent_records
                 SET revoked = true, updated_at = NOW()
                 WHERE revoked = false AND expires_at IS NOT NULL AND expires_at < NOW()`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] privacy-expired-consent-cleanup: tenant ${t.tenant_id} — ${result.rowCount} expired consents auto-revoked`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-expired-consent-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-pia-review-reminder',
      cron: '0 8 * * 1',
      description: `Remind about PIAs due for periodic review (${PRIVACY_BUSINESS_THRESHOLDS.PIA_REVIEW_INTERVAL_DAYS}-day cycle)`,
      handler: async () => {
        logger.info('[Job] privacy-pia-review-reminder started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, risk_level,
                   EXTRACT(DAY FROM NOW() - last_reviewed_at)::int AS days_since_review
                 FROM "${schema}".privacy_pias
                 WHERE deleted_at IS NULL AND status = 'approved'
                   AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '${PRIVACY_BUSINESS_THRESHOLDS.PIA_REVIEW_INTERVAL_DAYS} days')`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] privacy-pia-review-reminder: tenant ${t.tenant_id} — ${result.rows.length} PIAs due for review`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-pia-review-reminder error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-data-map-freshness',
      cron: '0 7 1 * *',
      description: 'Check data mapping freshness — flag stale data maps',
      handler: async () => {
        logger.info('[Job] privacy-data-map-freshness started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count FROM "${schema}".privacy_data_maps
                 WHERE deleted_at IS NULL
                   AND updated_at < NOW() - INTERVAL '180 days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] privacy-data-map-freshness: tenant ${t.tenant_id} — ${count} data maps not updated in 180+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-data-map-freshness error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-stale-dsr-archiver',
      cron: '0 2 * * 0',
      description: `Auto-archive completed DSRs older than ${PRIVACY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] privacy-stale-dsr-archiver started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".privacy_dsrs
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('completed', 'closed')
                   AND updated_at < NOW() - INTERVAL '${PRIVACY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] privacy-stale-dsr-archiver: tenant ${t.tenant_id} — ${result.rowCount} DSRs auto-archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-stale-dsr-archiver error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'privacy-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived DSRs past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] privacy-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".privacy_dsrs
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = dsr_id::text AND lh.entity_type = 'privacy' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] privacy-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

