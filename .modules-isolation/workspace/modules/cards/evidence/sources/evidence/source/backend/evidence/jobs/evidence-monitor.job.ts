import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { EVIDENCE_TIMEOUTS, EVIDENCE_BUSINESS_THRESHOLDS, EVIDENCE_SLA_DEFAULTS } from '../data/evidence-constants';

export async function getEvidenceJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'evidence-expiry-monitor',
      cron: '0 6 * * *',
      description: 'Flag evidence expiring within 30/60/90 days and mark overdue items as expired',
      handler: async () => {
        logger.info('[Job] evidence-expiry-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const expiryResult = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS expiring_30d,
                   COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '60 days')::int AS expiring_60d,
                   COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '90 days')::int AS expiring_90d,
                   COUNT(*) FILTER (WHERE expires_at < NOW())::int AS already_expired
                 FROM "${schema}".evidence_evidences
                 WHERE deleted_at IS NULL AND status NOT IN ('expired', 'archived', 'rejected')`,
              );
              const r = expiryResult.rows[0] || {};
              if ((r.already_expired || 0) > 0) {
                logger.error(`[Job] evidence-expiry-monitor: tenant ${t.tenant_id} — ${r.already_expired} evidence items past expiry date but not marked expired`);
              }
              if ((r.expiring_30d || 0) > 0) {
                logger.warn(`[Job] evidence-expiry-monitor: tenant ${t.tenant_id} — ${r.expiring_30d} expiring in 30d, ${r.expiring_60d} in 60d, ${r.expiring_90d} in 90d`);
              }
              if ((r.already_expired || 0) > 0) {
                const autoExpireResult = await safeQuery(
                  `UPDATE "${schema}".evidence_evidences
                   SET status = 'expired', updated_at = NOW()
                   WHERE deleted_at IS NULL AND status NOT IN ('expired', 'archived', 'rejected')
                     AND expires_at < NOW()`,
                );
                if (autoExpireResult.rowCount && autoExpireResult.rowCount > 0) {
                  logger.info(`[Job] evidence-expiry-monitor: tenant ${t.tenant_id} — ${autoExpireResult.rowCount} items auto-expired`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-expiry-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-collection-tracker',
      cron: '*/30 * * * *',
      description: `Track overdue evidence collection requests — SLA: ${EVIDENCE_TIMEOUTS.DEFAULT_SLA_HOURS}h`,
      handler: async () => {
        logger.info('[Job] evidence-collection-tracker started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS overdue_count,
                   COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '${EVIDENCE_SLA_DEFAULTS.high} hours')::int AS critically_overdue
                 FROM "${schema}".evidence_evidences
                 WHERE deleted_at IS NULL AND status = 'collecting'
                   AND created_at < NOW() - INTERVAL '${EVIDENCE_TIMEOUTS.DEFAULT_SLA_HOURS} hours'`,
              );
              const r = result.rows[0] || {};
              if ((r.critically_overdue || 0) > 0) {
                logger.error(`[Job] evidence-collection-tracker: tenant ${t.tenant_id} — ${r.critically_overdue} critically overdue collection requests (${EVIDENCE_SLA_DEFAULTS.high}h+ SLA breach)`);
              } else if ((r.overdue_count || 0) > 0) {
                logger.warn(`[Job] evidence-collection-tracker: tenant ${t.tenant_id} — ${r.overdue_count} overdue collection requests`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-collection-tracker error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-review-backlog-monitor',
      cron: '0 */4 * * *',
      description: 'Monitor evidence review backlog and escalate items stuck in under_review',
      handler: async () => {
        logger.info('[Job] evidence-review-backlog-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS backlog_total,
                   COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${EVIDENCE_SLA_DEFAULTS.high} hours')::int AS overdue,
                   COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${EVIDENCE_SLA_DEFAULTS.medium} hours')::int AS approaching_breach,
                   COALESCE(AVG(EXTRACT(HOUR FROM NOW() - created_at)), 0)::int AS avg_hours_in_review
                 FROM "${schema}".evidence_evidences
                 WHERE deleted_at IS NULL AND status = 'under_review'`,
              );
              const r = result.rows[0] || {};
              if ((r.overdue || 0) > 0) {
                logger.warn(`[Job] evidence-review-backlog-monitor: tenant ${t.tenant_id} — ${r.overdue} reviews overdue (${EVIDENCE_SLA_DEFAULTS.high}h+), avg ${r.avg_hours_in_review}h in queue`);
              }
              if ((r.backlog_total || 0) > EVIDENCE_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE) {
                logger.error(`[Job] evidence-review-backlog-monitor: tenant ${t.tenant_id} — review backlog critical: ${r.backlog_total} items pending`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-review-backlog-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-freshness-check',
      cron: '0 8 * * 1',
      description: `Detect stale evidence not refreshed in ${EVIDENCE_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] evidence-freshness-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS stale_count,
                   COUNT(*) FILTER (WHERE evidence_type IN ('certificate', 'attestation') AND updated_at < NOW() - INTERVAL '180 days')::int AS critical_stale,
                   COUNT(*) FILTER (WHERE evidence_type = 'config_snapshot' AND updated_at < NOW() - INTERVAL '90 days')::int AS config_stale
                 FROM "${schema}".evidence_evidences
                 WHERE deleted_at IS NULL
                   AND status = 'accepted'
                   AND updated_at < NOW() - INTERVAL '${EVIDENCE_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const r = result.rows[0] || {};
              if ((r.critical_stale || 0) > 0) {
                logger.error(`[Job] evidence-freshness-check: tenant ${t.tenant_id} — ${r.critical_stale} certificates/attestations are critically stale (180d+)`);
              }
              if ((r.stale_count || 0) > 0) {
                logger.warn(`[Job] evidence-freshness-check: tenant ${t.tenant_id} — ${r.stale_count} accepted evidence items stale (${EVIDENCE_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}d+), ${r.config_stale} stale config snapshots`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-freshness-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-compliance-coverage-report',
      cron: '0 7 1 * *',
      description: 'Monthly compliance evidence coverage report by framework and control',
      handler: async () => {
        logger.info('[Job] evidence-compliance-coverage-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COALESCE(framework, 'unassigned') AS framework,
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
                   COUNT(*) FILTER (WHERE status IN ('expired', 'rejected'))::int AS invalid,
                   COUNT(*) FILTER (WHERE status IN ('collecting', 'submitted', 'under_review'))::int AS pending,
                   COUNT(DISTINCT control_id) FILTER (WHERE control_id IS NOT NULL)::int AS controls_covered,
                   ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 2) AS coverage_pct
                 FROM "${schema}".evidence_evidences
                 WHERE deleted_at IS NULL
                 GROUP BY framework ORDER BY accepted DESC`,
              );
              for (const row of result.rows) {
                const coveragePct = Number(row.coverage_pct) || 0;
                if (coveragePct < EVIDENCE_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE) {
                  logger.warn(`[Job] evidence-compliance-coverage-report: tenant ${t.tenant_id} framework=${row.framework} coverage=${coveragePct}% (${row.accepted}/${row.total} accepted, ${row.controls_covered} controls covered)`);
                } else {
                  logger.info(`[Job] evidence-compliance-coverage-report: tenant ${t.tenant_id} framework=${row.framework} coverage=${coveragePct}% — OK`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-compliance-coverage-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive accepted evidence older than ${EVIDENCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] evidence-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".evidence_evidences
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status IN ('accepted', 'rejected', 'expired')
                   AND updated_at < NOW() - INTERVAL '${EVIDENCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] evidence-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} evidence items archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived evidence past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] evidence-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".evidence_evidences
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'evidence' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'evidence-submitted-escalation',
      cron: '0 */2 * * *',
      description: `Escalate submitted evidence not picked up for review within ${EVIDENCE_TIMEOUTS.ESCALATION_AFTER_HOURS}h`,
      handler: async () => {
        logger.info('[Job] evidence-submitted-escalation started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".evidence_evidences
                 WHERE deleted_at IS NULL AND status = 'submitted'
                   AND updated_at < NOW() - INTERVAL '${EVIDENCE_TIMEOUTS.ESCALATION_AFTER_HOURS} hours'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] evidence-submitted-escalation: tenant ${t.tenant_id} — ${count} submitted evidence items not assigned for review after ${EVIDENCE_TIMEOUTS.ESCALATION_AFTER_HOURS}h`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-submitted-escalation error:', toErrorMessage(err));
        }
      },
    },
  ];
}

