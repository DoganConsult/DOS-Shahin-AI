import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AGRC-OS — Tool Usage Analytics Service
// Tracks and analyzes tool usage patterns
// Requirements: ai-os-8.3
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '../../ports/platform.port';

export interface ToolUsageRecord {
  tenantId: string;
  agentId?: string;
  toolId: string;
  toolVersion: string;
  runId?: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  inputSize?: number;
  outputSize?: number;
}

export interface ToolUsageStats {
  toolId: string;
  toolVersion: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  totalDurationMs: number;
  byAgent: Record<string, { calls: number; successRate: number }>;
  errorTypes: Record<string, number>;
  lastUsedAt?: Date;
}

/**
 * Record tool usage
 */
export async function recordToolUsage(record: ToolUsageRecord): Promise<void> {
  const schema = tenantSchema(record.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".tool_usage_log
     (tenant_id, agent_id, tool_id, tool_version, run_id, success,
      duration_ms, error_message, input_size, output_size, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      record.tenantId,
      record.agentId || null,
      record.toolId,
      record.toolVersion,
      record.runId || null,
      record.success,
      record.durationMs,
      record.errorMessage || null,
      record.inputSize || null,
      record.outputSize || null,
    ]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}

/**
 * Get usage statistics for a tool
 */
export async function getToolUsageStats(
  tenantId: string,
  toolId?: string,
  daysBack: number = 30
): Promise<ToolUsageStats[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [`created_at > NOW() - make_interval(days => $1)`];
  const params: unknown[] = [daysBack];
  let idx = 2;

  if (toolId) {
    conditions.push(`tool_id = $${idx++}`);
    params.push(toolId);
  }

  try {
    const result = await safeQuery(
      `SELECT 
         tool_id, tool_version,
         COUNT(*)::int AS total_calls,
         COUNT(CASE WHEN success THEN 1 END)::int AS success_count,
         COUNT(CASE WHEN NOT success THEN 1 END)::int AS failure_count,
         AVG(duration_ms)::int AS avg_duration,
         SUM(duration_ms)::int AS total_duration,
         MAX(created_at) AS last_used_at
       FROM "${schema}".tool_usage_log
       WHERE tenant_id = $${idx++} AND ${conditions.join(' AND ')}
       GROUP BY tool_id, tool_version
       ORDER BY total_calls DESC`,
      [tenantId, ...params]
    );

    const statsMap = new Map<string, ToolUsageStats>();

    for (const row of result.rows) {
      const key = `${row.tool_id}:${row.tool_version}`;
      const stats: ToolUsageStats = {
        toolId: row.tool_id,
        toolVersion: row.tool_version,
        totalCalls: row.total_calls || 0,
        successCount: row.success_count || 0,
        failureCount: row.failure_count || 0,
        successRate: row.total_calls > 0 ? (row.success_count || 0) / row.total_calls : 0,
        avgDurationMs: row.avg_duration || 0,
        totalDurationMs: row.total_duration || 0,
        byAgent: {},
        errorTypes: {},
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      };
      statsMap.set(key, stats);
    }

    // Get per-agent stats
    if (toolId) {
      const agentResult = await safeQuery(
        `SELECT agent_id, tool_id, tool_version,
                COUNT(*)::int AS calls,
                COUNT(CASE WHEN success THEN 1 END)::int AS successes
         FROM "${schema}".tool_usage_log
         WHERE tenant_id = $1 AND tool_id = $2 AND created_at > NOW() - make_interval(days => $3)
         GROUP BY agent_id, tool_id, tool_version`,
        [tenantId, toolId, daysBack]
      );

      for (const row of agentResult.rows) {
        const key = `${row.tool_id}:${row.tool_version}`;
        const stats = statsMap.get(key);
        if (stats && row.agent_id) {
          stats.byAgent[row.agent_id] = {
            calls: row.calls || 0,
            successRate: row.calls > 0 ? (row.successes || 0) / row.calls : 0,
          };
        }
      }

      // Get error types
      const errorResult = await safeQuery(
        `SELECT error_message, COUNT(*)::int AS count
         FROM "${schema}".tool_usage_log
         WHERE tenant_id = $1 AND tool_id = $2 AND NOT success
           AND created_at > NOW() - make_interval(days => $3)
           AND error_message IS NOT NULL
         GROUP BY error_message`,
        [tenantId, toolId, daysBack]
      );

      const key = `${toolId}:${statsMap.keys().next().value?.split(':')[1] || 'latest'}`;
      const stats = statsMap.get(key);
      if (stats) {
        for (const row of errorResult.rows) {
          const errorType = row.error_message?.split(':')[0] || 'any';
          stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + (row.count || 0);
        }
      }
    }

    return Array.from(statsMap.values());
  } catch {
    return [];
  }
}

/**
 * Get most used tools
 */
export async function getMostUsedTools(
  tenantId: string,
  limit: number = 10,
  daysBack: number = 30
): Promise<Array<{ toolId: string; calls: number; successRate: number }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT tool_id,
              COUNT(*)::int AS calls,
              COUNT(CASE WHEN success THEN 1 END)::real / COUNT(*)::real AS success_rate
       FROM "${schema}".tool_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY tool_id
       ORDER BY calls DESC
       LIMIT $3`,
      [tenantId, daysBack, limit]
    );

    return result.rows.map((r: GenericRow) => ({
      toolId: r.tool_id,
      calls: r.calls || 0,
      successRate: r.success_rate || 0,
    }));
  } catch {
    return [];
  }
}
