import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { ISSUES_SLA_DEFAULTS, ISSUES_TIMEOUTS, ISSUES_BUSINESS_THRESHOLDS } from '../data/issues-constants';

export async function getIssuesJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'issues-sla-monitor',
      cron: '*/30 * * * *',
      description: 'Check for SLA breaches, flag overdue issues, auto-escalate priorities',
      handler: async () => {
        logger.info('[Job] issues-sla-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { runSlaEscalationJob } = await import('../services/issues-lifecycle.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const breachResult = await safeQuery(
                `SELECT issue_id, severity, assigned_to,
                   EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
                 FROM "${schema}".issues
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived', 'resolved')
                   AND (
                     (severity = 'critical' AND created_at < NOW() - INTERVAL '${ISSUES_SLA_DEFAULTS.critical} hours') OR
                     (severity = 'high' AND created_at < NOW() - INTERVAL '${ISSUES_SLA_DEFAULTS.high} hours') OR
                     (severity = 'medium' AND created_at < NOW() - INTERVAL '${ISSUES_SLA_DEFAULTS.medium} hours') OR
                     (severity = 'low' AND created_at < NOW() - INTERVAL '${ISSUES_SLA_DEFAULTS.low} hours')
                   )`,
              );
              if (breachResult.rows.length > 0) {
                logger.warn(`[Job] issues-sla-monitor: tenant ${t.tenant_id} — ${breachResult.rows.length} SLA breaches`);
                const escalation = await runSlaEscalationJob(t.tenant_id);
                if (escalation.escalated > 0) {
                  logger.info(`[Job] issues-sla-monitor: tenant ${t.tenant_id} — escalated ${escalation.escalated} issues`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-escalation-chain',
      cron: '0 */4 * * *',
      description: 'Run escalation chain for issues past escalation threshold',
      handler: async () => {
        logger.info('[Job] issues-escalation-chain started');
        try {
          const { runEscalationJob } = await import('../services/issues-escalation.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runEscalationJob(t.tenant_id);
              if (result.escalated > 0) {
                logger.info(`[Job] issues-escalation-chain: tenant ${t.tenant_id} — processed ${result.processed}, escalated ${result.escalated}`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-escalation-chain error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-overdue-reminder',
      cron: '0 9 * * *',
      description: 'Send reminders for issues approaching their due date',
      handler: async () => {
        logger.info('[Job] issues-overdue-reminder started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT issue_id, title, severity, assigned_to, due_date
                 FROM "${schema}".issues
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived', 'resolved')
                   AND due_date IS NOT NULL
                   AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${ISSUES_TIMEOUTS.REMINDER_BEFORE_HOURS} hours'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] issues-overdue-reminder: tenant ${t.tenant_id} — ${result.rows.length} issues approaching due date`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-overdue-reminder error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-stale-detector',
      cron: '0 10 * * 1',
      description: `Detect stale issues not updated in ${ISSUES_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days and auto-archive`,
      handler: async () => {
        logger.info('[Job] issues-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".issues
                 SET status = 'archived', updated_at = NOW(), updated_by = 'system'
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived')
                   AND updated_at < NOW() - INTERVAL '${ISSUES_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] issues-stale-detector: tenant ${t.tenant_id} — ${result.rowCount} issues auto-archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-duplicate-scan',
      cron: '0 2 * * *',
      description: 'Scan for potential duplicate issues and flag them',
      handler: async () => {
        logger.info('[Job] issues-duplicate-scan started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT a.issue_id AS issue_a, b.issue_id AS issue_b, a.title
                 FROM "${schema}".issues a
                 JOIN "${schema}".issues b ON a.issue_id < b.issue_id
                   AND a.category = b.category
                   AND a.severity = b.severity
                   AND similarity(a.title, b.title) > 0.7
                 WHERE a.deleted_at IS NULL AND b.deleted_at IS NULL
                   AND a.status NOT IN ('closed', 'archived')
                   AND b.status NOT IN ('closed', 'archived')
                   AND a.created_at > NOW() - INTERVAL '30 days'
                 LIMIT 50`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] issues-duplicate-scan: tenant ${t.tenant_id} — ${result.rows.length} potential duplicates found`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-duplicate-scan error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-management-alerts',
      cron: '0 8 * * 1-5',
      description: 'Generate management alerts for escalated and critical issues',
      handler: async () => {
        logger.info('[Job] issues-management-alerts started');
        try {
          const { generateManagementAlerts } = await import('../services/issues-escalation.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const alerts = await generateManagementAlerts(t.tenant_id);
              if (alerts.length > 0) {
                logger.warn(`[Job] issues-management-alerts: tenant ${t.tenant_id} — ${alerts.length} management alerts generated`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-management-alerts error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived issues past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] issues-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".issues
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = issue_id::text AND lh.entity_type = 'issues' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'issues-health-check',
      cron: '0 */12 * * *',
      description: 'Check issues module health and alert on threshold violations',
      handler: async () => {
        logger.info('[Job] issues-health-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active,
                   COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'archived'))::int AS critical,
                   COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved'))::int AS overdue,
                   COUNT(*) FILTER (WHERE (metadata->>'sla_breached')::boolean = true AND status NOT IN ('closed', 'archived'))::int AS sla_breached
                 FROM "${schema}".issues WHERE deleted_at IS NULL`,
              );
              const stats = result.rows[0] || {};
              if ((stats.critical || 0) > 5) {
                logger.error(`[Job] issues-health-check: tenant ${t.tenant_id} — ${stats.critical} critical open issues`);
              }
              if ((stats.sla_breached || 0) > 10) {
                logger.error(`[Job] issues-health-check: tenant ${t.tenant_id} — ${stats.sla_breached} SLA-breached issues`);
              }
              if ((stats.overdue || 0) > 20) {
                logger.warn(`[Job] issues-health-check: tenant ${t.tenant_id} — ${stats.overdue} overdue issues`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] issues-health-check error:', toErrorMessage(err));
        }
      },
    },
  ];
}

