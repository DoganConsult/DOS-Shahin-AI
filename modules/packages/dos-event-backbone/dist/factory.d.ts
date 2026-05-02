import { RedisStreamEventBus } from './redis-stream-bus';
import { DualPublishBridge } from './bridge';
import type { EventBackboneConfig } from './types';
export declare function createEventBackbone(config: EventBackboneConfig): RedisStreamEventBus;
export declare function createDualPublishBridge(config: EventBackboneConfig, legacyPublish?: (eventType: string, payload: unknown) => void): DualPublishBridge;
//# sourceMappingURL=factory.d.ts.map