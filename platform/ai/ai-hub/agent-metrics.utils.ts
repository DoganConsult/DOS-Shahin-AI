/**
 * Pure utility functions for computing agent performance metrics.
 * Exported separately for testability (Property 10).
 */

/** Raw agent performance record from the backend */
export interface AgentPerformanceRecord {
  agent_id: string;
  tool_name: string;
  tenant_id?: string;
  duration_ms: number;
  success: boolean;
  error_message?: string | null;
  executed_at: string;
}

/** Computed per-agent metrics */
export interface AgentMetrics {
  agentId: string;
  successRate: number;
  avgResponseTime: number;
  totalExecutions: number;
}

/**
 * Extracts per-agent metrics from raw performance records.
 *
 * For each distinct agent_id in the input:
 * - successRate: percentage of successful executions (0–100)
 * - avgResponseTime: mean duration_ms across all executions
 * - totalExecutions: count of records for that agent
 *
 * Returns an array sorted by agentId ascending.
 * Returns an empty array if input is empty or nullish.
 */
export function extractAgentMetrics(records: AgentPerformanceRecord[]): AgentMetrics[] {
  if (!records || records.length === 0) return [];

  const grouped = new Map<string, { totalDuration: number; successCount: number; total: number }>();

  for (const rec of records) {
    const id = rec.agent_id;
    if (!grouped.has(id)) {
      grouped.set(id, { totalDuration: 0, successCount: 0, total: 0 });
    }
    const entry = grouped.get(id)!;
    entry.total++;
    entry.totalDuration += rec.duration_ms;
    if (rec.success) entry.successCount++;
  }

  const metrics: AgentMetrics[] = [];
  for (const [agentId, data] of grouped) {
    metrics.push({
      agentId,
      successRate: data.total > 0 ? Math.round((data.successCount / data.total) * 10000) / 100 : 0,
      avgResponseTime: data.total > 0 ? Math.round(data.totalDuration / data.total) : 0,
      totalExecutions: data.total,
    });
  }

  return metrics.sort((a, b) => a.agentId.localeCompare(b.agentId));
}
