// AI subdir events port — thin wrapper over the @dos/module-sdk publishEvent
// surface so the ported ai-observation.service can resolve
// '../../ports/events.port' from dist/ai/services/observability/.
import { publishEvent } from '@dos/module-sdk';

export interface AiEvent {
  tenantId: string;
  module?: string;
  event: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  userId?: string;
}

export async function emitEvent(envelope: AiEvent): Promise<void> {
  await publishEvent({
    tenantId: envelope.tenantId,
    module: envelope.module ?? 'ai',
    event: envelope.event,
    entityType: envelope.entityType ?? 'ai-event',
    entityId: envelope.entityId ?? '',
    payload: envelope.payload ?? {},
    userId: envelope.userId ?? 'system',
  } as unknown as Parameters<typeof publishEvent>[0]);
}

export const eventBus = {
  publish: emitEvent,
};
