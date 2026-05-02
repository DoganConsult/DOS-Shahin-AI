import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { TRAINING_BUSINESS_THRESHOLDS, TRAINING_TIMEOUTS } from '../data/training-constants';

export async function getTrainingJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'training-overdue-monitor',
      cron: '0 8 * * *',
      description: 'Daily check for overdue training programs and enrollments',
      handler: async () => {
        logger.info('[Job] training-overdue-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'expired', 'archived'))::int AS overdue,
                   COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '${TRAINING_TIMEOUTS.REMINDER_BEFORE_HOURS} hours' AND status NOT IN ('completed', 'expired', 'archived'))::int AS due_soon
                 FROM "${schema}".training_programs WHERE deleted_at IS NULL`,
              );
              const r = result.rows[0] || {};
              if ((r.overdue || 0) > 0) {
                logger.warn(`[Job] training-overdue-monitor: tenant ${t.tenant_id} — ${r.overdue} overdue training programs`);
              }
              if ((r.due_soon || 0) > 0) {
                logger.info(`[Job] training-overdue-monitor: tenant ${t.tenant_id} — ${r.due_soon} programs due within ${TRAINING_TIMEOUTS.REMINDER_BEFORE_HOURS}h`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-overdue-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'training-certification-expiry',
      cron: '0 7 * * *',
      description: `Flag certifications expiring within ${TRAINING_TIMEOUTS.CERTIFICATION_WARNING_DAYS} days`,
      handler: async () => {
        logger.info('[Job] training-certification-expiry started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".training_programs
                 WHERE deleted_at IS NULL AND status = 'completed'
                   AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${TRAINING_TIMEOUTS.CERTIFICATION_WARNING_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] training-certification-expiry: tenant ${t.tenant_id} — ${count} certifications expiring within ${TRAINING_TIMEOUTS.CERTIFICATION_WARNING_DAYS} days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-certification-expiry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'training-completion-report',
      cron: '0 6 * * 1',
      description: 'Weekly training completion rates and compliance metrics',
      handler: async () => {
        logger.info('[Job] training-completion-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                   COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
                   COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'expired', 'archived'))::int AS overdue
                 FROM "${schema}".training_programs WHERE deleted_at IS NULL`,
              );
              const r = result.rows[0] || {};
              const rate = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
              logger.info(`[Job] training-completion-report: tenant ${t.tenant_id} — total=${r.total}, completed=${r.completed} (${rate}%), in_progress=${r.in_progress}, overdue=${r.overdue}`);
              if (rate < TRAINING_BUSINESS_THRESHOLDS.COMPLETION_RATE_CRITICAL) {
                logger.error(`[Job] training-completion-report: tenant ${t.tenant_id} — CRITICAL: completion rate ${rate}% below ${TRAINING_BUSINESS_THRESHOLDS.COMPLETION_RATE_CRITICAL}% threshold`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-completion-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'training-auto-expire',
      cron: '0 0 * * *',
      description: `Auto-expire programs past due date + ${TRAINING_BUSINESS_THRESHOLDS.RECERTIFICATION_GRACE_DAYS} day grace period`,
      handler: async () => {
        logger.info('[Job] training-auto-expire started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".training_programs
                 SET status = 'expired', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('completed', 'expired', 'archived')
                   AND due_date < NOW() - INTERVAL '${TRAINING_BUSINESS_THRESHOLDS.RECERTIFICATION_GRACE_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] training-auto-expire: tenant ${t.tenant_id} — ${result.rowCount} programs expired`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-auto-expire error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'training-stale-draft',
      cron: '0 9 1 * *',
      description: `Flag draft programs not published in ${TRAINING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] training-stale-draft started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".training_programs
                 WHERE deleted_at IS NULL AND status = 'draft'
                   AND created_at < NOW() - INTERVAL '${TRAINING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] training-stale-draft: tenant ${t.tenant_id} — ${count} stale draft programs`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-stale-draft error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'training-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive expired programs after ${TRAINING_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] training-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".training_programs
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'expired'
                   AND updated_at < NOW() - INTERVAL '${TRAINING_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] training-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} programs archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'training-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived programs past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] training-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".training_programs
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'training' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] training-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

