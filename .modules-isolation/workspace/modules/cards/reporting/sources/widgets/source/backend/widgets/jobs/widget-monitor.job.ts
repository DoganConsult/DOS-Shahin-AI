/**
 * Widget Monitor Jobs -- Background Health, Freshness, and Cleanup Tasks
 * =======================================================================
 * Provides scheduled background jobs for widget ecosystem health monitoring,
 * data freshness detection, stale widget identification, and orphan cleanup.
 *
 * Follows the pattern from `modules/provisioning/jobs/provisioning-monitor.job.ts`.
 *
 * @owner widgets
 * @module widgets
 * @since 2026-03-31
 */

import { JobDefinition } from '../ports/jobs.port';
import { logger } from '../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// Default configuration constants
const DEFAULT_STALE_DRAFT_DAYS = 30;
const DEFAULT_STALE_DATA_HOURS = 24;
const DEFAULT_RENDER_LOG_RETENTION_DAYS = 90;

/**
 * Monitor widget health for a single tenant.
 * Checks for stale drafts, suspended widgets, high render error rates,
 * and widgets with no recent renders despite being published.
 */
export async function monitorWidgetHealth(tenantId: string): Promise<{
  staleDrafts: number;
  suspendedWidgets: number;
  highErrorWidgets: number;
  stalePublished: number;
  actionsPerformed: string[];
}> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(tenantId);
  const actionsPerformed: string[] = [];

  // 1. Detect stale draft widgets (draft for >30 days)
  const staleResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".widgets_registry
     WHERE status = 'draft'
       AND deleted_at IS NULL
       AND created_at < NOW() - INTERVAL '${DEFAULT_STALE_DRAFT_DAYS} days'`,
  ).catch(() => ({ rows: [{ count: 0 }] }));
  const staleDrafts = parseInt(staleResult.rows[0]?.count ?? '0', 10);

  if (staleDrafts > 0) {
    actionsPerformed.push(`Detected ${staleDrafts} stale draft widget(s) older than ${DEFAULT_STALE_DRAFT_DAYS} days`);
  }

  // 2. Detect suspended widgets
  const suspendedResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".widgets_registry
     WHERE status = 'suspended'
       AND deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ count: 0 }] }));
  const suspendedWidgets = parseInt(suspendedResult.rows[0]?.count ?? '0', 10);

  if (suspendedWidgets > 0) {
    actionsPerformed.push(`Detected ${suspendedWidgets} suspended widget(s) requiring attention`);
  }

  // 3. Detect widgets with high error rates (>10% in last 24h)
  const errorResult = await safeQuery(
    `SELECT COUNT(DISTINCT widget_key)::int AS count
     FROM (
       SELECT
         widget_key,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE NOT success) AS failed
       FROM "${schema}".widgets_render_log
       WHERE rendered_at > NOW() - INTERVAL '24 hours'
       GROUP BY widget_key
       HAVING COUNT(*) > 5
         AND (COUNT(*) FILTER (WHERE NOT success)::numeric / COUNT(*)) > 0.1
     ) sub`,
  ).catch(() => ({ rows: [{ count: 0 }] }));
  const highErrorWidgets = parseInt(errorResult.rows[0]?.count ?? '0', 10);

  if (highErrorWidgets > 0) {
    actionsPerformed.push(`Detected ${highErrorWidgets} widget(s) with >10% error rate in last 24h`);
  }

  // 4. Detect published widgets with no renders in 24 hours (stale data)
  const stalePublishedResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".widgets_registry w
     WHERE w.status = 'published'
       AND w.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".widgets_render_log r
         WHERE r.widget_key = w.widget_key
           AND r.rendered_at > NOW() - INTERVAL '${DEFAULT_STALE_DATA_HOURS} hours'
       )`,
  ).catch(() => ({ rows: [{ count: 0 }] }));
  const stalePublished = parseInt(stalePublishedResult.rows[0]?.count ?? '0', 10);

  if (stalePublished > 0) {
    actionsPerformed.push(`Detected ${stalePublished} published widget(s) with no renders in ${DEFAULT_STALE_DATA_HOURS}h`);
  }

  if (actionsPerformed.length > 0) {
    logger.warn('[Job] widget-health-monitor: issues detected', {
      tenantId, staleDrafts, suspendedWidgets, highErrorWidgets, stalePublished,
    });
  }

  return { staleDrafts, suspendedWidgets, highErrorWidgets, stalePublished, actionsPerformed };
}

/**
 * Check data freshness for all published widgets by examining render log
 * timestamps. Widgets that have not been rendered within the freshness
 * threshold are logged as stale.
 */
export async function checkDataFreshness(tenantId: string): Promise<{
  freshWidgets: number;
  staleWidgets: number;
}> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE EXISTS (
           SELECT 1 FROM "${schema}".widgets_render_log r
           WHERE r.widget_key = w.widget_key
             AND r.rendered_at > NOW() - INTERVAL '${DEFAULT_STALE_DATA_HOURS} hours'
             AND r.success = true
         )
       )::int AS fresh
     FROM "${schema}".widgets_registry w
     WHERE w.status = 'published'
       AND w.deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, fresh: 0 }] }));

  const total = parseInt(result.rows[0]?.total ?? '0', 10);
  const fresh = parseInt(result.rows[0]?.fresh ?? '0', 10);
  const stale = total - fresh;

  if (stale > 0) {
    logger.info('[Job] widget-data-freshness: stale widgets detected', {
      tenantId, freshWidgets: fresh, staleWidgets: stale,
    });
  }

  return { freshWidgets: fresh, staleWidgets: stale };
}

/**
 * Clean up old render log entries beyond the retention period.
 * Prevents the render log table from growing indefinitely.
 */
export async function cleanupRenderLogs(
  tenantId: string,
  retentionDays: number = DEFAULT_RENDER_LOG_RETENTION_DAYS,
): Promise<{ purgedCount: number }> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(tenantId);

  const purgeResult = await safeQuery(
    `DELETE FROM "${schema}".widgets_render_log
     WHERE rendered_at < NOW() - ($1::int || ' days')::interval
     RETURNING log_id`,
    [retentionDays],
  ).catch(() => ({ rows: [] }));

  const purgedCount = purgeResult.rows.length;

  if (purgedCount > 0) {
    logger.info('[Job] widget-render-log-cleanup: purged old entries', {
      tenantId, purgedCount, retentionDays,
    });
  }

  return { purgedCount };
}

/**
 * Clean up orphaned widget bundles -- bundles that reference widget IDs
 * which no longer exist in the registry.
 */
export async function cleanupOrphanedBundles(tenantId: string): Promise<{ orphanedCount: number }> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(tenantId);

  // Find bundles where all referenced widgets have been deleted
  const orphanResult = await safeQuery(
    `SELECT b.bundle_id
     FROM "${schema}".widgets_bundles b
     WHERE b.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1
         FROM "${schema}".widgets_registry w
         WHERE w.widget_id = ANY(
           SELECT jsonb_array_elements_text(b.widget_ids)::uuid
         )
         AND w.deleted_at IS NULL
       )`,
  ).catch(() => ({ rows: [] }));

  const orphanedCount = orphanResult.rows.length;

  if (orphanedCount > 0) {
    // Soft-delete orphaned bundles
    const bundleIds = orphanResult.rows.map(( r: Record<string, unknown>) => r.bundle_id);
    for (const bundleId of bundleIds) {
      await safeQuery(
        `UPDATE "${schema}".widgets_bundles
         SET deleted_at = NOW(), status = 'archived'
         WHERE bundle_id = $1 AND deleted_at IS NULL`,
        [bundleId],
      ).catch(catchHandler(EC.DB_CLEANUP, ({
        tenantId,
        operation: 'widgets:archive-orphan-bundle',
        bundleId,
      }) as any));
    }

    logger.info('[Job] widget-orphan-cleanup: archived orphaned bundles', {
      tenantId, orphanedCount,
    });
  }

  return { orphanedCount };
}

/**
 * Factory function returning all widget background job definitions.
 * Follows the pattern from `modules/provisioning/jobs/provisioning-monitor.job.ts`.
 */
export async function getWidgetJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'widget-health-monitor',
      cron: '0 */4 * * *', // Every 4 hours
      description: 'Monitor widget health: stale drafts, suspended widgets, error rates, data freshness',
      handler: async () => {
        logger.info('[Job] widget-health-monitor executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await monitorWidgetHealth(t.tenant_id);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] widget-health-monitor error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'widget-data-freshness',
      cron: '0 */2 * * *', // Every 2 hours
      description: 'Check data freshness for published widgets and flag stale ones',
      handler: async () => {
        logger.info('[Job] widget-data-freshness executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await checkDataFreshness(t.tenant_id);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] widget-data-freshness error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'widget-render-log-cleanup',
      cron: '0 3 * * *', // Daily at 3 AM
      description: `Purge widget render log entries older than ${DEFAULT_RENDER_LOG_RETENTION_DAYS} days`,
      handler: async () => {
        logger.info('[Job] widget-render-log-cleanup executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await cleanupRenderLogs(t.tenant_id, DEFAULT_RENDER_LOG_RETENTION_DAYS);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] widget-render-log-cleanup error:', toErrorMessage(err));
        }
      },
    },

    {
      name: 'widget-orphan-cleanup',
      cron: '0 5 * * 0', // Weekly on Sunday at 5 AM
      description: 'Clean up orphaned widget bundles referencing deleted widgets',
      handler: async () => {
        logger.info('[Job] widget-orphan-cleanup executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await cleanupOrphanedBundles(t.tenant_id);
            } catch { /* tenant schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] widget-orphan-cleanup error:', toErrorMessage(err));
        }
      },
    },
  ];
}

