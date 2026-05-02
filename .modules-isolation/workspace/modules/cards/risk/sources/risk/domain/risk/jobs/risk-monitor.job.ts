import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { RISK_TIMEOUTS, RISK_BUSINESS_THRESHOLDS as _RISK_BUSINESS_THRESHOLDS } from '../data/risk-constants';
import { safeQuery, tenantSchema } from '../ports/database.port';

const REASSESSMENT_INTERVAL_DAYS = 90;
const STALE_ARCHIVE_DAYS = RISK_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS;
const DATA_RETENTION_DAYS = 2555;
const DEFAULT_APPETITE_SCORE = 12;

export async function getRiskJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'risk-kri-threshold-monitor',
      cron: '0 */4 * * *',
      description: 'Monitor KRI values against warning and breach thresholds; emit events on breaches',
      handler: async () => {
        logger.info('[Job] risk-kri-threshold-monitor executed');
        try {
          const { emitKriThresholdBreached, emitKriThresholdWarning } = await import('../services/integration/risk-event.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const criticalUntreated = await safeQuery(`
                SELECT id, title, COALESCE(risk_score, likelihood * impact) AS score
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND (likelihood * impact) >= 20
                  AND treatment_status IS NULL
                  AND status NOT IN ('closed', 'archived', 'accepted')
              `);
              const criticalCount = criticalUntreated.rows.length;
              if (criticalCount >= 5) {
                emitKriThresholdBreached(t.tenant_id, 'critical_untreated_count', 'Critical Untreated Risks', criticalCount, 5, 'operational', 'system');
                logger.warn(`[Job] risk-kri-threshold-monitor: tenant ${t.tenant_id} -- ${criticalCount} critical untreated risks (BREACH)`);
              } else if (criticalCount >= 2) {
                emitKriThresholdWarning(t.tenant_id, 'critical_untreated_count', 'Critical Untreated Risks', criticalCount, 2, 'system');
                logger.warn(`[Job] risk-kri-threshold-monitor: tenant ${t.tenant_id} -- ${criticalCount} critical untreated risks (WARNING)`);
              }

              const residualResult = await safeQuery(`
                SELECT COALESCE(AVG(residual_score), 0)::numeric(5,2) AS avg_residual
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND residual_score IS NOT NULL
                  AND status NOT IN ('closed', 'archived')
              `);
              const avgResidual = Number(residualResult.rows[0]?.avg_residual || 0);
              if (avgResidual >= 16) {
                emitKriThresholdBreached(t.tenant_id, 'avg_residual_score', 'Average Residual Score', avgResidual, 16, 'risk', 'system');
              } else if (avgResidual >= 12) {
                emitKriThresholdWarning(t.tenant_id, 'avg_residual_score', 'Average Residual Score', avgResidual, 12, 'system');
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-kri-threshold-monitor error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'risk-reassessment-tracker',
      cron: '0 8 * * *',
      description: 'Identify risks due or overdue for periodic reassessment and emit events',
      handler: async () => {
        logger.info('[Job] risk-reassessment-tracker executed');
        try {
          const { emitReassessmentDue, emitReassessmentOverdue } = await import('../services/integration/risk-event.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              // secrets-scan-allow: schema tenantSchema()-validated; no user input in template
              const overdueResult = await safeQuery(`
                SELECT id, title,
                  COALESCE(risk_score, likelihood * impact) AS risk_score,
                  last_assessed_at,
                  EXTRACT(DAY FROM NOW() - last_assessed_at)::int AS days_since_assessment
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND status NOT IN ('closed', 'archived')
                  AND last_assessed_at < NOW() - INTERVAL '${REASSESSMENT_INTERVAL_DAYS + 14} days'
              `);
              for (const row of overdueResult.rows) {
                emitReassessmentOverdue(t.tenant_id, row.id, row.days_since_assessment - REASSESSMENT_INTERVAL_DAYS, row.risk_score, 'system');
              }

              // secrets-scan-allow: schema tenantSchema()-validated; no user input in template
              const dueResult = await safeQuery(`
                SELECT id, title, last_assessed_at,
                  EXTRACT(DAY FROM NOW() - last_assessed_at)::int AS days_since_assessment
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND status NOT IN ('closed', 'archived')
                  AND last_assessed_at BETWEEN NOW() - INTERVAL '${REASSESSMENT_INTERVAL_DAYS + 14} days'
                    AND NOW() - INTERVAL '${REASSESSMENT_INTERVAL_DAYS} days'
              `);
              for (const row of dueResult.rows) {
                emitReassessmentDue(t.tenant_id, row.id, row.last_assessed_at, row.days_since_assessment, 'system');
              }

              if (overdueResult.rows.length > 0 || dueResult.rows.length > 0) {
                logger.info(`[Job] risk-reassessment-tracker: tenant ${t.tenant_id} -- ${overdueResult.rows.length} overdue, ${dueResult.rows.length} due`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-reassessment-tracker error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'risk-treatment-deadline-check',
      cron: '0 9 * * *',
      description: 'Check treatment plan due dates and escalate overdue treatments',
      handler: async () => {
        logger.info('[Job] risk-treatment-deadline-check executed');
        try {
          const { emitTreatmentOverdue } = await import('../services/integration/risk-event.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const overdueResult = await safeQuery(`
                SELECT id, title, treatment_due_date, treatment_type,
                  EXTRACT(DAY FROM NOW() - treatment_due_date)::int AS days_overdue
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND treatment_status IN ('planned', 'in_progress')
                  AND treatment_due_date IS NOT NULL
                  AND treatment_due_date < NOW()
                  AND status NOT IN ('closed', 'archived', 'accepted')
              `);
              for (const row of overdueResult.rows) {
                emitTreatmentOverdue(t.tenant_id, row.id, row.treatment_due_date, row.days_overdue, 'system');
              }
              if (overdueResult.rows.length > 0) {
                logger.warn(`[Job] risk-treatment-deadline-check: tenant ${t.tenant_id} -- ${overdueResult.rows.length} overdue treatments`);
              }

              const warningResult = await safeQuery(`
                SELECT COUNT(*)::int AS count
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND treatment_status IN ('planned', 'in_progress')
                  AND treatment_due_date BETWEEN NOW() AND NOW() + INTERVAL '${RISK_TIMEOUTS.REMINDER_BEFORE_HOURS} hours'
                  AND status NOT IN ('closed', 'archived', 'accepted')
              `);
              if ((warningResult.rows[0]?.count || 0) > 0) {
                logger.info(`[Job] risk-treatment-deadline-check: tenant ${t.tenant_id} -- ${warningResult.rows[0].count} treatments due soon`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-treatment-deadline-check error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'risk-appetite-breach-monitor',
      cron: '0 7 * * *',
      description: 'Detect risks exceeding the configured risk appetite threshold and alert',
      handler: async () => {
        logger.info('[Job] risk-appetite-breach-monitor executed');
        try {
          const { emitAppetiteExceeded } = await import('../services/integration/risk-event.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const appetiteResult = await safeQuery(`
                SELECT config_value
                FROM "${schema}".module_configs
                WHERE module_code = 'risk' AND config_key = 'riskAppetiteScore' AND tenant_id = $1
              `, [t.tenant_id]);
              const appetiteScore = Number(appetiteResult.rows[0]?.config_value) || DEFAULT_APPETITE_SCORE;

              const breachResult = await safeQuery(`
                SELECT id, title, category,
                  COALESCE(risk_score, likelihood * impact) AS risk_score
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
                  AND COALESCE(risk_score, likelihood * impact) > $1
                  AND status NOT IN ('closed', 'archived', 'accepted')
              `, [appetiteScore]);

              for (const row of breachResult.rows) {
                emitAppetiteExceeded(t.tenant_id, row.id, row.risk_score, appetiteScore, row.category || 'uncategorized', 'system');
              }
              if (breachResult.rows.length > 0) {
                logger.warn(`[Job] risk-appetite-breach-monitor: tenant ${t.tenant_id} -- ${breachResult.rows.length} risks exceeding appetite (threshold: ${appetiteScore})`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-appetite-breach-monitor error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'risk-trend-report',
      cron: '0 6 * * 1',
      description: 'Generate weekly risk trend summary: new risks, score changes, treatment progress',
      handler: async () => {
        logger.info('[Job] risk-trend-report executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const trendResult = await safeQuery(`
                SELECT
                  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_this_week,
                  COUNT(*) FILTER (WHERE status IN ('closed', 'archived') AND updated_at >= NOW() - INTERVAL '7 days')::int AS closed_this_week,
                  COUNT(*) FILTER (WHERE treatment_status = 'completed' AND updated_at >= NOW() - INTERVAL '7 days')::int AS treatments_completed_this_week,
                  COUNT(*) FILTER (WHERE (likelihood * impact) >= 20 AND status NOT IN ('closed', 'archived'))::int AS open_critical,
                  COUNT(*) FILTER (WHERE treatment_status IS NULL AND status NOT IN ('closed', 'archived', 'accepted'))::int AS untreated_total,
                  COALESCE(AVG(COALESCE(residual_score, likelihood * impact)) FILTER (WHERE status NOT IN ('closed', 'archived')), 0)::numeric(5,2) AS avg_score
                FROM "${schema}".risk_risks
                WHERE deleted_at IS NULL
              `);
              const row = trendResult.rows[0] || {};
              logger.info(
                `[Job] risk-trend-report: tenant ${t.tenant_id} -- ` +
                `new=${row.new_this_week} closed=${row.closed_this_week} ` +
                `treatments_done=${row.treatments_completed_this_week} ` +
                `open_critical=${row.open_critical} untreated=${row.untreated_total} ` +
                `avg_score=${row.avg_score}`,
              );
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-trend-report error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'risk-stale-auto-archive',
      cron: '0 10 * * 1',
      description: `Auto-archive risks inactive for ${STALE_ARCHIVE_DAYS} days; respect legal holds`,
      handler: async () => {
        logger.info('[Job] risk-stale-auto-archive executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".risk_risks
                SET status = 'archived', updated_at = NOW()
                WHERE deleted_at IS NULL
                  AND status NOT IN ('closed', 'archived')
                  AND updated_at < NOW() - INTERVAL '${STALE_ARCHIVE_DAYS} days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id AND lh.entity_type = 'risk' AND lh.active = true
                  )
              `);
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] risk-stale-auto-archive: tenant ${t.tenant_id} -- ${result.rowCount} risks auto-archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-stale-auto-archive error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'risk-data-retention',
      cron: '0 0 1 * *',
      description: `Enforce data retention policy: soft-delete archived risks older than ${DATA_RETENTION_DAYS} days`,
      handler: async () => {
        logger.info('[Job] risk-data-retention executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(`
                UPDATE "${schema}".risk_risks
                SET deleted_at = NOW()
                WHERE deleted_at IS NULL
                  AND status = 'archived'
                  AND updated_at < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'
                  AND NOT EXISTS (
                    SELECT 1 FROM "${schema}".legal_holds lh
                    WHERE lh.entity_id = id AND lh.entity_type = 'risk' AND lh.active = true
                  )
              `);
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] risk-data-retention: tenant ${t.tenant_id} -- ${result.rowCount} risks soft-deleted`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] risk-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

