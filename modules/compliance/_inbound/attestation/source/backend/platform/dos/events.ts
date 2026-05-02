// Platform-level event emitter — production-grade thin wrapper over the
// @dos/module-sdk publishEvent surface. Co-located inside the attestation
// module so the existing relative import '../../../platform/dos/events'
// resolves at runtime in dist/ and source/ alike.

import { publishEvent } from '@dos/module-sdk';

export interface PlatformEventEnvelope {
  tenantId: string;
  module: string;
  event: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  userId?: string;
}

/**
 * Emit a platform event onto the canonical Redis-backed event backbone.
 * The platform-core service-bootstrap wires `setEventBus` at process start;
 * publishEvent then routes per-tenant via the existing module-sdk pipeline.
 */
export async function emitEvent(envelope: PlatformEventEnvelope): Promise<void> {
  await publishEvent({
    tenantId: envelope.tenantId,
    module: envelope.module,
    event: envelope.event,
    entityType: envelope.entityType ?? 'unknown',
    entityId: envelope.entityId ?? '',
    payload: envelope.payload ?? {},
    userId: envelope.userId ?? 'system',
  } as unknown as Parameters<typeof publishEvent>[0]);
}

export const dosEvents = { emit: emitEvent };
