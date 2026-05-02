import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { POLICY_BUSINESS_THRESHOLDS, POLICY_TIMEOUTS } from '../data/policy-constants';

export async function getPolicyJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'policy-review-cycle-monitor',
      cron: '0 7 * * *',
      description: 'Flag policies overdue for periodic review and notify owners',
      handler: async () => {
        logger.info('[Job] policy-review-cycle-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE review_date < NOW() - INTERVAL '${POLICY_TIMEOUTS.OVERDUE_GRACE_DAYS} days')::int AS critically_overdue,
                   COUNT(*) FILTER (WHERE review_date < NOW())::int AS overdue,
                   COUNT(*) FILTER (
                     WHERE review_date >= NOW()
                       AND review_date <= NOW() + INTERVAL '${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days'
                   )::int AS due_soon
                 FROM "${schema}".policy_policies
                 WHERE deleted_at IS NULL
                   AND review_date IS NOT NULL
                   AND status NOT IN ('deprecated', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.critically_overdue || 0) >= POLICY_BUSINESS_THRESHOLDS.OVERDUE_REVIEW_CRITICAL) {
                logger.error(`[Job] policy-review-cycle-monitor: tenant ${t.tenant_id} — ${r.critically_overdue} policies critically overdue for review!`);
              } else if ((r.overdue || 0) >= POLICY_BUSINESS_THRESHOLDS.OVERDUE_REVIEW_WARNING) {
                logger.warn(`[Job] policy-review-cycle-monitor: tenant ${t.tenant_id} — ${r.overdue} policies overdue for review`);
              }
              if ((r.due_soon || 0) > 0) {
                logger.info(`[Job] policy-review-cycle-monitor: tenant ${t.tenant_id} — ${r.due_soon} policies due for review within ${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-review-cycle-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-version-currency-check',
      cron: '0 8 * * 1',
      description: `Flag approved/effective policies not updated in ${POLICY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] policy-version-currency-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".policy_policies
                 WHERE deleted_at IS NULL
                   AND status IN ('approved', 'published', 'effective')
                   AND updated_at < NOW() - INTERVAL '${POLICY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] policy-version-currency-check: tenant ${t.tenant_id} — ${count} effective policies not updated in ${POLICY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-version-currency-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-acknowledgment-tracker',
      cron: '0 9 * * *',
      description: `Track overdue acknowledgments for published/effective policies`,
      handler: async () => {
        logger.info('[Job] policy-acknowledgment-tracker started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   p.id, p.title,
                   COUNT(pa.user_id)::int AS pending_count
                 FROM "${schema}".policy_policies p
                 JOIN "${schema}".policy_acknowledgments pa ON pa.policy_id = p.id
                   AND pa.acknowledged_at IS NULL
                   AND pa.deadline < NOW()
                 WHERE p.deleted_at IS NULL
                   AND p.status IN ('published', 'effective')
                 GROUP BY p.id, p.title
                 HAVING COUNT(pa.user_id) > 0`,
              ).catch(() => ({ rows: [] }));
              if (result.rows.length > 0) {
                const totalPending = result.rows.reduce((sum: number, r: Record<string, unknown>) => (sum as any) + (r.pending_count || 0), 0);
                logger.warn(`[Job] policy-acknowledgment-tracker: tenant ${t.tenant_id} — ${totalPending} overdue acknowledgments across ${result.rows.length} policies`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-acknowledgment-tracker error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-framework-alignment-check',
      cron: '0 6 1 * *',
      description: 'Monthly check for policies missing required framework mappings',
      handler: async () => {
        logger.info('[Job] policy-framework-alignment-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS effective_no_framework
                 FROM "${schema}".policy_policies
                 WHERE deleted_at IS NULL
                   AND status IN ('approved', 'published', 'effective')
                   AND (frameworks IS NULL OR frameworks = '{}' OR array_length(frameworks, 1) IS NULL)`,
              ).catch(() => ({ rows: [{}] }));

              const count = result.rows[0]?.effective_no_framework || 0;
              if (count > 0) {
                logger.warn(`[Job] policy-framework-alignment-check: tenant ${t.tenant_id} — ${count} effective policies without framework mappings`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-framework-alignment-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-exception-expiry-check',
      cron: '0 7 * * *',
      description: 'Flag and expire policy exceptions past their expiry date',
      handler: async () => {
        logger.info('[Job] policy-exception-expiry-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const expiredResult = await safeQuery(
                `UPDATE "${schema}".policy_exceptions
                 SET status = 'expired', updated_at = NOW()
                 WHERE status = 'approved'
                   AND expiry_date IS NOT NULL
                   AND expiry_date < NOW()
                 RETURNING id`,
              ).catch(() => ({ rows: [], rowCount: 0 }));
              if (expiredResult.rowCount && expiredResult.rowCount > 0) {
                logger.warn(`[Job] policy-exception-expiry-check: tenant ${t.tenant_id} — ${expiredResult.rowCount} exceptions expired`);
              }
              const dueResult = await safeQuery(
                `SELECT COUNT(*)::int AS due_soon
                 FROM "${schema}".policy_exceptions
                 WHERE status = 'approved'
                   AND expiry_date IS NOT NULL
                   AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
              ).catch(() => ({ rows: [{}] }));

              const dueSoon = dueResult.rows[0]?.due_soon || 0;
              if (dueSoon > 0) {
                logger.info(`[Job] policy-exception-expiry-check: tenant ${t.tenant_id} — ${dueSoon} exceptions expiring within 30 days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-exception-expiry-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive deprecated policies after ${POLICY_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] policy-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".policy_policies
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'deprecated'
                   AND updated_at < NOW() - INTERVAL '${POLICY_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] policy-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} deprecated policies archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention for archived policies, respecting legal holds',
      handler: async () => {
        logger.info('[Job] policy-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".policy_policies
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'policy' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'policy-compliance-trend-report',
      cron: '0 6 1 * *',
      description: 'Monthly policy governance trend report (coverage, review rate, acknowledgment rate)',
      handler: async () => {
        logger.info('[Job] policy-compliance-trend-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status IN ('approved', 'published', 'effective'))::int AS effective,
                   COUNT(*) FILTER (WHERE review_date IS NOT NULL AND review_date < NOW() AND status NOT IN ('deprecated', 'archived'))::int AS overdue_review,
                   COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
                   COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_this_month,
                   COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days' AND status NOT IN ('deprecated', 'archived'))::int AS updated_this_month
                 FROM "${schema}".policy_policies
                 WHERE deleted_at IS NULL`,
              );
              const r = result.rows[0] || {};
              logger.info(
                `[Job] policy-compliance-trend-report: tenant ${t.tenant_id} — ` +
                `total=${r.total}, effective=${r.effective}, overdue_review=${r.overdue_review}, ` +
                `deprecated=${r.deprecated}, new=${r.new_this_month}, updated=${r.updated_this_month}`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-compliance-trend-report error:', toErrorMessage(err));
        }
      },
    },
  ];
}

