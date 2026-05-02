import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { ACTION_BUSINESS_THRESHOLDS, ACTION_TIMEOUTS } from '../data/action-constants';

export async function getActionJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/tenancy');

  return [
    {
      name: 'action-overdue-monitor',
      cron: '0 */4 * * *',
      description: 'Detect overdue action items and flag for escalation',
      handler: async () => {
        logger.info('[Job] action-overdue-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical_overdue,
                   COUNT(*) FILTER (WHERE priority = 'high')::int AS high_overdue,
                   COUNT(*) FILTER (WHERE priority IN ('medium', 'low'))::int AS other_overdue
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL
                   AND due_date < NOW()
                   AND status NOT IN ('completed', 'cancelled', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.critical_overdue || 0) > 0) {
                logger.error(`[Job] action-overdue-monitor: tenant ${t.tenant_id} — ${r.critical_overdue} CRITICAL actions overdue!`);
              }
              if ((r.high_overdue || 0) > 0) {
                logger.warn(`[Job] action-overdue-monitor: tenant ${t.tenant_id} — ${r.high_overdue} high-priority actions overdue`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-overdue-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-due-soon-warning',
      cron: '0 8 * * *',
      description: `Warn about actions due within ${ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS}h`,
      handler: async () => {
        logger.info('[Job] action-due-soon-warning started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL
                   AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS} hours'
                   AND status NOT IN ('completed', 'cancelled', 'archived')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] action-due-soon-warning: tenant ${t.tenant_id} — ${count} actions due within ${ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS}h`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-due-soon-warning error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-auto-overdue',
      cron: '0 0 * * *',
      description: 'Auto-mark past-due actions as overdue status',
      handler: async () => {
        logger.info('[Job] action-auto-overdue started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".action_action_items
                 SET status = 'overdue', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND due_date < NOW()
                   AND status IN ('open', 'in_progress')`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.warn(`[Job] action-auto-overdue: tenant ${t.tenant_id} — ${result.rowCount} actions marked overdue`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-auto-overdue error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-stale-detector',
      cron: '0 9 * * 1',
      description: `Detect stale actions not updated in ${ACTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] action-stale-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, priority, assigned_to,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_stale
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL AND status IN ('open', 'in_progress')
                   AND updated_at < NOW() - INTERVAL '${ACTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] action-stale-detector: tenant ${t.tenant_id} — ${result.rows.length} stale actions`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-stale-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-workload-report',
      cron: '0 7 * * 1',
      description: 'Weekly workload report per assignee',
      handler: async () => {
        logger.info('[Job] action-workload-report started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT assigned_to,
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'archived')
                   AND assigned_to IS NOT NULL
                 GROUP BY assigned_to ORDER BY overdue DESC LIMIT 20`,
              );
              for (const row of result.rows) {
                if ((row.overdue || 0) > 0) {
                  logger.warn(`[Job] action-workload-report: tenant ${t.tenant_id} — ${row.assigned_to}: ${row.total} total, ${row.overdue} overdue`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-workload-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-unassigned-check',
      cron: '0 10 * * *',
      description: 'Flag open actions without assignees',
      handler: async () => {
        logger.info('[Job] action-unassigned-check started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('completed', 'cancelled', 'archived')
                   AND (assigned_to IS NULL OR assigned_to = '')`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] action-unassigned-check: tenant ${t.tenant_id} — ${count} open actions without assignee`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-unassigned-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive completed/cancelled actions after ${ACTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] action-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".action_action_items
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('completed', 'cancelled')
                   AND updated_at < NOW() - INTERVAL '${ACTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] action-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} actions archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'action-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived actions past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] action-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".action_action_items
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'action' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] action-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

