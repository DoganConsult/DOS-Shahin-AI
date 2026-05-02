import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Agent Coordination Service
// Cross-agent trigger chains: when one agent
// completes work, automatically invoke the next
// agent in the chain with context propagation.
//
// Chains are defined in agent_trigger_chains table
// (tenant-configurable). Default chains:
//   A05 evidence → A06 gap check → A04 control
//   A07 risk → A06 remediation → A09 vendor
//   A08 policy → A04 control → A05 evidence
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus, type PlatformEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

// ── Types ────────────────────────────────────────────────────────────────────

interface TriggerChain {
  id: number;
  source_agent_id: string;
  source_entity_type: string;
  source_task_type: string;
  target_agent_id: string;
  target_context: Record<string, unknown>;
  delay_seconds: number;
}

// ── Chain Cache ──────────────────────────────────────────────────────────────

const _chainCache = new Map<string, { chains: TriggerChain[]; ts: number }>();
const CHAIN_CACHE_TTL = 5 * 60_000;

async function getChains(tenantId: string): Promise<TriggerChain[]> {
  const cached = _chainCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CHAIN_CACHE_TTL) return cached.chains;

  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT id, source_agent_id, source_entity_type, source_task_type,
              target_agent_id, target_context, delay_seconds
       FROM "${schema}".agent_trigger_chains
       WHERE active = TRUE`,
      [],
    );
    const chains = res.rows as TriggerChain[];
    _chainCache.set(tenantId, { chains, ts: Date.now() });
    return chains;
  } catch {
    return [];
  }
}

// ── Core: Handle Task Completion ─────────────────────────────────────────────

/**
 * When a process task completes (or is auto-resolved), check if any cross-agent
 * trigger chains should fire. If so, invoke the target agent.
 */
export async function handleTaskCompletion(event: PlatformEvent): Promise<void> {
  if (!event.tenantId) return;

  const payload = event.payload ?? {};
  const triggerSource = payload.triggerSource ?? payload.trigger_source ?? '';
  const entityType = payload.entityType ?? payload.entity_type ?? event.entityType ?? '';
  const taskType = payload.taskType ?? payload.task_type ?? '';

  // Extract source agent ID from trigger_source (e.g., 'agent-runner:A05')
  let sourceAgentId = '';
  if (typeof triggerSource === 'string' && triggerSource.includes(':')) {
    sourceAgentId = triggerSource.split(':')[1] ?? '';
  } else if (typeof triggerSource === 'string' && /^A\d{2}$/.test(triggerSource)) {
    sourceAgentId = triggerSource;
  }

  // Also check routing metadata for agent origin

  if (!sourceAgentId && payload.routingMetadata?.triggerSource) {

    const ts = payload.routingMetadata.triggerSource;
    if (typeof ts === 'string' && /A\d{2}/.test(ts)) {
      sourceAgentId = ts.match(/A\d{2}/)?.[0] ?? '';
    }
  }

  const chains = await getChains(event.tenantId);
  if (!chains.length) return;

  // Find matching chains
  const matching = chains.filter((c) => {
    // Match by source agent + entity type + task type
    if (sourceAgentId && c.source_agent_id === sourceAgentId) {
      return c.source_entity_type === entityType && c.source_task_type === taskType;
    }
    // Also match by entity_type + task_type alone (for non-agent triggers)
    return c.source_entity_type === entityType && c.source_task_type === taskType;
  });

  for (const chain of matching) {
    const delayMs = (chain.delay_seconds || 0) * 1000;

    const triggerFn = async () => {
      try {
        // Dynamically import agent-runner to avoid circular deps
        const { runAgent } = await import('../agents/core/agent-runner.service');

        logger.info(`[AgentCoordination] Triggering ${chain.target_agent_id} from ${chain.source_agent_id}:${entityType}:${taskType} (delay=${chain.delay_seconds}s)`);

        await runAgent(event.tenantId, chain.target_agent_id);

        // Publish coordination event
        swallow(EC.AGENT_ACTION, eventBus.publish({
          eventType: 'crosshub.cascade_triggered' as any,
          tenantId: event.tenantId,

          sourceService: 'agent-coordination',
          severity: 'info',
          entityType: 'agent_chain',
          entityId: String(chain.id),
          payload: {
            sourceAgentId: chain.source_agent_id,
            targetAgentId: chain.target_agent_id,
            sourceEntityType: entityType,
            sourceTaskType: taskType,
            triggerEventType: event.eventType,
            context: chain.target_context,
          },
        }), { operation: 'eventBus:crosshub.cascade_triggered' });
      } catch (e: unknown) {
        logger.warn(`[AgentCoordination] Failed to trigger ${chain.target_agent_id}: ${toErrorMessage(e)}`);
      }
    };

    if (delayMs > 0) {
      setTimeout(triggerFn, delayMs);
    } else {
      // Fire immediately but don't await (non-blocking)
      swallow(EC.AGENT_ACTION, triggerFn(), { operation: 'triggerCoordinationChain' });
    }
  }
}

// ── Coordination Stats ───────────────────────────────────────────────────────

/**
 * Get coordination stats for a tenant (for analytics dashboard).
 */
export async function getCoordinationStats(tenantId: string): Promise<{
  totalChains: number;
  activeChains: number;
  recentTriggers: number;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const chainsRes = await safeQuery(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active) ::int AS active
       FROM "${schema}".agent_trigger_chains`,
      [],
    );
    const triggersRes = await safeQuery(
      `SELECT COUNT(*)::int AS recent
       FROM "${schema}".agrc_event_log
       WHERE event_type = 'crosshub.cascade_triggered'
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [],
    );
    return {
      totalChains: getFirstRow(chainsRes)?.total ?? 0,
      activeChains: getFirstRow(chainsRes)?.active ?? 0,
      recentTriggers: getFirstRow(triggersRes)?.recent ?? 0,
    };
  } catch {
    return { totalChains: 0, activeChains: 0, recentTriggers: 0 };
  }
}

// ── Event Subscription ───────────────────────────────────────────────────────

/**
 * Register coordination subscribers on the EventBus.
 * Listens to task completion and auto-resolution events.
 */
export function registerAgentCoordinationSubscribers(): void {
  eventBus.subscribe(
    'process_task.completed' as any,
    'agent-coordination:task_completed',
    handleTaskCompletion,
  );

  eventBus.subscribe(
    'process_task.auto_resolved' as any,
    'agent-coordination:task_auto_resolved',
    handleTaskCompletion,
  );

  logger.info('[AgentCoordination] Registered cross-agent trigger chain subscribers');
}
