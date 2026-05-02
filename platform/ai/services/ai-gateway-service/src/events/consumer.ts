import { RedisStreamEventBus } from '@dos/event-backbone';

const CONSUMED_EVENTS = [
  'workflow.task.completed',
  'workflow.task.assigned',
  'notification.sent',
  'ai.created',
  'ai.updated',
  'ai-governance.created',
  'ai-governance.updated',
  'agrc-engine.created',
  'agrc-engine.updated',
  'mcp.created',
  'mcp.updated',
];

export function registerConsumers(bus: RedisStreamEventBus): void {
  for (const eventType of CONSUMED_EVENTS) {
    bus.subscribe(eventType, async (event) => {
      try {
        console.log(`[ai-gateway-service] Consumed ${event.eventType} for tenant ${event.tenantId}`);
      } catch (err) {
        console.error(`[ai-gateway-service] Failed to handle ${event.eventType}:`, err);
      }
    });
  }
}
