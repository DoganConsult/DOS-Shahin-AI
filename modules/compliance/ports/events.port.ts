// Top-level events port barrel. Pattern matches modules/onboarding/source/ports/events.port.ts.
// Module services import via dynamic `await import('../../../ports/events.port.js')`.
export { setEventBus, getEventBus } from '@dos/module-sdk';
export async function emitEvent(event: Record<string, unknown>) {
  const bus = (globalThis as any).__serviceBus;
  if (bus?.publish) await bus.publish(event.event_type as string, event, { tenantId: event.tenant_id as string });
}

// Legacy `eventBus` shim — services that imported a singleton `eventBus`
// directly (pre-port era). Wraps `emitEvent` to preserve their call-site
// `eventBus.publish(...)` ergonomics. New code should use `emitEvent`.
async function _dispatch(arg: string | Record<string, unknown>, payload?: Record<string, unknown>, opts?: { tenantId?: string }) {
  if (typeof arg === 'object' && arg !== null) {
    const { eventType, event_type, tenantId, tenant_id, ...rest } = arg as Record<string, unknown>;
    await emitEvent({ ...rest, event_type: (eventType ?? event_type) as string, tenant_id: (tenantId ?? tenant_id) as string });
  } else {
    await emitEvent({ ...(payload ?? {}), event_type: arg, tenant_id: opts?.tenantId ?? (payload as any)?.tenant_id });
  }
}

export interface PlatformEvent {
  eventType: string;
  tenantId?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export const eventBus = {
  publish: _dispatch,
  emit: _dispatch,
  async subscribe(_eventType: string, _handler: (event: PlatformEvent) => Promise<void> | void): Promise<void> {
    /* no-op until host binds a real bus */
  },
  async startConsuming(): Promise<void> { /* no-op until host binds a real bus */ },
};
