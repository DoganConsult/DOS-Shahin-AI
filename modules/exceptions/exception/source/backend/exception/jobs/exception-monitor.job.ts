import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { EXCEPTION_BUSINESS_THRESHOLDS, EXCEPTION_TIMEOUTS } from '../data/exception-constants';

export async function getExceptionJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'exception-expiry-monitor',
      cron: '0 7 * * *',
      description: `Flag active exceptions expiring within ${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_WARNING_DAYS} days`,
      handler: async () => {
        logger.info('[Job] exception-expiry-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_CRITICAL_DAYS} days')::int AS critical,
                   COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() + INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_CRITICAL_DAYS} days' AND NOW() + INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_WARNING_DAYS} days')::int AS warning
                 FROM "${schema}".exceptions
                 WHERE deleted_at IS NULL AND status = 'active' AND expires_at IS NOT NULL`,
              );
              const r = result.rows[0] || {};
              if ((r.critical || 0) > 0) {
                logger.error(`[Job] exception-expiry-monitor: tenant ${t.tenant_id} — ${r.critical} exceptions expiring within ${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_CRITICAL_DAYS} days!`);
              }
              if ((r.warning || 0) > 0) {
                logger.warn(`[Job] exception-expiry-monitor: tenant ${t.tenant_id} — ${r.warning} exceptions expiring within ${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_WARNING_DAYS} days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-expiry-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-auto-expire',
      cron: '0 0 * * *',
      description: 'Auto-expire active exceptions past their expiry date',
      handler: async () => {
        logger.info('[Job] exception-auto-expire started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".exceptions
                 SET status = 'expired', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND expires_at IS NOT NULL AND expires_at < NOW()`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.warn(`[Job] exception-auto-expire: tenant ${t.tenant_id} — ${result.rowCount} exceptions auto-expired`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-auto-expire error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-pending-escalation',
      cron: '0 9 * * *',
      description: `Escalate pending exceptions older than ${EXCEPTION_TIMEOUTS.ESCALATION_AFTER_HOURS}h`,
      handler: async () => {
        logger.info('[Job] exception-pending-escalation started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, control_id, reason, risk_acceptance,
                   EXTRACT(HOUR FROM NOW() - created_at)::int AS hours_pending
                 FROM "${schema}".exceptions
                 WHERE deleted_at IS NULL AND status = 'pending'
                   AND created_at < NOW() - INTERVAL '${EXCEPTION_TIMEOUTS.ESCALATION_AFTER_HOURS} hours'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] exception-pending-escalation: tenant ${t.tenant_id} — ${result.rows.length} pending exceptions need escalation`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-pending-escalation error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-compensating-control-audit',
      cron: '0 8 * * 1',
      description: 'Audit active exceptions missing compensating controls',
      handler: async () => {
        logger.info('[Job] exception-compensating-control-audit started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".exceptions
                 WHERE deleted_at IS NULL AND status = 'active'
                   AND exception_type IN ('policy', 'control', 'technical', 'regulatory', 'security')
                   AND (compensating_controls IS NULL OR compensating_controls = '[]')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] exception-compensating-control-audit: tenant ${t.tenant_id} — ${count} active exceptions missing compensating controls`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-compensating-control-audit error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-stale-detector',
      cron: '0 10 * * 1',
      description: `Detect stale exception items not updated in ${EXCEPTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] exception-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, control_id, status,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_stale
                 FROM "${schema}".exceptions
                 WHERE deleted_at IS NULL AND status IN ('draft', 'pending')
                   AND updated_at < NOW() - INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] exception-stale-detector: tenant ${t.tenant_id} — ${result.rows.length} stale exceptions`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive expired/closed exceptions after ${EXCEPTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] exception-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".exceptions
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('expired', 'closed', 'revoked')
                   AND updated_at < NOW() - INTERVAL '${EXCEPTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] exception-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} exceptions archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-risk-summary',
      cron: '0 6 1 * *',
      description: 'Monthly risk summary of active exceptions by type and risk level',
      handler: async () => {
        logger.info('[Job] exception-risk-summary started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COALESCE(risk_acceptance, 'unspecified') AS risk_level,
                   COUNT(*)::int AS count
                 FROM "${schema}".exceptions
                 WHERE deleted_at IS NULL AND status = 'active'
                 GROUP BY risk_level ORDER BY count DESC`,
              );
              for (const row of result.rows) {
                logger.info(`[Job] exception-risk-summary: tenant ${t.tenant_id} — risk=${row.risk_level}, active=${row.count}`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-risk-summary error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'exception-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived exceptions past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] exception-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".exceptions
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'exception' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] exception-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

