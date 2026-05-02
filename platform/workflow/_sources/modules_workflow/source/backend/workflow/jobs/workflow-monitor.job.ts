import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { WORKFLOW_SLA_DEFAULTS, WORKFLOW_TIMEOUTS, WORKFLOW_BUSINESS_THRESHOLDS } from '../data/workflow-constants';
import { emitSlaWarning, emitSlaBreached, emitTaskOverdue, emitApprovalEscalated } from '../ports/lifecycle.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export async function getWorkflowJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'workflow-sla-monitor',
      cron: '0 */1 * * *',
      description: 'Check approaching and breached SLAs; emit warning and breach events',
      handler: async () => {
        logger.info('[Job] workflow-sla-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);

              const warningResult = await safeQuery(`
                SELECT id, COALESCE(priority, 'medium') AS priority,
                  COALESCE(workflow_type, 'general') AS workflow_type,
                  EXTRACT(EPOCH FROM (due_date - NOW()) / 3600)::int AS hours_remaining
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND status IN ('active', 'paused')
                  AND due_date IS NOT NULL
                  AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS} hours'
              `);

              for (const row of warningResult.rows) {
                await emitSlaWarning(t.tenant_id, {
                  workflowId: row.id,
                  hoursRemaining: row.hours_remaining || 0,
                  priority: row.priority,
                  workflowType: row.workflow_type,
                });
              }

              if (warningResult.rows.length > 0) {
                logger.warn(`[Job] workflow-sla-monitor: tenant ${t.tenant_id} -- ${warningResult.rows.length} workflows approaching SLA`);
              }

              const breachResult = await safeQuery(`
                SELECT id, COALESCE(priority, 'medium') AS priority,
                  COALESCE(workflow_type, 'general') AS workflow_type,
                  EXTRACT(EPOCH FROM (NOW() - due_date) / 3600)::int AS hours_breached
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND status IN ('active', 'paused')
                  AND due_date IS NOT NULL
                  AND due_date < NOW()
              `);

              for (const row of breachResult.rows) {
                await emitSlaBreached(t.tenant_id, {
                  workflowId: row.id,
                  hoursBreached: row.hours_breached || 0,
                  priority: row.priority,
                  workflowType: row.workflow_type,
                });
              }

              if (breachResult.rows.length > 0) {
                logger.warn(`[Job] workflow-sla-monitor: tenant ${t.tenant_id} -- ${breachResult.rows.length} SLA breaches`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-sla-monitor error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-stuck-detector',
      cron: '0 */4 * * *',
      description: `Detect workflows not updated in ${WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days and flag them`,
      handler: async () => {
        logger.info('[Job] workflow-stuck-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                SELECT id, COALESCE(workflow_type, 'general') AS workflow_type,
                  EXTRACT(EPOCH FROM (NOW() - updated_at) / 86400)::int AS days_stuck
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND status IN ('active', 'paused')
                  AND updated_at < NOW() - INTERVAL '${WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'
              `);

              if (result.rows.length > 0) {
                logger.warn(`[Job] workflow-stuck-detector: tenant ${t.tenant_id} -- ${result.rows.length} stuck workflows`);
                for (const row of result.rows) {
                  logger.warn(`[Job] workflow-stuck-detector: workflow ${row.id} (${row.workflow_type}) stuck for ${row.days_stuck} days`);
                }
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-stuck-detector error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-task-escalation',
      cron: `0 */${WORKFLOW_TIMEOUTS.ESCALATION_AFTER_HOURS} * * *`,
      description: 'Escalate overdue tasks that have breached escalation threshold',
      handler: async () => {
        logger.info('[Job] workflow-task-escalation executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                SELECT id, COALESCE(assignee_id, '') AS assignee_id,
                  COALESCE(priority, 'medium') AS priority,
                  EXTRACT(EPOCH FROM (NOW() - due_date) / 3600)::int AS hours_overdue
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND status IN ('active', 'paused')
                  AND due_date IS NOT NULL
                  AND due_date < NOW() - INTERVAL '${WORKFLOW_TIMEOUTS.ESCALATION_AFTER_HOURS} hours'
              `);

              for (const row of result.rows) {
                await emitTaskOverdue(t.tenant_id, {
                  workflowId: row.id,
                  hoursOverdue: row.hours_overdue || 0,
                  assigneeId: row.assignee_id || null,
                  priority: row.priority,
                });
              }

              if (result.rows.length > 0) {
                logger.warn(`[Job] workflow-task-escalation: tenant ${t.tenant_id} -- ${result.rows.length} tasks escalated`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-task-escalation error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-approval-reminder',
      cron: `0 */${WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS} * * *`,
      description: 'Send reminders for stale approval-step workflows pending action',
      handler: async () => {
        logger.info('[Job] workflow-approval-reminder executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                SELECT id,
                  COALESCE(workflow_type, 'general') AS workflow_type,
                  EXTRACT(EPOCH FROM (NOW() - updated_at) / 3600)::int AS hours_waiting
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND status = 'active'
                  AND current_step ILIKE '%approval%'
                  AND updated_at < NOW() - INTERVAL '${WORKFLOW_TIMEOUTS.ESCALATION_AFTER_HOURS} hours'
              `);

              for (const row of result.rows) {
                if ((row.hours_waiting || 0) > WORKFLOW_SLA_DEFAULTS.high) {
                  await emitApprovalEscalated(t.tenant_id, {
                    workflowId: row.id,
                    escalatedTo: 'workflow_manager',
                    actorId: SYSTEM_JOB_ACTOR,
                    hoursWaiting: row.hours_waiting || 0,
                    workflowType: row.workflow_type,
                  });
                }
              }

              if (result.rows.length > 0) {
                logger.info(`[Job] workflow-approval-reminder: tenant ${t.tenant_id} -- ${result.rows.length} stale approvals reminded`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-approval-reminder error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-completion-report',
      cron: '0 6 * * 1',
      description: 'Generate weekly workflow completion and SLA compliance metrics per tenant',
      handler: async () => {
        logger.info('[Job] workflow-completion-report executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                SELECT
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status IN ('completed', 'archived'))::int AS completed,
                  COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                  COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'archived', 'failed')
                    AND due_date IS NOT NULL AND due_date < NOW())::int AS overdue,
                  ROUND(
                    COUNT(*) FILTER (WHERE status IN ('completed', 'archived')
                      AND completed_at IS NOT NULL AND due_date IS NOT NULL AND completed_at <= due_date)::numeric /
                    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL), 0)::numeric * 100, 2
                  ) AS sla_compliance_rate
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND created_at >= NOW() - INTERVAL '7 days'
              `);

              const row = result.rows[0] || {};
              const slaRate = row.sla_compliance_rate ? Number(row.sla_compliance_rate) : 100;

              logger.info(`[Job] workflow-completion-report: tenant ${t.tenant_id} -- week: total=${row.total || 0} completed=${row.completed || 0} failed=${row.failed || 0} overdue=${row.overdue || 0} SLA=${slaRate}%`);

              if (slaRate < WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_CRITICAL) {
                logger.error(`[Job] workflow-completion-report: tenant ${t.tenant_id} -- SLA compliance CRITICAL (${slaRate}% < ${WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_CRITICAL}%)`);
              } else if (slaRate < WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_WARNING) {
                logger.warn(`[Job] workflow-completion-report: tenant ${t.tenant_id} -- SLA compliance WARNING (${slaRate}% < ${WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_WARNING}%)`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-completion-report error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-auto-archive',
      cron: '0 2 * * *',
      description: `Auto-archive completed/cancelled workflows older than ${WORKFLOW_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] workflow-auto-archive executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".workflow_workflows
                SET status = 'archived', updated_at = NOW()
                WHERE deleted_at IS NULL
                  AND status IN ('completed', 'cancelled')
                  AND updated_at < NOW() - INTERVAL '${WORKFLOW_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'
              `);

              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] workflow-auto-archive: tenant ${t.tenant_id} -- ${result.rowCount} workflows archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-auto-archive error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy: soft-delete archived workflows past retention window',
      handler: async () => {
        logger.info('[Job] workflow-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(`
                UPDATE "${schema}".workflow_workflows
                SET deleted_at = NOW()
                WHERE deleted_at IS NULL
                  AND status = 'archived'
                  AND updated_at < NOW() - INTERVAL '2555 days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id AND lh.entity_type = 'workflow' AND lh.active = true
                  )
              `);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-data-retention error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'workflow-failed-recovery-check',
      cron: '0 */2 * * *',
      description: 'Identify failed workflows eligible for retry and log recovery candidates',
      handler: async () => {
        logger.info('[Job] workflow-failed-recovery-check executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                SELECT id, COALESCE(workflow_type, 'general') AS workflow_type,
                  COALESCE(priority, 'medium') AS priority,
                  EXTRACT(EPOCH FROM (NOW() - updated_at) / 3600)::int AS hours_since_failure
                FROM "${schema}".workflow_workflows
                WHERE deleted_at IS NULL
                  AND status = 'failed'
                  AND updated_at > NOW() - INTERVAL '${WORKFLOW_BUSINESS_THRESHOLDS.MAX_INSTANCE_DURATION_DAYS} days'
                ORDER BY CASE COALESCE(priority, 'medium')
                  WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                  updated_at DESC
                LIMIT 50
              `);

              if (result.rows.length > 0) {
                logger.warn(`[Job] workflow-failed-recovery-check: tenant ${t.tenant_id} -- ${result.rows.length} failed workflows eligible for review`);
                const criticalFailed = result.rows.filter(( r: Record<string, unknown>) => r.priority === 'critical');
                if (criticalFailed.length > 0) {
                  logger.error(`[Job] workflow-failed-recovery-check: tenant ${t.tenant_id} -- ${criticalFailed.length} CRITICAL priority failures require immediate attention`);
                }
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] workflow-failed-recovery-check error:', toErrorMessage(err));
        }
      },
    },
  ];
}

