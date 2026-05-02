import { JobDefinition } from '../ports/jobs.port';
import type { ProvisionedTenant } from '@dos/platform-core/jobs';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { ANALYTICS_BUSINESS_THRESHOLDS, ANALYTICS_TIMEOUTS } from '../data/analytics-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

async function loadProvisionedTenants(): Promise<ProvisionedTenant[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');
  return getProvisionedTenants();
}

export async function getAnalyticsJobs(): Promise<JobDefinition[]> {
  return [
    {
      name: 'analytics-widget-refresh-check',
      cron: `*/${ANALYTICS_TIMEOUTS.CACHE_TTL_MINUTES} * * * *`,
      description: 'Flag widgets whose data exceeds the refresh warning threshold and emit refresh-failed events',
      handler: async () => {
        logger.info('[Job] analytics-widget-refresh-check executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { emitWidgetRefreshFailed } = await import('../services/analytics/analytics-event.service.js');
          const tenants = await loadProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".analytics_widgets
                 SET refresh_failed = true, updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND refresh_failed = false
                   AND last_refreshed_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS} hours'
                 RETURNING id, title, data_source`,
              ).catch(() => ({ rows: [], rowCount: 0 }));
              for (const w of result.rows) {
                emitWidgetRefreshFailed(t.tenant_id, w.id, 'system', {
                  errorMessage: `Widget not refreshed in ${ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS}h`,
                  dataSource: w.data_source,
                });
              }
              if ((result.rowCount ?? 0) > 0) {
                logger.warn(`[Job] analytics-widget-refresh-check: tenant ${t.tenant_id} -- ${result.rowCount} widgets flagged as stale`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-widget-refresh-check error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'analytics-stale-dashboard-detector',
      cron: '0 6 * * *',
      description: `Detect and deprecate dashboards not updated in ${ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days`,
      handler: async () => {
        logger.info('[Job] analytics-stale-dashboard-detector executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { emitAnalyticsStatusChange } = await import('../services/analytics/analytics-event.service.js');
          const tenants = await loadProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".analytics_dashboards
                 SET status = 'deprecated', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status IN ('active', 'published')
                   AND updated_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days'
                 RETURNING id`,
              ).catch(() => ({ rows: [], rowCount: 0 }));
              for (const d of result.rows) {
                emitAnalyticsStatusChange(t.tenant_id, 'dashboard', d.id, 'active', 'deprecated', 'system');
              }
              if ((result.rowCount ?? 0) > 0) {
                logger.info(`[Job] analytics-stale-dashboard-detector: tenant ${t.tenant_id} -- ${result.rowCount} dashboards deprecated`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-stale-dashboard-detector error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'analytics-kpi-threshold-monitor',
      cron: '0 */4 * * *',
      description: 'Evaluate KPI snapshot values against defined thresholds and emit breach events',
      handler: async () => {
        logger.info('[Job] analytics-kpi-threshold-monitor executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { emitKpiThresholdBreached, emitKpiTargetMet } = await import('../services/analytics/analytics-event.service.js');
          const tenants = await loadProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const breached = await safeQuery(
                `SELECT ks.snapshot_id, ks.metric_code, ks.value, kt.threshold_value, kt.target_value, kt.id AS threshold_id
                 FROM "${schema}".analytics_kpi_snapshots ks
                 JOIN "${schema}".analytics_kpi_thresholds kt ON kt.metric_code = ks.metric_code
                 WHERE ks.deleted_at IS NULL AND kt.deleted_at IS NULL
                   AND ks.computed_at > NOW() - INTERVAL '4 hours'
                   AND (
                     (kt.direction = 'below' AND ks.value < kt.threshold_value)
                     OR (kt.direction = 'above' AND ks.value > kt.threshold_value)
                   )`,
              ).catch(() => ({ rows: [] }));
              for (const row of breached.rows) {
                emitKpiThresholdBreached(t.tenant_id, row.threshold_id, 'system', {
                  metricCode: row.metric_code,
                  currentValue: Number(row.value),
                  threshold: Number(row.threshold_value),
                });
              }
              const targetsMet = await safeQuery(
                `SELECT ks.snapshot_id, ks.metric_code, ks.value, ks.period, kt.target_value, kt.id AS threshold_id
                 FROM "${schema}".analytics_kpi_snapshots ks
                 JOIN "${schema}".analytics_kpi_thresholds kt ON kt.metric_code = ks.metric_code
                 WHERE ks.deleted_at IS NULL AND kt.deleted_at IS NULL
                   AND ks.computed_at > NOW() - INTERVAL '4 hours'
                   AND kt.target_value IS NOT NULL
                   AND (
                     (kt.direction = 'above' AND ks.value >= kt.target_value)
                     OR (kt.direction = 'below' AND ks.value <= kt.target_value)
                   )`,
              ).catch(() => ({ rows: [] }));
              for (const row of targetsMet.rows) {
                emitKpiTargetMet(t.tenant_id, row.threshold_id, 'system', {
                  metricCode: row.metric_code,
                  currentValue: Number(row.value),
                  target: Number(row.target_value),
                  period: row.period,
                });
              }
              if (breached.rows.length > 0 || targetsMet.rows.length > 0) {
                logger.info(`[Job] analytics-kpi-threshold-monitor: tenant ${t.tenant_id} -- ${breached.rows.length} breaches, ${targetsMet.rows.length} targets met`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-kpi-threshold-monitor error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'analytics-dashboard-usage-report',
      cron: '0 8 * * 1',
      description: 'Generate weekly dashboard usage summary and identify low-engagement dashboards',
      handler: async () => {
        logger.info('[Job] analytics-dashboard-usage-report executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await loadProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total_published,
                   COUNT(*) FILTER (WHERE view_count = 0 OR view_count IS NULL)::int AS zero_views,
                   COUNT(*) FILTER (WHERE last_viewed_at < NOW() - INTERVAL '14 days' OR last_viewed_at IS NULL)::int AS inactive_14d,
                   COALESCE(AVG(view_count)::int, 0) AS avg_views
                 FROM "${schema}".analytics_dashboards
                 WHERE deleted_at IS NULL AND status = 'published'`,
              ).catch(() => ({ rows: [{}] }));
              const r = result.rows[0] || {};

              if ((r.zero_views || 0) > 0 || (r.inactive_14d || 0) > 0) {

                logger.warn(`[Job] analytics-dashboard-usage-report: tenant ${t.tenant_id} -- ${r.zero_views} zero-view, ${r.inactive_14d} inactive-14d out of ${r.total_published} published dashboards`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-dashboard-usage-report error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'analytics-kpi-recalculate',
      cron: '0 2 * * *',
      description: 'Recompute daily KPI snapshots for all active metric definitions across tenants',
      handler: async () => {
        logger.info('[Job] analytics-kpi-recalculate executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { emitKpiRecalculated } = await import('../services/analytics/analytics-event.service.js');
          const tenants = await loadProvisionedTenants();
          const today = new Date().toISOString().slice(0, 10);
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const defs = await safeQuery(
                `SELECT metric_code, module_code, query_template FROM "${schema}".analytics_kpi_definitions WHERE deleted_at IS NULL AND enabled = true`,
              ).catch(() => ({ rows: [] }));
              for (const def of defs.rows) {
                try {
                  const prev = await safeQuery(
                    `SELECT value FROM "${schema}".analytics_kpi_snapshots WHERE metric_code = $1 AND period = $2 AND deleted_at IS NULL ORDER BY computed_at DESC LIMIT 1`,
                    [def.metric_code, today],
                  ).catch(() => ({ rows: [] }));
                  const snapshot = await safeQuery(
                    `INSERT INTO "${schema}".analytics_kpi_snapshots (snapshot_id, tenant_id, metric_code, module_code, value, period, computed_at, created_at, updated_at, created_by)
                     SELECT gen_random_uuid(), $1, $2, $3,
                       (${def.query_template || '0'}),
                       $4, NOW(), NOW(), NOW(), 'system'
                     ON CONFLICT (metric_code, period, tenant_id) DO UPDATE SET value = EXCLUDED.value, computed_at = NOW(), updated_at = NOW()
                     RETURNING snapshot_id, value`,
                    [t.tenant_id, def.metric_code, def.module_code, today],
                  ).catch(() => ({ rows: [] }));
                  if (snapshot.rows[0]) {
                    emitKpiRecalculated(t.tenant_id, snapshot.rows[0].snapshot_id, 'system', {
                      metricCode: def.metric_code,
                      previousValue: prev.rows[0] ? Number(prev.rows[0].value) : undefined,
                      newValue: Number(snapshot.rows[0].value),
                      period: today,
                    });
                  }
                } catch { /* skip individual KPI errors */ }
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-kpi-recalculate error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'analytics-auto-archive',
      cron: '0 1 * * 0',
      description: `Auto-archive deprecated dashboards not updated in ${ANALYTICS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] analytics-auto-archive executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const { emitAnalyticsStatusChange } = await import('../services/analytics/analytics-event.service.js');
          const tenants = await loadProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".analytics_dashboards
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'deprecated'
                   AND updated_at < NOW() - INTERVAL '${ANALYTICS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'
                 RETURNING id`,
              ).catch(() => ({ rows: [], rowCount: 0 }));
              for (const d of result.rows) {
                emitAnalyticsStatusChange(t.tenant_id, 'dashboard', d.id, 'deprecated', 'archived', 'system');
              }
              if ((result.rowCount ?? 0) > 0) {
                logger.info(`[Job] analytics-auto-archive: tenant ${t.tenant_id} -- ${result.rowCount} dashboards archived`);
              }
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-auto-archive error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'analytics-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention policy: soft-delete archived dashboards past the 7-year retention window',
      handler: async () => {
        logger.info('[Job] analytics-data-retention executed');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await loadProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".analytics_dashboards
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id AND lh.entity_type = 'analytics' AND lh.active = true
                   )`,
              ).catch(catchHandler(EC.EVENT_BUS));
              await safeQuery(
                `DELETE FROM "${schema}".analytics_kpi_snapshots
                 WHERE deleted_at IS NULL
                   AND computed_at < NOW() - INTERVAL '730 days'`,
              ).catch(catchHandler(EC.EVENT_BUS));
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] analytics-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}

