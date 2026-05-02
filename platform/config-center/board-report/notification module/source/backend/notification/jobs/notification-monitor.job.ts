import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { NOTIFICATION_BUSINESS_THRESHOLDS, NOTIFICATION_TIMEOUTS } from '../data/notification-constants';

export async function getNotificationJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'notification-delivery-monitor',
      cron: '*/15 * * * *',
      description: `Monitor delivery rates — alert if below ${NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_WARNING}%`,
      handler: async () => {
        logger.info('[Job] notification-delivery-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                   COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::int AS delivered
                 FROM "${schema}".notification_notifications
                 WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '1 hour'`,
              );
              const r = result.rows[0] || {};
              const total = r.total || 0;
              if (total > 10) {
                const deliveryRate = ((r.delivered || 0) / total) * 100;
                if (deliveryRate < NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_CRITICAL) {
                  logger.error(`[Job] notification-delivery-monitor: tenant ${t.tenant_id} — delivery rate ${deliveryRate.toFixed(1)}% (CRITICAL, ${r.failed} failed)`);
                } else if (deliveryRate < NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_WARNING) {
                  logger.warn(`[Job] notification-delivery-monitor: tenant ${t.tenant_id} — delivery rate ${deliveryRate.toFixed(1)}% (warning)`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-delivery-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-stuck-pending',
      cron: '*/5 * * * *',
      description: `Flag notifications stuck in pending for ${NOTIFICATION_TIMEOUTS.DELIVERY_TIMEOUT_SECONDS}+ seconds`,
      handler: async () => {
        logger.info('[Job] notification-stuck-pending started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".notification_notifications
                 WHERE deleted_at IS NULL AND status = 'pending'
                   AND created_at < NOW() - INTERVAL '${NOTIFICATION_TIMEOUTS.DELIVERY_TIMEOUT_SECONDS} seconds'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] notification-stuck-pending: tenant ${t.tenant_id} — ${count} notifications stuck in pending`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-stuck-pending error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-failed-retry',
      cron: '*/10 * * * *',
      description: 'Retry failed notifications that have not exhausted retries',
      handler: async () => {
        logger.info('[Job] notification-failed-retry started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".notification_notifications
                 WHERE deleted_at IS NULL AND status = 'failed'
                   AND COALESCE((metadata->>'retry_count')::int, 0) < 3
                   AND created_at > NOW() - INTERVAL '24 hours'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.info(`[Job] notification-failed-retry: tenant ${t.tenant_id} — ${count} failed notifications eligible for retry`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-failed-retry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-digest-compiler',
      cron: '0 * * * *',
      description: `Compile hourly digest for users with digest preference (every ${NOTIFICATION_TIMEOUTS.DIGEST_INTERVAL_MINUTES}min)`,
      handler: async () => {
        logger.info('[Job] notification-digest-compiler started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT recipient_id, COUNT(*)::int AS unread_count
                 FROM "${schema}".notification_notifications
                 WHERE deleted_at IS NULL AND status IN ('delivered', 'sent')
                   AND read_at IS NULL
                   AND created_at > NOW() - INTERVAL '${NOTIFICATION_TIMEOUTS.DIGEST_INTERVAL_MINUTES} minutes'
                 GROUP BY recipient_id HAVING COUNT(*) >= 3`,
              );
              if (result.rows.length > 0) {
                logger.info(`[Job] notification-digest-compiler: tenant ${t.tenant_id} — ${result.rows.length} users eligible for digest`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-digest-compiler error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-channel-health',
      cron: '0 */6 * * *',
      description: 'Check health of configured notification channels',
      handler: async () => {
        logger.info('[Job] notification-channel-health started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT channel,
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
                 FROM "${schema}".notification_notifications
                 WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '6 hours'
                 GROUP BY channel`,
              );
              for (const row of result.rows) {
                const failRate = row.total > 0 ? (row.failed / row.total) * 100 : 0;
                if (failRate > NOTIFICATION_BUSINESS_THRESHOLDS.BOUNCE_RATE_WARNING) {
                  logger.warn(`[Job] notification-channel-health: tenant ${t.tenant_id} — channel ${row.channel} has ${failRate.toFixed(1)}% failure rate`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-channel-health error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-read-cleanup',
      cron: '0 2 * * *',
      description: 'Mark old read/delivered in-app notifications as archived',
      handler: async () => {
        logger.info('[Job] notification-read-cleanup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".notification_notifications
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'read'
                   AND channel = 'in_app'
                   AND updated_at < NOW() - INTERVAL '${NOTIFICATION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] notification-read-cleanup: tenant ${t.tenant_id} — ${result.rowCount} read notifications archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-read-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-volume-report',
      cron: '0 6 * * 1',
      description: 'Weekly notification volume and channel distribution report',
      handler: async () => {
        logger.info('[Job] notification-volume-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT channel, COUNT(*)::int AS count,
                   COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::int AS delivered
                 FROM "${schema}".notification_notifications
                 WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'
                 GROUP BY channel ORDER BY count DESC`,
              );
              for (const row of result.rows) {
                logger.info(`[Job] notification-volume-report: tenant ${t.tenant_id} — ${row.channel}: ${row.count} sent, ${row.delivered} delivered`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-volume-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'notification-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived notifications past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] notification-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".notification_notifications
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '365 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'notification' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] notification-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

