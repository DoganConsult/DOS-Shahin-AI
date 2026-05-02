import type { JobDefinition } from '@dos/platform-core/jobs';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { MCP_TIMEOUTS, MCP_BUSINESS_THRESHOLDS } from '../data/mcp-constants';

export async function getMcpJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/tenancy');

  return [
    {
      name: 'mcp-health-monitor',
      cron: '*/15 * * * *',
      description: 'Monitor MCP tool execution health and flag error rate spikes',
      handler: async () => {
        logger.info('[Job] mcp-health-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE is_error = TRUE)::int AS errors,
                   AVG(duration_ms)::int AS avg_ms
                 FROM "${schema}".mcp_tool_execution_log
                 WHERE created_at > NOW() - INTERVAL '1 hour'`,
              );
              const r = result.rows[0] || {};
              const total = r.total || 0;
              if (total > 0) {
                const errorRate = (r.errors || 0) / total;
                if (errorRate > MCP_BUSINESS_THRESHOLDS.ERROR_RATE_CRITICAL_THRESHOLD) {
                  logger.error(`[Job] mcp-health-monitor: tenant ${t.tenant_id} — error rate ${(errorRate * 100).toFixed(1)}% CRITICAL`);
                } else if (errorRate > MCP_BUSINESS_THRESHOLDS.ERROR_RATE_WARNING_THRESHOLD) {
                  logger.warn(`[Job] mcp-health-monitor: tenant ${t.tenant_id} — error rate ${(errorRate * 100).toFixed(1)}% elevated`);
                }
                if ((r.avg_ms || 0) > MCP_BUSINESS_THRESHOLDS.HIGH_LATENCY_CRITICAL_MS) {
                  logger.error(`[Job] mcp-health-monitor: tenant ${t.tenant_id} — avg latency ${r.avg_ms}ms CRITICAL`);
                }
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] mcp-health-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'mcp-approval-expiry',
      cron: '0 */2 * * *',
      description: `Expire pending approval requests older than ${MCP_TIMEOUTS.APPROVAL_EXPIRY_HOURS}h`,
      handler: async () => {
        logger.info('[Job] mcp-approval-expiry started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".mcp_tool_approval_requests
                 SET status = 'expired', updated_at = NOW()
                 WHERE status = 'pending'
                   AND created_at < NOW() - INTERVAL '${MCP_TIMEOUTS.APPROVAL_EXPIRY_HOURS} hours'
                 RETURNING request_id`,
              );
              if (result.rows.length > 0) {
                logger.info(`[Job] mcp-approval-expiry: tenant ${t.tenant_id} — expired ${result.rows.length} requests`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] mcp-approval-expiry error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'mcp-log-rotation',
      cron: '0 3 * * 0',
      description: `Purge execution logs older than ${MCP_TIMEOUTS.LOG_RETENTION_DAYS} days`,
      handler: async () => {
        logger.info('[Job] mcp-log-rotation started');
        try {
          const { safeQuery, tenantSchema } = await import('@dos/db');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `DELETE FROM "${schema}".mcp_tool_execution_log
                 WHERE created_at < NOW() - INTERVAL '${MCP_TIMEOUTS.LOG_RETENTION_DAYS} days'
                 RETURNING log_id`,
              );
              if (result.rows.length > 0) {
                logger.info(`[Job] mcp-log-rotation: tenant ${t.tenant_id} — purged ${result.rows.length} old logs`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] mcp-log-rotation error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'mcp-stale-tool-detector',
      cron: '0 6 * * 1',
      description: `Detect tools not invoked in ${MCP_BUSINESS_THRESHOLDS.STALE_TOOL_DAYS} days`,
      handler: async () => {
        logger.info('[Job] mcp-stale-tool-detector started');
        try {
          const { safeQuery } = await import('@dos/db');
          const result = await safeQuery(
            `SELECT t.tool_name, t.status, t.updated_at
             FROM public.mcp_tool_registry t
             WHERE t.status = 'active' AND t.is_enabled = TRUE
               AND NOT EXISTS (
                 SELECT 1 FROM public.mcp_tool_registry r WHERE r.tool_name = t.tool_name AND r.updated_at > NOW() - INTERVAL '${MCP_BUSINESS_THRESHOLDS.STALE_TOOL_DAYS} days'
               )`,
          );
          if (result.rows.length > 0) {
            logger.warn(`[Job] mcp-stale-tool-detector: ${result.rows.length} tools may be stale`);
          }
        } catch (err: unknown) {
          logger.error('[Job] mcp-stale-tool-detector error:', toErrorMessage(err));
        }
      },
    },
  ];
}

