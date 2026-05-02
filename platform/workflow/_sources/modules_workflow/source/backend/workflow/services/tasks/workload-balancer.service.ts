// ============================================
// AGRC-OS — Workload Balancer Service
// Requirements: 3.3 Workload Balancing
// Purpose: Distributes agent execution load across time and resources
// to prevent overload and ensure fair resource utilization
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getAgentResourceAllocation } from '../../ports/platform.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

export interface WorkloadMetrics {
  agentId: string;
  tenantId: string;
  activeRuns: number;
  queuedRuns: number;
  avgExecutionTime: number;  // milliseconds
  currentLoad: number;       // 0-100 percentage
  capacity: number;          // max concurrent runs
  lastExecutedAt?: string;
}

export interface WorkloadBalanceDecision {
  shouldExecute: boolean;
  shouldQueue: boolean;
  shouldDelay: boolean;
  delayMs?: number;
  reason: string;
  estimatedWaitTime?: number;
}

/**
 * Get current workload metrics for an agent
 */
export async function getAgentWorkloadMetrics(
  tenantId: string,
  agentId: string
): Promise<WorkloadMetrics> {
  const schema = tenantSchema(tenantId);

  // Get active runs
  const activeRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: '0', avg_duration: null }]), safeQuery(
    `SELECT COUNT(*) as count, AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration
     FROM "${schema}".agent_runs
     WHERE agent_id = $1 AND status IN ('running', 'pending') AND tenant_id = $2`,
    [agentId, tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const activeRuns = Number(getFirstRow(activeRes)?.count || 0);
  const avgExecutionTime = Number(getFirstRow(activeRes)?.avg_duration || 0) || 60000; // default 60s

  // Get queued runs
  const queuedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: '0' }]), safeQuery(
    `SELECT COUNT(*) as count
     FROM "${schema}".agent_runs
     WHERE agent_id = $1 AND status = 'queued' AND tenant_id = $2`,
    [agentId, tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const queuedRuns = Number(getFirstRow(queuedRes)?.count || 0);

  // Get last execution time
  const lastRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ last_executed: null }]), safeQuery(
    `SELECT MAX(created_at) as last_executed
     FROM "${schema}".agent_runs
     WHERE agent_id = $1 AND tenant_id = $2 AND status = 'completed'`,
    [agentId, tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  // Determine capacity based on resource allocation
  const allocation = await getAgentResourceAllocation(tenantId);
  const computeUnitsRaw = (allocation as any)?.computeUnits;
  const computeUnits = typeof computeUnitsRaw === 'number' ? computeUnitsRaw : Number(computeUnitsRaw || 0);
  const baseCapacity = Number.isFinite(computeUnits) && computeUnits > 0 ? Math.floor(computeUnits / 10) : 5;
  const capacity = Math.max(1, Math.min(baseCapacity, 20)); // Cap at 20 concurrent runs

  const currentLoad = capacity > 0 ? Math.min(100, (activeRuns / capacity) * 100) : 100;

  return {
    agentId,
    tenantId,
    activeRuns,
    queuedRuns,
    avgExecutionTime,
    currentLoad,
    capacity,
    lastExecutedAt: getFirstRow(lastRes)?.last_executed || undefined,
  };
}

/**
 * Decide whether to execute, queue, or delay an agent run
 */
export async function balanceWorkload(
  tenantId: string,
  agentId: string,
  priority: 'critical' | 'high' | 'medium' | 'low'
): Promise<WorkloadBalanceDecision> {
  const metrics = await getAgentWorkloadMetrics(tenantId, agentId);

  // Critical priority always executes (within absolute limits)
  if (priority === 'critical' && metrics.activeRuns < metrics.capacity * 2) {
    return {
      shouldExecute: true,
      shouldQueue: false,
      shouldDelay: false,
      reason: 'Critical priority: executing immediately',
    };
  }

  // Check if agent is at capacity
  if (metrics.activeRuns >= metrics.capacity) {
    // High priority can queue
    if (priority === 'high' || priority === 'critical') {
      const estimatedWait = metrics.queuedRuns * metrics.avgExecutionTime;
      return {
        shouldExecute: false,
        shouldQueue: true,
        shouldDelay: false,
        reason: `Agent at capacity (${metrics.activeRuns}/${metrics.capacity}). Queued.`,
        estimatedWaitTime: estimatedWait,
      };
    }

    // Medium/low priority: delay execution
    const delayMs = Math.min(metrics.avgExecutionTime * 0.5, 300000); // Max 5 minutes
    return {
      shouldExecute: false,
      shouldQueue: false,
      shouldDelay: true,
      delayMs,
      reason: `Agent at capacity. Delaying ${delayMs}ms for ${priority} priority.`,
    };
  }

  // Check load threshold (80% = start queuing non-critical)
  if (metrics.currentLoad >= 80 && priority !== 'critical' && priority !== 'high') {
    const delayMs = Math.min(metrics.avgExecutionTime * 0.3, 180000); // Max 3 minutes
    return {
      shouldExecute: false,
      shouldQueue: false,
      shouldDelay: true,
      delayMs,
      reason: `High load (${metrics.currentLoad.toFixed(1)}%). Delaying ${priority} priority.`,
    };
  }

  // Execute immediately
  return {
    shouldExecute: true,
    shouldQueue: false,
    shouldDelay: false,
    reason: `Load acceptable (${metrics.currentLoad.toFixed(1)}%). Executing.`,
  };
}

/**
 * Get workload summary for all agents in a tenant
 */
export async function getTenantWorkloadSummary(tenantId: string): Promise<{
  totalActiveRuns: number;
  totalQueuedRuns: number;
  agents: WorkloadMetrics[];
  overallLoad: number;
}> {
  const schema = tenantSchema(tenantId);

  // Get all agent IDs
  const agentsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT DISTINCT agent_id FROM "${schema}".agent_runs WHERE tenant_id = $1`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const agentIds = agentsRes.rows.map(r => r.agent_id);
  const agents: WorkloadMetrics[] = [];

  for (const agentId of agentIds) {
    const metrics = await getAgentWorkloadMetrics(tenantId, (agentId as any));
    agents.push(metrics);
  }

  const totalActiveRuns = agents.reduce((sum, a) => sum + a.activeRuns, 0);
  const totalQueuedRuns = agents.reduce((sum, a) => sum + a.queuedRuns, 0);
  const totalCapacity = agents.reduce((sum, a) => sum + a.capacity, 0);
  const overallLoad = totalCapacity > 0 ? Math.min(100, (totalActiveRuns / totalCapacity) * 100) : 100;

  return {
    totalActiveRuns,
    totalQueuedRuns,
    agents,
    overallLoad,
  };
}

/**
 * Rebalance workload by moving queued runs to available agents
 */
export async function rebalanceWorkload(tenantId: string): Promise<{
  rebalanced: number;
  decisions: Array<{ agentId: string; action: string; reason: string }>;
}> {
  const summary = await getTenantWorkloadSummary(tenantId);
  const decisions: Array<{ agentId: string; action: string; reason: string }> = [];
  let rebalanced = 0;

  // Find agents with available capacity
  const availableAgents = summary.agents.filter(a => a.activeRuns < a.capacity);
  const overloadedAgents = summary.agents.filter(a => a.activeRuns >= a.capacity && a.queuedRuns > 0);

  // For each overloaded agent, try to redistribute queued runs
  for (const overloaded of overloadedAgents) {
    if (availableAgents.length === 0) break;

    // Find best available agent (lowest load)
    availableAgents.sort((a, b) => a.currentLoad - b.currentLoad);
    const target = availableAgents[0];

    // Note: Actual run migration would require updating agent_runs table
    // This is a simplified version that logs the decision
    decisions.push({
      agentId: overloaded.agentId,
      action: 'redistribute',
      reason: `Agent overloaded. Consider redistributing to ${target.agentId} (load: ${target.currentLoad.toFixed(1)}%)`,
    });

    // Update target capacity (simulated)
    target.activeRuns += 1;
    overloaded.queuedRuns -= 1;
    rebalanced += 1;

    // Remove target if it becomes full
    if (target.activeRuns >= target.capacity) {
      const idx = availableAgents.indexOf(target);
      if (idx >= 0) availableAgents.splice(idx, 1);
    }
  }

  await eventBus.publish(({
      tenantId,
      eventType: 'workload_rebalanced',
      severity: 'info',
      entityId: tenantId,
      payload: { rebalanced, decisions },
    } as any));

  return { rebalanced, decisions };
}
