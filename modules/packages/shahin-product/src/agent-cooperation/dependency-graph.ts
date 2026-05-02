import { logger } from '@dos/platform-core/observability';
// ============================================
// AGRC-OS — Agent Dependency Graph
// Static and runtime dependency configuration
// controlling execution order and parallelism.
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// ── Agent Dependency Graph (Default/Static) ─────────────────────────────────
// Default execution order and data flow between agents
// Can be overridden per-tenant via agent_dependency_config table

export const AGENT_DEPENDENCY_GRAPH: Record<string, {
  dependsOn: string[];
  feedsInto: string[];
  priority: number;
  canParallelWith: string[];
}> = {
  A01: { dependsOn: [],             feedsInto: ['A03', 'A04'], priority: 1, canParallelWith: ['A02'] },
  A02: { dependsOn: [],             feedsInto: ['A04', 'A05'], priority: 1, canParallelWith: ['A01'] },
  A03: { dependsOn: ['A01'],        feedsInto: ['A04', 'A06'], priority: 2, canParallelWith: ['A05', 'A09'] },
  A04: { dependsOn: ['A01', 'A03'], feedsInto: ['A05', 'A06'], priority: 3, canParallelWith: [] },
  A05: { dependsOn: ['A02', 'A04'], feedsInto: ['A06', 'A10'], priority: 4, canParallelWith: ['A07', 'A08', 'A09'] },
  A06: { dependsOn: ['A03', 'A04'], feedsInto: ['A07', 'A10'], priority: 4, canParallelWith: ['A05', 'A08', 'A09'] },
  A07: { dependsOn: [],             feedsInto: ['A06', 'A10'], priority: 2, canParallelWith: ['A03', 'A05', 'A08', 'A09'] },
  A08: { dependsOn: [],             feedsInto: ['A06', 'A10'], priority: 2, canParallelWith: ['A03', 'A05', 'A07', 'A09'] },
  A09: { dependsOn: [],             feedsInto: ['A03', 'A05', 'A06', 'A07', 'A10'], priority: 2, canParallelWith: ['A08'] },
  A10: { dependsOn: ['A05', 'A06'], feedsInto: [],             priority: 5, canParallelWith: [] },
  A11: { dependsOn: [],             feedsInto: ['A07', 'A10'], priority: 2, canParallelWith: ['A03', 'A07', 'A08', 'A09', 'A12'] },
  A12: { dependsOn: ['A02'],        feedsInto: ['A06', 'A10'], priority: 3, canParallelWith: ['A05', 'A07', 'A08', 'A09', 'A11'] },
};

// ── Runtime Dependency Resolution ───────────────────────────────────────────

/**
 * Get agent dependency configuration (runtime or default)
 * Requirements: 3.1 Dynamic Dependency Resolution
 */
export async function getAgentDependencyConfig(
  tenantId: string,
  agentId: string,
): Promise<{
  dependsOn: string[];
  feedsInto: string[];
  priority: number;
  canParallelWith: string[];
}> {
  const schema = tenantSchema(tenantId);
  const now = new Date();

  try {
    // Get most recent active config for this agent
    const result = await safeQuery(
      `SELECT depends_on_agents, feeds_into_agents, priority, can_parallel_with
       FROM "${schema}".agent_dependency_config
       WHERE tenant_id = $1 AND agent_id = $2
         AND enabled = TRUE
         AND effective_from <= $3
         AND (effective_until IS NULL OR effective_until >= $3)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [tenantId, agentId, now],
    );

    if (result.rows.length > 0) {
      const row = getFirstRow(result);
      return {
        dependsOn: (row.depends_on_agents || []) as string[],
        feedsInto: (row.feeds_into_agents || []) as string[],
        priority: row.priority || 1,
        canParallelWith: (row.can_parallel_with || []) as string[],
      };
    }
  } catch (err: unknown) {
    logger.warn(
      `[Agent Cooperation] Failed to get runtime dependency config: ${toErrorMessage(err)}`,
    );
  }

  // Fallback to default static graph
  return AGENT_DEPENDENCY_GRAPH[agentId] || {
    dependsOn: [],
    feedsInto: [],
    priority: 1,
    canParallelWith: [],
  };
}

/**
 * Set agent dependency configuration (runtime override)
 */
export async function setAgentDependencyConfig(
  tenantId: string,
  agentId: string,
  config: {
    dependsOn?: string[];
    feedsInto?: string[];
    priority?: number;
    canParallelWith?: string[];
    effectiveFrom?: Date;
    effectiveUntil?: Date;
    createdBy?: string;
  },
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_dependency_config
       (tenant_id, agent_id, depends_on_agents, feeds_into_agents, priority,
        can_parallel_with, effective_from, effective_until, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId,
        agentId,
        JSON.stringify(config.dependsOn || []),
        JSON.stringify(config.feedsInto || []),
        config.priority || 1,
        JSON.stringify(config.canParallelWith || []),
        config.effectiveFrom || new Date(),
        config.effectiveUntil || null,
        config.createdBy || null,
      ],
    );
    return true;
  } catch (err: unknown) {
    logger.warn(
      `[Agent Cooperation] Failed to set dependency config: ${toErrorMessage(err)}`,
    );
    return false;
  }
}

/**
 * Get all agent dependencies for a tenant (merged: runtime + defaults)
 */
export async function getAllAgentDependencies(
  tenantId: string,
): Promise<Record<string, { dependsOn: string[]; feedsInto: string[]; priority: number; canParallelWith: string[] }>> {
  const merged: Record<string, { dependsOn: string[]; feedsInto: string[]; priority: number; canParallelWith: string[] }> = {};

  // Start with defaults
  for (const [agentId, config] of Object.entries(AGENT_DEPENDENCY_GRAPH)) {
    merged[agentId] = { ...config };
  }

  // Override with runtime configs
  const schema = tenantSchema(tenantId);
  const now = new Date();

  try {
    const result = await safeQuery(
      `SELECT DISTINCT ON (agent_id)
         agent_id, depends_on_agents, feeds_into_agents, priority, can_parallel_with
       FROM "${schema}".agent_dependency_config
       WHERE tenant_id = $1
         AND enabled = TRUE
         AND effective_from <= $2
         AND (effective_until IS NULL OR effective_until >= $2)
       ORDER BY agent_id, effective_from DESC`,
      [tenantId, now],
    );

    for (const row of result.rows) {
      merged[row.agent_id] = {
        dependsOn: (row.depends_on_agents || []) as string[],
        feedsInto: (row.feeds_into_agents || []) as string[],
        priority: row.priority || 1,
        canParallelWith: (row.can_parallel_with || []) as string[],
      };
    }
  } catch (err: unknown) {
    logger.warn(
      `[Agent Cooperation] Failed to get all dependencies: ${toErrorMessage(err)}`,
    );
  }

  return merged;
}
