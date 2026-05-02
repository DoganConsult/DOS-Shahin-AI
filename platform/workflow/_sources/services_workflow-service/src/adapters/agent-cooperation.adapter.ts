/**
 * workflow-service / agent-cooperation adapter.
 *
 * In-process agent-cycle coordination used by the Temporal agent
 * activity layer. The canonical agent runtime lives in `ai-engine-service`;
 * this adapter owns the workflow-service's per-tenant cycle bookkeeping
 * (cycle id issuance, discovery correlation cache, cleanup) so that
 * activities can depend on synchronous context objects without a
 * network hop per cycle step.
 */
import { randomUUID } from 'node:crypto';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface AgentCycleContext {
  tenantId: string;
  cycleId: string;
  startedAt: string;
  discoveries: unknown[];
  summary?: Record<string, unknown>;
}

const _cyclesByTenant = new Map<string, AgentCycleContext>();

/**
 * Begin a new agent cycle for the tenant. Returns the context synchronously
 * so Temporal activities can read the cycleId in the same tick. Safe to
 * call concurrently per tenant — the last caller wins, older discoveries
 * are drained on the tenant via `closeCycleContext`.
 */
export function initCycleContext(tenantId: string): AgentCycleContext {
  const ctx: AgentCycleContext = {
    tenantId,
    cycleId: `cycle-${tenantId}-${randomUUID()}`,
    startedAt: new Date().toISOString(),
    discoveries: [],
  };
  _cyclesByTenant.set(tenantId, ctx);
  publish('agent.cycle.started', tenantId, { cycleId: ctx.cycleId, startedAt: ctx.startedAt })
    .catch((err) => logger.warn('[AgentCoop] cycle.started publish failed', { err: toErrorMessage(err) }));
  return ctx;
}

export function closeCycleContext(tenantId: string): void {
  const ctx = _cyclesByTenant.get(tenantId);
  if (!ctx) return;
  _cyclesByTenant.delete(tenantId);
  publish('agent.cycle.closed', tenantId, {
    cycleId: ctx.cycleId,
    discoveryCount: ctx.discoveries.length,
    closedAt: new Date().toISOString(),
  }).catch((err) =>
    logger.warn('[AgentCoop] cycle.closed publish failed', { err: toErrorMessage(err) }),
  );
}

/**
 * Return the canonical execution-wave plan for the tenant's current cycle.
 * Single-wave grouping is the safe default — product-shell can register a
 * richer planner by calling `setWavePlanner()` below.
 */
export function computeExecutionWaves(): Array<{ wave: number; agents: string[] }> {
  const planner = _wavePlanner ?? defaultWavePlanner;
  return planner();
}

let _wavePlanner: (() => Array<{ wave: number; agents: string[] }>) | null = null;
function defaultWavePlanner(): Array<{ wave: number; agents: string[] }> {
  return [{ wave: 1, agents: [] }];
}
export function setWavePlanner(
  planner: () => Array<{ wave: number; agents: string[] }>,
): void {
  _wavePlanner = planner;
}

/** Correlate discoveries accumulated during the cycle and return the list. */
export function correlateDiscoveries(tenantId: string): unknown[] {
  const ctx = _cyclesByTenant.get(tenantId);
  if (!ctx) return [];
  return ctx.discoveries;
}

/** Persist a summary row for the cycle via the event backbone. */
export function persistCycleSummary(tenantId: string): Promise<void> {
  const ctx = _cyclesByTenant.get(tenantId);
  if (!ctx) return Promise.resolve();
  ctx.summary = {
    cycleId: ctx.cycleId,
    startedAt: ctx.startedAt,
    discoveryCount: ctx.discoveries.length,
    endedAt: new Date().toISOString(),
  };
  return publish('agent.cycle.summary', tenantId, ctx.summary)
    .then(() => undefined)
    .catch((err) => {
      logger.warn('[AgentCoop] cycle.summary publish failed', {
        err: toErrorMessage(err),
      });
    });
}

export function recordDiscovery(tenantId: string, discovery: unknown): void {
  const ctx = _cyclesByTenant.get(tenantId);
  if (!ctx) return;
  ctx.discoveries.push(discovery);
}
