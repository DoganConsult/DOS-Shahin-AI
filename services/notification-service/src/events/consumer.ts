import { RedisStreamEventBus } from '@dos/event-backbone';
import { registerNotificationConsumers } from './notification.consumers';
import { registerRealtimeConsumers } from './realtime.consumers';

export function registerConsumers(bus: RedisStreamEventBus): void {
  registerNotificationConsumers(bus);
  registerRealtimeConsumers(bus);
}
