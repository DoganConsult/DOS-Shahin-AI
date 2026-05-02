// Top-level events port barrel. Pattern matches modules/onboarding/source/ports/events.port.ts.
// Module services import via dynamic `await import('../../../ports/events.port.js')`.
export { setEventBus, getEventBus } from '@dos/module-sdk';
export async function emitEvent(event: Record<string, unknown>) {
  const bus = (globalThis as any).__serviceBus;
  if (bus?.publish) await bus.publish(event.event_type as string, event, { tenantId: event.tenant_id as string });
}
