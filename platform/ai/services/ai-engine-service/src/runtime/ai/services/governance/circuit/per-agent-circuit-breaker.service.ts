// ============================================
// AGRC-OS — Per-Agent Circuit Breaker Service
// Implements individual circuit breakers per agent
// Requirements: ai-os-6.4
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../../ports/platform.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience/resilient-catch';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface PerAgentCircuitBreakerConfig {
  failureThreshold: number; // failures before opening
  successThreshold: number; // successes in half-open before closing
  timeoutMs: number; // time before attempting half-open
  windowMs: number; // sliding window for failure counting
}

export interface AgentCircuitState {
  agentId: string;
  tenantId: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  openedAt?: Date;
  totalCalls: number;
  totalFailures: number;
}

const DEFAULT_CONFIG: PerAgentCircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 60000, // 1 minute
  windowMs: 300000, // 5 minutes
};

const circuitStates = new Map<string, AgentCircuitState>();

/**
 * Get or create circuit breaker state for an agent
 */
async function getCircuitState(
  tenantId: string,
  agentId: string
): Promise<AgentCircuitState> {
  const key = `${tenantId}:${agentId}`;
  if (circuitStates.has(key)) {
    return circuitStates.get(key)!;
  }

  // Load from database if exists
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT agent_id, state, failure_count, success_count, last_failure_at, last_success_at, opened_at, total_calls, total_failures
       FROM "${schema}".agent_circuit_breaker
       WHERE agent_id = $1`,
      [agentId]
    );

    if (result.rows.length > 0) {
      const row = getFirstRow(result);
      const state: AgentCircuitState = {
        agentId,
        tenantId,
        state: row.state as CircuitState,
        failureCount: row.failure_count || 0,
        successCount: row.success_count || 0,
        lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at) : undefined,
        lastSuccessAt: row.last_success_at ? new Date(row.last_success_at) : undefined,
        openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
        totalCalls: row.total_calls || 0,
        totalFailures: row.total_failures || 0,
      };
      circuitStates.set(key, state);
      return state;
    }
  } catch {
    // Non-fatal, continue to create new state
  }

  // Create new state
  const newState: AgentCircuitState = {
    agentId,
    tenantId,
    state: 'CLOSED',
    failureCount: 0,
    successCount: 0,
    totalCalls: 0,
    totalFailures: 0,
  };
  circuitStates.set(key, newState);
  return newState;
}

/**
 * Save circuit breaker state to database
 */
async function saveCircuitState(state: AgentCircuitState): Promise<void> {
  const schema = tenantSchema(state.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".agent_circuit_breaker
     (agent_id, state, failure_count, success_count, last_failure_at, last_success_at, opened_at, total_calls, total_failures, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (agent_id) DO UPDATE SET
       state = EXCLUDED.state,
       failure_count = EXCLUDED.failure_count,
       success_count = EXCLUDED.success_count,
       last_failure_at = EXCLUDED.last_failure_at,
       last_success_at = EXCLUDED.last_success_at,
       opened_at = EXCLUDED.opened_at,
       total_calls = EXCLUDED.total_calls,
       total_failures = EXCLUDED.total_failures,
       updated_at = NOW()`,
    [
      state.agentId,
      state.state,
      state.failureCount,
      state.successCount,
      state.lastFailureAt || null,
      state.lastSuccessAt || null,
      state.openedAt || null,
      state.totalCalls,
      state.totalFailures,
    ]
  ).catch(catchHandler(EC.AGENT_ACTION, {}));
}

/**
 * Check if circuit breaker allows a call
 */
export async function canCallAgent(
  tenantId: string,
  agentId: string,
  config: Partial<PerAgentCircuitBreakerConfig> = {}
): Promise<{ allowed: boolean; reason?: string; retryAfterMs?: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const state = await getCircuitState(tenantId, agentId);

  // Check if we should transition from OPEN to HALF_OPEN
  if (state.state === 'OPEN' && state.openedAt) {
    const timeSinceOpen = Date.now() - state.openedAt.getTime();
    if (timeSinceOpen >= cfg.timeoutMs) {
      state.state = 'HALF_OPEN';
      state.successCount = 0;
      await saveCircuitState(state);
    } else {
      return {
        allowed: false,
        reason: 'Circuit breaker is OPEN',
        retryAfterMs: cfg.timeoutMs - timeSinceOpen,
      };
    }
  }

  // HALF_OPEN allows calls but monitors closely
  if (state.state === 'HALF_OPEN') {
    return { allowed: true, reason: 'Circuit breaker is HALF_OPEN, testing recovery' };
  }

  // CLOSED allows all calls
  return { allowed: true };
}

/**
 * Record a successful call
 */
export async function recordSuccess(
  tenantId: string,
  agentId: string,
  config: Partial<PerAgentCircuitBreakerConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const state = await getCircuitState(tenantId, agentId);
  const key = `${tenantId}:${agentId}`;

  state.totalCalls++;
  state.lastSuccessAt = new Date();
  state.successCount++;

  // If in HALF_OPEN, check if we can close
  if (state.state === 'HALF_OPEN') {
    if (state.successCount >= cfg.successThreshold) {
      state.state = 'CLOSED';
      state.failureCount = 0;
      state.successCount = 0;
      state.openedAt = undefined;

      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'ai.circuit_breaker.closed' as any,
        tenantId,

        sourceService: 'per-agent-circuit-breaker',
        severity: 'info',
        payload: { agentId },
      }), { tenantId, operation: 'eventBus:ai.circuit_breaker.closed' });
    }
  } else if (state.state === 'CLOSED') {
    // Reset failure count in sliding window
    if (state.lastFailureAt) {
      const timeSinceFailure = Date.now() - state.lastFailureAt.getTime();
      if (timeSinceFailure > cfg.windowMs) {
        state.failureCount = 0;
      }
    }
  }

  circuitStates.set(key, state);
  await saveCircuitState(state);
}

/**
 * Record a failed call
 */
export async function recordFailure(
  tenantId: string,
  agentId: string,
  config: Partial<PerAgentCircuitBreakerConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const state = await getCircuitState(tenantId, agentId);
  const key = `${tenantId}:${agentId}`;

  state.totalCalls++;
  state.totalFailures++;
  state.lastFailureAt = new Date();
  state.failureCount++;

  // If in HALF_OPEN, immediately open again
  if (state.state === 'HALF_OPEN') {
    state.state = 'OPEN';
    state.openedAt = new Date();
    state.successCount = 0;

    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'ai.circuit_breaker.opened' as any,
      tenantId,

      sourceService: 'per-agent-circuit-breaker',
      severity: 'warning',
      payload: { agentId, reason: 'Failed during HALF_OPEN recovery' },
    }), { tenantId, operation: 'eventBus:ai.circuit_breaker.opened' });
  } else if (state.state === 'CLOSED' && state.failureCount >= cfg.failureThreshold) {
    // Open the circuit
    state.state = 'OPEN';
    state.openedAt = new Date();

    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'ai.circuit_breaker.opened' as any,
      tenantId,

      sourceService: 'per-agent-circuit-breaker',
      severity: 'warning',
      payload: { agentId, failureCount: state.failureCount },
    }), { tenantId, operation: 'eventBus:ai.circuit_breaker.opened' });
  }

  circuitStates.set(key, state);
  await saveCircuitState(state);
}

/**
 * Get circuit breaker state for an agent
 */
export async function getAgentCircuitState(
  tenantId: string,
  agentId: string
): Promise<AgentCircuitState> {
  return await getCircuitState(tenantId, agentId);
}

/**
 * Get all circuit breaker states for a tenant
 */
export async function getAllCircuitStates(
  tenantId: string
): Promise<AgentCircuitState[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT agent_id, state, failure_count, success_count, last_failure_at, last_success_at, opened_at, total_calls, total_failures
       FROM "${schema}".agent_circuit_breaker
       ORDER BY agent_id`,
      []
    );

    return result.rows.map((row: GenericRow) => ({
      agentId: row.agent_id,
      tenantId,
      state: row.state as CircuitState,
      failureCount: row.failure_count || 0,
      successCount: row.success_count || 0,
      lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at) : undefined,
      lastSuccessAt: row.last_success_at ? new Date(row.last_success_at) : undefined,
      openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
      totalCalls: row.total_calls || 0,
      totalFailures: row.total_failures || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Manually reset circuit breaker for an agent
 */
export async function resetCircuitBreaker(
  tenantId: string,
  agentId: string
): Promise<void> {
  const key = `${tenantId}:${agentId}`;
  const state = await getCircuitState(tenantId, agentId);

  state.state = 'CLOSED';
  state.failureCount = 0;
  state.successCount = 0;
  state.openedAt = undefined;

  circuitStates.set(key, state);
  await saveCircuitState(state);

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'ai.circuit_breaker.reset' as any,
    tenantId,

    sourceService: 'per-agent-circuit-breaker',
    severity: 'info',
    payload: { agentId },
  }), { tenantId, operation: 'eventBus:ai.circuit_breaker.reset' });
}
