import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { GOVERNANCE_BUSINESS_THRESHOLDS, GOVERNANCE_TIMEOUTS } from '../data/governance-constants';

export async function getGovernanceJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'governance-control-coverage-monitor',
      cron: '0 7 * * 1',
      description: 'Monitor control implementation coverage by framework — flag frameworks below thresholds',
      handler: async () => {
        logger.info('[Job] governance-control-coverage-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   f.id, f.title, f.framework_type,
                   COUNT(c.id)::int AS total_controls,
                   COUNT(c.id) FILTER (WHERE c.implementation_status = 'implemented')::int AS implemented,
                   CASE WHEN COUNT(c.id) > 0
                     THEN ROUND(COUNT(c.id) FILTER (WHERE c.implementation_status = 'implemented')::numeric / COUNT(c.id)::numeric * 100, 2)
                     ELSE 0
                   END AS coverage_pct
                 FROM "${schema}".governance_frameworks f
                 LEFT JOIN "${schema}".governance_controls c ON c.framework_id = f.id AND c.deleted_at IS NULL
                 WHERE f.deleted_at IS NULL AND f.status IN ('active', 'approved')
                 GROUP BY f.id, f.title, f.framework_type
                 HAVING COUNT(c.id) > 0`,
              );
              for (const row of result.rows) {
                const pct = Number(row.coverage_pct);
                if (pct < GOVERNANCE_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE) {
                  logger.error(`[Job] governance-control-coverage-monitor: tenant ${t.tenant_id} — framework "${row.title}" (${row.framework_type}) at ${pct}% coverage — CRITICAL (threshold ${GOVERNANCE_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE}%)`);
                } else if (pct < GOVERNANCE_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE) {
                  logger.warn(`[Job] governance-control-coverage-monitor: tenant ${t.tenant_id} — framework "${row.title}" at ${pct}% coverage — WARNING (threshold ${GOVERNANCE_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE}%)`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-control-coverage-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-maturity-assessment-tracker',
      cron: '0 8 * * 1',
      description: 'Track overdue maturity assessments for active/approved frameworks',
      handler: async () => {
        logger.info('[Job] governance-maturity-assessment-tracker started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueResult = await safeQuery(
                `SELECT
                   f.id, f.title, f.framework_type,
                   latest.next_review_date,
                   EXTRACT(DAY FROM NOW() - latest.next_review_date)::int AS days_overdue
                 FROM "${schema}".governance_frameworks f
                 JOIN LATERAL (
                   SELECT next_review_date
                   FROM "${schema}".governance_maturity_assessments
                   WHERE framework_id = f.id AND deleted_at IS NULL
                   ORDER BY assessment_date DESC LIMIT 1
                 ) latest ON true
                 WHERE f.deleted_at IS NULL
                   AND f.status IN ('active', 'approved')
                   AND latest.next_review_date < NOW()
                 ORDER BY days_overdue DESC`,
              );
              if (overdueResult.rows.length > 0) {
                logger.warn(`[Job] governance-maturity-assessment-tracker: tenant ${t.tenant_id} — ${overdueResult.rows.length} frameworks with overdue assessments`);
                for (const row of overdueResult.rows) {
                  logger.warn(`  - "${row.title}" (${row.framework_type}): ${row.days_overdue} days overdue`);
                }
              }
              const neverAssessedResult = await safeQuery(
                `SELECT f.id, f.title, f.framework_type,
                   EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_since_creation
                 FROM "${schema}".governance_frameworks f
                 WHERE f.deleted_at IS NULL
                   AND f.status IN ('active', 'approved')
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".governance_maturity_assessments ma
                     WHERE ma.framework_id = f.id AND ma.deleted_at IS NULL
                   )
                   AND f.created_at < NOW() - INTERVAL '30 days'`,
              );
              if (neverAssessedResult.rows.length > 0) {
                logger.warn(`[Job] governance-maturity-assessment-tracker: tenant ${t.tenant_id} — ${neverAssessedResult.rows.length} active/approved frameworks never assessed`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-maturity-assessment-tracker error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-framework-alignment-check',
      cron: '0 9 * * 3',
      description: 'Check alignment of active frameworks against expected control coverage and maturity thresholds',
      handler: async () => {
        logger.info('[Job] governance-framework-alignment-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   f.id, f.title, f.framework_type,
                   COALESCE(latest_ma.maturity_score, 0) AS maturity_score,
                   COALESCE(latest_ma.maturity_level, 'initial') AS maturity_level,
                   COALESCE(ctrl.coverage_pct, 0) AS coverage_pct,
                   COALESCE(ctrl.total_controls, 0) AS total_controls
                 FROM "${schema}".governance_frameworks f
                 LEFT JOIN LATERAL (
                   SELECT maturity_score, maturity_level
                   FROM "${schema}".governance_maturity_assessments
                   WHERE framework_id = f.id AND deleted_at IS NULL
                   ORDER BY assessment_date DESC LIMIT 1
                 ) latest_ma ON true
                 LEFT JOIN LATERAL (
                   SELECT
                     COUNT(*)::int AS total_controls,
                     CASE WHEN COUNT(*) > 0
                       THEN ROUND(COUNT(*) FILTER (WHERE implementation_status = 'implemented')::numeric / COUNT(*)::numeric * 100, 2)
                       ELSE 0
                     END AS coverage_pct
                   FROM "${schema}".governance_controls
                   WHERE framework_id = f.id AND deleted_at IS NULL
                 ) ctrl ON true
                 WHERE f.deleted_at IS NULL AND f.status = 'active'`,
              );
              let failCount = 0;
              let passCount = 0;
              for (const row of result.rows) {
                const coveragePct = Number(row.coverage_pct);
                const maturityScore = Number(row.maturity_score);
                const aligned = coveragePct >= GOVERNANCE_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE && maturityScore >= 2.0;
                if (!aligned) {
                  failCount++;
                  logger.warn(`[Job] governance-framework-alignment-check: tenant ${t.tenant_id} — "${row.title}" MISALIGNED: coverage=${coveragePct}%, maturity=${maturityScore} (${row.maturity_level})`);
                } else {
                  passCount++;
                }
              }
              logger.info(`[Job] governance-framework-alignment-check: tenant ${t.tenant_id} — ${passCount} aligned, ${failCount} misaligned`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-framework-alignment-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-board-report-generator',
      cron: '0 6 1 1,4,7,10 *',
      description: 'Generate quarterly board governance reports with framework status, control coverage and maturity trends',
      handler: async () => {
        logger.info('[Job] governance-board-report-generator started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const [frameworkSummary, controlSummary, maturitySummary] = await Promise.all([
                safeQuery(
                  `SELECT
                     COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                     COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
                     COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated
                   FROM "${schema}".governance_frameworks WHERE deleted_at IS NULL`,
                ),
                safeQuery(
                  `SELECT
                     COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE implementation_status = 'implemented')::int AS implemented,
                     COUNT(*) FILTER (WHERE implementation_status = 'not_implemented')::int AS not_implemented,
                     CASE WHEN COUNT(*) > 0
                       THEN ROUND(COUNT(*) FILTER (WHERE implementation_status = 'implemented')::numeric / COUNT(*)::numeric * 100, 2)
                       ELSE 0
                     END AS coverage_pct
                   FROM "${schema}".governance_controls WHERE deleted_at IS NULL`,
                ),
                safeQuery(
                  `SELECT COALESCE(ROUND(AVG(maturity_score)::numeric, 2), 0) AS avg_score
                   FROM "${schema}".governance_maturity_assessments
                   WHERE deleted_at IS NULL
                     AND created_at > NOW() - INTERVAL '90 days'`,
                ),
              ]);
              const fw = frameworkSummary.rows[0] || {};
              const ctrl = controlSummary.rows[0] || {};
              const mat = maturitySummary.rows[0] || {};
              logger.info(
                `[Job] governance-board-report-generator: tenant ${t.tenant_id} — Q report: ` +
                `frameworks(total=${fw.total}, active=${fw.active}), ` +
                `controls(coverage=${ctrl.coverage_pct}%, unimplemented=${ctrl.not_implemented}), ` +
                `avgMaturity=${mat.avg_score}`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-board-report-generator error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-gap-analysis-report',
      cron: '0 5 1 * *',
      description: 'Monthly gap analysis — identify unimplemented high-risk controls across all active frameworks',
      handler: async () => {
        logger.info('[Job] governance-gap-analysis-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   f.framework_type,
                   COALESCE(c.risk_level, 'medium') AS risk_level,
                   COUNT(c.id)::int AS gap_count
                 FROM "${schema}".governance_controls c
                 JOIN "${schema}".governance_frameworks f ON f.id = c.framework_id
                 WHERE c.deleted_at IS NULL
                   AND c.implementation_status IN ('not_implemented', 'partially_implemented')
                   AND f.deleted_at IS NULL
                   AND f.status NOT IN ('deprecated', 'archived')
                 GROUP BY f.framework_type, c.risk_level
                 ORDER BY
                   CASE c.risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
              );
              if (result.rows.length > 0) {
                const criticalGaps = result.rows.filter(( r: Record<string, unknown>) => r.risk_level === 'critical').reduce((s: number, r: Record<string, unknown>) => (s as any) + r.gap_count, 0);
                const highGaps = result.rows.filter(( r: Record<string, unknown>) => r.risk_level === 'high').reduce((s: number, r: Record<string, unknown>) => (s as any) + r.gap_count, 0);
                logger.info(`[Job] governance-gap-analysis-report: tenant ${t.tenant_id} — critical gaps=${criticalGaps}, high gaps=${highGaps}`);
                if (criticalGaps > 0) {
                  logger.error(`[Job] governance-gap-analysis-report: tenant ${t.tenant_id} — ${criticalGaps} CRITICAL unimplemented controls require immediate attention`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-gap-analysis-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-stale-framework-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive deprecated frameworks not updated in ${GOVERNANCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] governance-stale-framework-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const archiveResult = await safeQuery(
                `UPDATE "${schema}".governance_frameworks
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'deprecated'
                   AND updated_at < NOW() - INTERVAL '${GOVERNANCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (archiveResult.rowCount && archiveResult.rowCount > 0) {
                logger.info(`[Job] governance-stale-framework-auto-archive: tenant ${t.tenant_id} — ${archiveResult.rowCount} deprecated frameworks archived`);
              }
              const staleActiveResult = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".governance_frameworks
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('deprecated', 'archived')
                   AND updated_at < NOW() - INTERVAL '${GOVERNANCE_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const staleCount = staleActiveResult.rows[0]?.count || 0;
              if (staleCount > 0) {
                logger.warn(`[Job] governance-stale-framework-auto-archive: tenant ${t.tenant_id} — ${staleCount} active frameworks stale for ${GOVERNANCE_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-stale-framework-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy — soft-delete archived frameworks respecting legal holds',
      handler: async () => {
        logger.info('[Job] governance-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".governance_frameworks
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'governance_framework' AND lh.active = true
                   )`,
              );
              await safeQuery(
                `UPDATE "${schema}".governance_maturity_assessments
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".governance_frameworks f
                     WHERE f.id = framework_id AND f.deleted_at IS NULL
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-data-retention error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'governance-maturity-regression-detector',
      cron: '0 8 * * 2,5',
      description: 'Detect maturity regressions between consecutive assessments — escalate on score drops',
      handler: async () => {
        logger.info('[Job] governance-maturity-regression-detector started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   f.id AS framework_id, f.title AS framework_title, f.framework_type,
                   latest.maturity_score AS current_score,
                   latest.maturity_level AS current_level,
                   prev.maturity_score AS previous_score,
                   prev.maturity_level AS previous_level,
                   (prev.maturity_score - latest.maturity_score) AS regression_delta
                 FROM "${schema}".governance_frameworks f
                 JOIN LATERAL (
                   SELECT maturity_score, maturity_level
                   FROM "${schema}".governance_maturity_assessments
                   WHERE framework_id = f.id AND deleted_at IS NULL
                   ORDER BY assessment_date DESC LIMIT 1
                 ) latest ON true
                 JOIN LATERAL (
                   SELECT maturity_score, maturity_level
                   FROM "${schema}".governance_maturity_assessments
                   WHERE framework_id = f.id AND deleted_at IS NULL
                   ORDER BY assessment_date DESC LIMIT 1 OFFSET 1
                 ) prev ON true
                 WHERE f.deleted_at IS NULL
                   AND (prev.maturity_score - latest.maturity_score) > 0.5
                 ORDER BY regression_delta DESC`,
              );
              if (result.rows.length > 0) {
                logger.error(`[Job] governance-maturity-regression-detector: tenant ${t.tenant_id} — ${result.rows.length} frameworks with significant maturity regressions`);
                for (const row of result.rows) {
                  logger.error(`  - "${row.framework_title}" (${row.framework_type}): ${row.previous_score} -> ${row.current_score} (delta -${Number(row.regression_delta).toFixed(2)})`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] governance-maturity-regression-detector error:', toErrorMessage(err));
        }
      },
    },
  ];
}

