import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';

/** Minimal surface used by ai-governance `subscribeAll` (engine domain module). */
type GovernanceEventBusAdapter = {
  on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>): void;
};

type GovernanceSubscribersModule = {
  subscribeAll?: (bus: GovernanceEventBusAdapter) => void;
};

/**
 * Cross-service consumers for ai-governance-service.
 *
 * Tier 5 — react to ai.agent.completed and ai.agent.failed by writing a
 * governance-trail row into dos.audit_trail (module='ai-governance') so
 * downstream entity-type pages can render "agent activity" timelines, and
 * by appending a notice on the ai_governance_entities row when one is
 * referenced in the event payload (entityId+entityType).
 */
export function registerConsumers(eventBus: RedisStreamEventBus): void {
  const handleAgentEvent = (eventType: 'completed' | 'failed') =>
    async (envelope: any): Promise<void> => {
      try {
        const tenantId =
          envelope?.tenantId ??
          envelope?.tenant_id ??
          envelope?.payload?.tenantId ??
          'unknown';
        const payload = envelope?.payload ?? envelope ?? {};
        const agentId = String(payload.agentId ?? 'unknown');
        const { query } = await import('@dos/db');

        // 1. Append a governance-trail row to dos.audit_trail.
        await query(
          `INSERT INTO dos.audit_trail
             (tenant_id, actor_id, action, entity_type, entity_id, module, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`,
          [
            tenantId,
            `agent-${agentId}`,
            `agent.${eventType}`,
            'ai_agent_run',
            String(payload.executionId ?? payload.runId ?? agentId),
            'ai-governance',
            JSON.stringify({
              agentId,
              actionsProposed: payload.actionsProposed,
              actionsExecuted: payload.actionsExecuted,
              durationMs: payload.durationMs,
              error: payload.error,
            }),
          ],
        ).catch((err: any) => {
          logger.warn?.('[ai-governance-service] audit_trail insert failed', { error: err?.message });
        });

        // 2. If the event references an ai_governance_entities row, bump its
        //    updated_at so observers see freshness.
        const refEntityId = payload.entityId ?? payload.governanceEntityId;
        if (refEntityId) {
          const { tenantSchema } = await import('@dos/db');
          const schema = tenantSchema(tenantId);
          await query(
            `UPDATE "${schema}".ai_governance_entities
                SET updated_at = NOW(),
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastAgentRun', $2::jsonb)
              WHERE entity_id = $1`,
            [
              String(refEntityId),
              JSON.stringify({ agentId, eventType, at: new Date().toISOString() }),
            ],
          ).catch(() => undefined);
        }
      } catch (err: any) {
        logger.warn?.('[ai-governance-service] handleAgentEvent failed', {
          error: err?.message,
          eventType,
        });
      }
    };

  eventBus.subscribe('ai.agent.completed', handleAgentEvent('completed') as any);
  eventBus.subscribe('ai.agent.failed', handleAgentEvent('failed') as any);
  logger.info('[ai-governance-service] Cross-service subscribers registered for ai.agent.completed / ai.agent.failed');
}

/**
 * Wave 2C: register module-level event handlers from modules/ai-governance.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    // Dynamic require — module subscribers loaded at runtime from compiled dist.
    const moduleSubscribers = require(
      '../../../modules/ai-governance/dist/ai-governance/events/ai-governance.subscribers',
    ) as GovernanceSubscribersModule;

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter: GovernanceEventBusAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[ai-governance-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[ai-governance-service] Module event subscribers registered');
    }
  } catch {
    // Module subscribers are optional — service boots without them.
  }
}
