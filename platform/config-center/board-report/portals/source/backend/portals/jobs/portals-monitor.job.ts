import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { PORTALS_BUSINESS_THRESHOLDS, PORTALS_TIMEOUTS as _PORTALS_TIMEOUTS } from '../data/portals-constants';

export async function getPortalsJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'portals-expired-token-cleanup',
      cron: '0 2 * * *',
      description: 'Auto-revoke expired portal tokens to prevent stale credentials',
      handler: async () => {
        logger.info('[Job] portals-expired-token-cleanup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".portal_tokens
                 SET is_revoked = true, updated_at = NOW()
                 WHERE is_revoked = false AND expires_at < NOW()`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] portals-expired-token-cleanup: tenant ${t.tenant_id} — ${result.rowCount} expired tokens revoked`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-expired-token-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-session-cleanup',
      cron: '*/30 * * * *',
      description: 'Expire stale portal sessions past their timeout',
      handler: async () => {
        logger.info('[Job] portals-session-cleanup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".portal_sessions
                 SET is_active = false, updated_at = NOW()
                 WHERE is_active = true AND expires_at < NOW()`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] portals-session-cleanup: tenant ${t.tenant_id} — ${result.rowCount} sessions expired`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-session-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-inactive-detector',
      cron: '0 8 * * 1',
      description: `Detect portals inactive for ${PORTALS_BUSINESS_THRESHOLDS.INACTIVITY_WARNING_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] portals-inactive-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT p.id, p.title, p.portal_type,
                   EXTRACT(DAY FROM NOW() - p.updated_at)::int AS days_inactive
                 FROM "${schema}".portals_portals p
                 WHERE p.deleted_at IS NULL AND p.status = 'active'
                   AND p.updated_at < NOW() - INTERVAL '${PORTALS_BUSINESS_THRESHOLDS.INACTIVITY_WARNING_DAYS} days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] portals-inactive-detector: tenant ${t.tenant_id} — ${result.rows.length} inactive portals: ${result.rows.map(( r: Record<string, unknown>) => r.title).join(', ')}`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-inactive-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-stale-archiver',
      cron: '0 3 * * 0',
      description: `Auto-archive portals inactive for ${PORTALS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] portals-stale-archiver started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".portals_portals
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('inactive', 'draft')
                   AND updated_at < NOW() - INTERVAL '${PORTALS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] portals-stale-archiver: tenant ${t.tenant_id} — ${result.rowCount} portals auto-archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-stale-archiver error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-access-log-cleanup',
      cron: '0 1 1 * *',
      description: 'Clean access logs older than 365 days to manage storage',
      handler: async () => {
        logger.info('[Job] portals-access-log-cleanup started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `DELETE FROM "${schema}".portal_access_logs
                 WHERE created_at < NOW() - INTERVAL '365 days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] portals-access-log-cleanup: tenant ${t.tenant_id} — ${result.rowCount} old access logs purged`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-access-log-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-concurrent-session-monitor',
      cron: '*/15 * * * *',
      description: `Monitor concurrent sessions and alert when exceeding ${PORTALS_BUSINESS_THRESHOLDS.MAX_CONCURRENT_VISITORS} threshold`,
      handler: async () => {
        logger.info('[Job] portals-concurrent-session-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT p.id, p.title, COUNT(s.session_id)::int AS active_sessions
                 FROM "${schema}".portals_portals p
                 JOIN "${schema}".portal_sessions s ON s.portal_id = p.id AND s.is_active = true AND s.expires_at > NOW()
                 WHERE p.deleted_at IS NULL AND p.status = 'active'
                 GROUP BY p.id, p.title
                 HAVING COUNT(s.session_id) > ${PORTALS_BUSINESS_THRESHOLDS.VISITOR_WARNING_COUNT}`,
              );
              for (const row of result.rows) {
                logger.warn(`[Job] portals-concurrent-session-monitor: tenant ${t.tenant_id} — portal "${row.title}" has ${row.active_sessions} active sessions`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-concurrent-session-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived portals past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] portals-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".portals_portals
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'portals' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'portals-health-check',
      cron: '0 */12 * * *',
      description: 'Check overall portals module health and alert on threshold violations',
      handler: async () => {
        logger.info('[Job] portals-health-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total_portals,
                   COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                   COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
                   (SELECT COUNT(*)::int FROM "${schema}".portal_tokens WHERE is_revoked = false AND expires_at < NOW()) AS expired_tokens,
                   (SELECT COUNT(*)::int FROM "${schema}".portal_sessions WHERE is_active = true AND expires_at > NOW()) AS active_sessions
                 FROM "${schema}".portals_portals WHERE deleted_at IS NULL`,
              );
              const stats = result.rows[0] || {};
              if ((stats.suspended || 0) > 2) {
                logger.error(`[Job] portals-health-check: tenant ${t.tenant_id} — ${stats.suspended} suspended portals`);
              }
              if ((stats.expired_tokens || 0) > 50) {
                logger.warn(`[Job] portals-health-check: tenant ${t.tenant_id} — ${stats.expired_tokens} expired tokens not yet revoked`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] portals-health-check error:', toErrorMessage(err));
        }
      },
    },
  ];
}

