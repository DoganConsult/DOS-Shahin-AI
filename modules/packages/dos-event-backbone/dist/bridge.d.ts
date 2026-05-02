import type { RedisStreamEventBus } from './redis-stream-bus';
/**
 * Dual-publish bridge for progressive migration from in-memory EventBus to Redis Streams.
 *
 * Phase 1: Both legacy and backbone receive events (dual-publish)
 * Phase 2: Consumers validated on backbone
 * Phase 3: Legacy publish path removed
 */
export declare class DualPublishBridge {
    private backbone;
    private legacyPublish?;
    private legacyEnabled;
    constructor(backbone: RedisStreamEventBus, legacyPublish?: (eventType: string, payload: unknown) => void);
    publish(eventType: string, payload: unknown, meta?: {
        tenantId?: string;
        userId?: string;
    }): Promise<string>;
    disableLegacy(): void;
    enableLegacy(): void;
    isLegacyEnabled(): boolean;
}
//# sourceMappingURL=bridge.d.ts.map