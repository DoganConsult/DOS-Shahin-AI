import { logger } from '../../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { setPublisher } from './foundation.publishers';
import { FOUNDATION_METRICS } from '../observability/metrics';

export interface EventBusLike {
  publish(
    eventType: string,
    payload: unknown,
    meta?: { tenantId?: string; userId?: string; idempotencyKey?: string },
  ): Promise<string> | Promise<void>;
}

/**
 * Bind the foundation module's publisher to the host service's event bus.
 * Called exactly once at host boot (user-service/server.ts after
 * createEventBackbone/setEventBus). All subsequent calls to publish(eventName,...)
 * inside the foundation module will route through this bus and thus hit the
 * platform outbox + Redis streams.
 */
export function bindFoundationPublisher(bus: EventBusLike): void {
  setPublisher(async (payload: ModuleEventPayload) => {
    const eventType = (payload as any).eventType || `${payload.moduleCode}.unknown`;
    const tenantId = (payload as any).tenantId;
    const userId = (payload as any).userId;
    const idempotencyKey = (payload as any).idempotencyKey;
    try {
      await bus.publish(eventType, payload, { tenantId, userId, idempotencyKey });
      FOUNDATION_METRICS.eventsPublished.inc(eventType);
    } catch (err: any) {
      FOUNDATION_METRICS.eventsPublished.inc(`${eventType}__failed`);
      logger.warn(`[foundation.outbox] publish failed for ${eventType}: ${err?.message ?? err}`);
      throw err;
    }
  });
  logger.info('[foundation.outbox] publisher bound to event-backbone');
}
