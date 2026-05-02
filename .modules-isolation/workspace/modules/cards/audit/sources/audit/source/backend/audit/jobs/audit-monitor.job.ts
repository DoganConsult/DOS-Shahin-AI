import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { AUDIT_BUSINESS_THRESHOLDS, AUDIT_TIMEOUTS, AUDIT_SLA_DEFAULTS } from '../data/audit-constants';

export async function getAuditJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/tenancy');

  return [
    {
      name: 'audit-findings-tracker',
      cron: '0 */4 * * *',
      description: 'Track overdue findings, escalate critical items past SLA thresholds',
      handler: async () => {
        logger.info('[Job] audit-findings-tracker executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE severity = 'critical' AND created_at < NOW() - INTERVAL '${AUDIT_SLA_DEFAULTS.critical} hours')::int AS critical_overdue,
                   COUNT(*) FILTER (WHERE severity = 'high' AND created_at < NOW() - INTERVAL '${AUDIT_SLA_DEFAULTS.high} hours')::int AS high_overdue,
                   COUNT(*) FILTER (WHERE severity = 'medium' AND created_at < NOW() - INTERVAL '${AUDIT_SLA_DEFAULTS.medium} hours')::int AS medium_overdue,
                   COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < NOW())::int AS past_due_date
                 FROM "${schema}".findings
                 WHERE deleted_at IS NULL AND status NOT IN ('closed', 'remediated')`,
              );
              const row = result.rows[0] || {};
              if ((row.critical_overdue || 0) > 0) {
                logger.warn(`[Job] audit-findings-tracker: tenant ${t.tenant_id} -- ${row.critical_overdue} critical findings past SLA`);
              }
              if ((row.high_overdue || 0) > 0) {
                logger.warn(`[Job] audit-findings-tracker: tenant ${t.tenant_id} -- ${row.high_overdue} high findings past SLA`);
              }
              if ((row.past_due_date || 0) > 0) {
                logger.info(`[Job] audit-findings-tracker: tenant ${t.tenant_id} -- ${row.past_due_date} findings past due date`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-findings-tracker error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-schedule-monitor',
      cron: '0 7 * * *',
      description: 'Monitor audit schedule adherence; flag audits not progressing through lifecycle',
      handler: async () => {
        logger.info('[Job] audit-schedule-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived') AND end_date < NOW())::int AS overdue_audits,
                   COUNT(*) FILTER (WHERE status = 'planned' AND start_date < NOW() - INTERVAL '7 days')::int AS stalled_planned,
                   COUNT(*) FILTER (WHERE status = 'fieldwork' AND updated_at < NOW() - INTERVAL '${AUDIT_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days')::int AS stalled_fieldwork
                 FROM "${schema}".audits
                 WHERE deleted_at IS NULL`,
              );
              const row = result.rows[0] || {};
              if ((row.overdue_audits || 0) > 0) {
                logger.warn(`[Job] audit-schedule-monitor: tenant ${t.tenant_id} -- ${row.overdue_audits} audits past end date`);
              }
              if ((row.stalled_planned || 0) > 0) {
                logger.warn(`[Job] audit-schedule-monitor: tenant ${t.tenant_id} -- ${row.stalled_planned} audits in 'planned' with start date passed`);
              }
              if ((row.stalled_fieldwork || 0) > 0) {
                logger.warn(`[Job] audit-schedule-monitor: tenant ${t.tenant_id} -- ${row.stalled_fieldwork} audits in fieldwork with no updates in ${AUDIT_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-schedule-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-remediation-deadline-check',
      cron: '0 8 * * *',
      description: 'Check corrective action and finding remediation deadlines; notify owners of approaching due dates',
      handler: async () => {
        logger.info('[Job] audit-remediation-deadline-check executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '${AUDIT_TIMEOUTS.REMINDER_BEFORE_HOURS} hours')::int AS due_soon,
                   COUNT(*) FILTER (WHERE due_date < NOW())::int AS overdue,
                   COUNT(*) FILTER (WHERE due_date < NOW() AND severity = 'critical')::int AS critical_overdue
                 FROM "${schema}".findings
                 WHERE deleted_at IS NULL AND status NOT IN ('closed', 'remediated')`,
              );
              const row = result.rows[0] || {};
              if ((row.critical_overdue || 0) > 0) {
                logger.error(`[Job] audit-remediation-deadline-check: tenant ${t.tenant_id} -- ${row.critical_overdue} CRITICAL overdue remediations`);
              }
              if ((row.overdue || 0) > 0) {
                logger.warn(`[Job] audit-remediation-deadline-check: tenant ${t.tenant_id} -- ${row.overdue} overdue remediations`);
              }
              if ((row.due_soon || 0) > 0) {
                logger.info(`[Job] audit-remediation-deadline-check: tenant ${t.tenant_id} -- ${row.due_soon} remediations due soon`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-remediation-deadline-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-completion-report',
      cron: '0 6 * * 1',
      description: 'Weekly audit program completion summary: KPIs, closed audits, finding closure rates',
      handler: async () => {
        logger.info('[Job] audit-completion-report executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const [auditResult, findingResult] = await Promise.all([
                safeQuery(
                  `SELECT
                     COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE status IN ('closed', 'archived'))::int AS closed,
                     COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active,
                     COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days' AND status IN ('closed', 'archived'))::int AS closed_this_week
                   FROM "${schema}".audits WHERE deleted_at IS NULL`,
                ),
                safeQuery(
                  `SELECT
                     COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE status IN ('closed', 'remediated'))::int AS closed,
                     COUNT(*) FILTER (WHERE status NOT IN ('closed', 'remediated'))::int AS open,
                     COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'remediated'))::int AS critical_open
                   FROM "${schema}".findings WHERE deleted_at IS NULL`,
                ),
              ]);
              const ar = auditResult.rows[0] || {};
              const fr = findingResult.rows[0] || {};
              logger.info(
                `[Job] audit-completion-report: tenant ${t.tenant_id} -- ` +
                `Audits: total=${ar.total} active=${ar.active} closed=${ar.closed} closedThisWeek=${ar.closed_this_week} | ` +
                `Findings: total=${fr.total} open=${fr.open} closed=${fr.closed} criticalOpen=${fr.critical_open}`,
              );
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-completion-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-sla-compliance',
      cron: '0 3 * * *',
      description: 'Measure SLA compliance across audit lifecycle stages and finding resolution',
      handler: async () => {
        logger.info('[Job] audit-sla-compliance executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE status IN ('closed', 'remediated'))::int AS total_resolved,
                   COUNT(*) FILTER (WHERE status IN ('closed', 'remediated') AND severity = 'critical'
                     AND EXTRACT(HOUR FROM updated_at - created_at) > ${AUDIT_SLA_DEFAULTS.critical})::int AS critical_sla_breach,
                   COUNT(*) FILTER (WHERE status IN ('closed', 'remediated') AND severity = 'high'
                     AND EXTRACT(HOUR FROM updated_at - created_at) > ${AUDIT_SLA_DEFAULTS.high})::int AS high_sla_breach,
                   COUNT(*) FILTER (WHERE status IN ('closed', 'remediated') AND severity = 'medium'
                     AND EXTRACT(HOUR FROM updated_at - created_at) > ${AUDIT_SLA_DEFAULTS.medium})::int AS medium_sla_breach
                 FROM "${schema}".findings WHERE deleted_at IS NULL`,
              );
              const row = result.rows[0] || {};
              const totalBreaches = (row.critical_sla_breach || 0) + (row.high_sla_breach || 0) + (row.medium_sla_breach || 0);
              if (totalBreaches > 0) {
                logger.warn(
                  `[Job] audit-sla-compliance: tenant ${t.tenant_id} -- ` +
                  `SLA breaches: critical=${row.critical_sla_breach} high=${row.high_sla_breach} medium=${row.medium_sla_breach}`,
                );
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-sla-compliance error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-stale-auto-archive',
      cron: '0 10 * * 1',
      description: `Auto-archive audits not updated in ${AUDIT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] audit-stale-auto-archive executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".audits
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('closed', 'archived')
                   AND updated_at < NOW() - INTERVAL '${AUDIT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] audit-stale-auto-archive: tenant ${t.tenant_id} -- ${result.rowCount} audits auto-archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-stale-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy for audit module; soft-delete eligible archived records',
      handler: async () => {
        logger.info('[Job] audit-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".audits
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '${AUDIT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = audit_id AND lh.entity_type = 'audit' AND lh.active = true
                   )`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] audit-data-retention: tenant ${t.tenant_id} -- ${result.rowCount} records soft-deleted`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'audit-repeat-findings-detector',
      cron: '0 5 * * 0',
      description: 'Weekly scan for findings with same root cause appearing in multiple audit cycles (repeat findings)',
      handler: async () => {
        logger.info('[Job] audit-repeat-findings-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS repeat_count
                 FROM "${schema}".repeat_findings
                 WHERE created_at > NOW() - INTERVAL '7 days'`,
              );
              const count = result.rows[0]?.repeat_count || 0;
              if (count > 0) {
                logger.warn(`[Job] audit-repeat-findings-detector: tenant ${t.tenant_id} -- ${count} new repeat findings this week`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] audit-repeat-findings-detector error:', toErrorMessage(err));
        }
      },
    },
  ];
}

