/**
 * AI module event emitter — decoupled from product-specific GRC event bus.
 * §1.3: Shahin-AI must remain removable without breaking DOS or DAuth.
 * §19: No product-specific logic in platform modules.
 *
 * Uses platform eventBus.publish directly. Product automation rules
 * are triggered via event subscribers, not direct import coupling.
 */
import { eventBus } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { safeQuery } from "@dos/db";

interface ModuleEvent {
  tenantId: string;
  userId: string;
  module: string;
  event: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function emitModuleEvent(event: ModuleEvent): Promise<void> {
  await eventBus.publish(({
      eventType: `${event.module}.${event.event}`,
      tenantId: event.tenantId,
      sourceService: `ai-${event.module}`,
      severity: 'info',
      payload: {
        userId: event.userId,
        entityType: event.entityType,
        entityId: event.entityId,
        ...event.metadata,
      },
    } as any)).catch(catchHandler(EC.EVENT_BUS));
}
