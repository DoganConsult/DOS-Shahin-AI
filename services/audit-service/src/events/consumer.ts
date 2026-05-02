import { RedisStreamEventBus } from '@dos/event-backbone';
import { registerAuditConsumers } from './audit.consumers';

export function registerConsumers(bus: RedisStreamEventBus): void {
  registerAuditConsumers(bus);
}
