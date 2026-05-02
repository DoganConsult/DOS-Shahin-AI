import { RedisStreamEventBus } from './redis-stream-bus';
import { DualPublishBridge } from './bridge';
import type { EventBackboneConfig } from './types';

export function createEventBackbone(config: EventBackboneConfig): RedisStreamEventBus {
  return new RedisStreamEventBus(config);
}

export function createDualPublishBridge(
  config: EventBackboneConfig,
  legacyPublish?: (eventType: string, payload: unknown) => void,
): DualPublishBridge {
  const backbone = new RedisStreamEventBus(config);
  return new DualPublishBridge(backbone, legacyPublish);
}
