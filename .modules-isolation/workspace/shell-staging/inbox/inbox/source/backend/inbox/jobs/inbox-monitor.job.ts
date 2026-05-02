import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { INBOX_SLA_DEFAULTS, INBOX_TIMEOUTS, INBOX_BUSINESS_THRESHOLDS } from '../data/inbox-constants';

export async function getInboxJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'inbox-sla-monitor',

      cron: '*/15 * * * *',
      description: 'Check for SLA breaches, escalate overdue messages, update priority scores',
      handler: async () => {
        logger.info('[Job] inbox-sla-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const breachResult = await safeQuery(
                `SELECT id, priority,
                   EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
                 FROM "${schema}".inbox_messages
                 WHERE deleted_at IS NULL
                   AND status = 'unread'
                   AND (
                     (priority = 'critical' AND created_at < NOW() - INTERVAL '${INBOX_SLA_DEFAULTS.critical} hours') OR
                     (priority = 'high' AND created_at < NOW() - INTERVAL '${INBOX_SLA_DEFAULTS.high} hours') OR
                     (priority = 'medium' AND created_at < NOW() - INTERVAL '${INBOX_SLA_DEFAULTS.medium} hours') OR
                     (priority = 'low' AND created_at < NOW() - INTERVAL '${INBOX_SLA_DEFAULTS.low} hours')
                   )`,
              );
              const breachCount = breachResult.rows.length;
              if (breachCount > 0) {
                logger.warn(`[Job] inbox-sla-monitor: tenant ${t.tenant_id} — ${breachCount} SLA breaches`);
              }

              const escalateResult = await safeQuery(
                `UPDATE "${schema}".inbox_messages
                 SET priority = CASE
                   WHEN priority = 'low' THEN 'medium'
                   WHEN priority = 'medium' THEN 'high'
                   WHEN priority = 'high' THEN 'critical'
                   ELSE priority
                 END,
                 updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'unread'
                   AND priority != 'critical'
                   AND created_at < NOW() - INTERVAL '${INBOX_TIMEOUTS.ESCALATION_AFTER_HOURS} hours'`,
              );
              if (escalateResult.rowCount && escalateResult.rowCount > 0) {
                logger.info(`[Job] inbox-sla-monitor: tenant ${t.tenant_id} — escalated ${escalateResult.rowCount} messages`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-digest-generator',

      cron: '0 8 * * *',
      description: 'Generate and send daily digests for opted-in users',
      handler: async () => {
        logger.info('[Job] inbox-digest-generator started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { generateDigest } = await import('../services/inbox-digest.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const prefs = await safeQuery(
                `SELECT user_id FROM "${schema}".inbox_digest_preferences WHERE frequency = 'daily'`,
              );
              let generated = 0;
              for (const p of prefs.rows) {
                try {
                  const digest = await generateDigest(t.tenant_id, p.user_id, 'daily');
                  if (digest.totalUnread > 0) {
                    await safeQuery(
                      `INSERT INTO "${schema}".inbox_messages
                        (subject, body, channel, priority, status, recipient_id, related_module, created_by)
                       VALUES ($1, $2, 'in_app', 'low', 'unread', $3, 'inbox', 'system')`,
                      [
                        `Daily digest — ${digest.totalUnread} unread items`,
                        JSON.stringify({ type: 'digest', period: 'daily', stats: digest.stats, groups: digest.groups }),
                        p.user_id,
                      ],
                    );
                    generated++;
                  }
                } catch { }
              }
              if (generated > 0) {
                logger.info(`[Job] inbox-digest-generator: tenant ${t.tenant_id} — ${generated} digests`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-digest-generator error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-weekly-digest',

      cron: '0 8 * * 1',
      description: 'Generate and send weekly digests',
      handler: async () => {
        logger.info('[Job] inbox-weekly-digest started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { generateDigest } = await import('../services/inbox-digest.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const prefs = await safeQuery(
                `SELECT user_id FROM "${schema}".inbox_digest_preferences WHERE frequency = 'weekly'`,
              );
              for (const p of prefs.rows) {
                try {
                  const digest = await generateDigest(t.tenant_id, p.user_id, 'weekly');
                  if (digest.totalUnread > 0) {
                    await safeQuery(
                      `INSERT INTO "${schema}".inbox_messages
                        (subject, body, channel, priority, status, recipient_id, related_module, created_by)
                       VALUES ($1, $2, 'in_app', 'low', 'unread', $3, 'inbox', 'system')`,
                      [
                        `Weekly digest — ${digest.totalUnread} unread items`,
                        JSON.stringify({ type: 'digest', period: 'weekly', stats: digest.stats, groups: digest.groups }),
                        p.user_id,
                      ],
                    );
                  }
                } catch { }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-weekly-digest error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-expiry-purge',

      cron: '0 */2 * * *',
      description: 'Soft-delete messages past their expiration date',
      handler: async () => {
        logger.info('[Job] inbox-expiry-purge started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".inbox_messages
                 SET deleted_at = NOW(), status = 'deleted'
                 WHERE deleted_at IS NULL
                   AND expires_at IS NOT NULL
                   AND expires_at < NOW()`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] inbox-expiry-purge: tenant ${t.tenant_id} — ${result.rowCount} expired messages purged`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-expiry-purge error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-stale-archiver',

      cron: '0 3 * * 0',
      description: `Auto-archive messages older than ${INBOX_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] inbox-stale-archiver started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".inbox_messages
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('archived', 'deleted')
                   AND updated_at < NOW() - INTERVAL '${INBOX_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] inbox-stale-archiver: tenant ${t.tenant_id} — ${result.rowCount} stale messages archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-stale-archiver error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-priority-recalc',

      cron: '0 */6 * * *',
      description: 'Recalculate priority scores based on age and SLA proximity',
      handler: async () => {
        logger.info('[Job] inbox-priority-recalc started');
        try {
          const { recalculatePriorities } = await import('../services/inbox-priority.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const updated = await recalculatePriorities(t.tenant_id);
              if (updated > 0) {
                logger.info(`[Job] inbox-priority-recalc: tenant ${t.tenant_id} — ${updated} priorities recalculated`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-priority-recalc error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-data-retention',

      cron: '0 0 1 * *',
      description: 'Enforce data retention policy — soft-delete archived items past retention period, respecting legal holds',
      handler: async () => {
        logger.info('[Job] inbox-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".inbox_messages
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = inbox_messages.id::text AND lh.entity_type = 'inbox' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'inbox-health-check',

      cron: '0 */12 * * *',
      description: 'Check inbox health and alert if thresholds exceeded',
      handler: async () => {
        logger.info('[Job] inbox-health-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE status = 'unread')::int AS unread,
                   COUNT(*) FILTER (WHERE priority = 'critical' AND status = 'unread')::int AS critical_unread,
                   COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('actioned', 'archived', 'deleted'))::int AS overdue
                 FROM "${schema}".inbox_messages WHERE deleted_at IS NULL`,
              );
              const stats = result.rows[0] || {};
              if ((stats.critical_unread || 0) > 0) {
                logger.warn(`[Job] inbox-health-check: tenant ${t.tenant_id} — ${stats.critical_unread} critical unread messages`);
              }
              if ((stats.unread || 0) > INBOX_BUSINESS_THRESHOLDS.UNREAD_CRITICAL_COUNT) {
                logger.error(`[Job] inbox-health-check: tenant ${t.tenant_id} — ${stats.unread} unread exceeds critical threshold (${INBOX_BUSINESS_THRESHOLDS.UNREAD_CRITICAL_COUNT})`);
              }
              if ((stats.overdue || 0) > INBOX_BUSINESS_THRESHOLDS.UNREAD_WARNING_COUNT) {
                logger.warn(`[Job] inbox-health-check: tenant ${t.tenant_id} — ${stats.overdue} overdue messages`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] inbox-health-check error:', toErrorMessage(err));
        }
      },
    },
  ];
}
