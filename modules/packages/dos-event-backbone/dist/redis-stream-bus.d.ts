import type { EventHandler, EventBackboneConfig, BackboneLogger } from './types';
import { DeadLetterQueue } from './dead-letter-queue';
import type { DLQConfig } from './dead-letter-queue';
export interface EventBusMetrics {
    published: number;
    consumed: number;
    failed: number;
    deadLettered: number;
    poisoned: number;
}
export declare class RedisStreamEventBus {
    private redis;
    private subscriber;
    private serviceCode;
    private consumerGroup;
    private consumerId;
    private subscriptions;
    private running;
    private maxRetries;
    private retryDelayMs;
    private batchSize;
    private dlq;
    private processedIdempotencyKeys;
    private idempotencyTTLMs;
    private metrics;
    private logger;
    constructor(config: EventBackboneConfig, dlqConfig?: Partial<DLQConfig>);
    connect(): Promise<void>;
    getDLQ(): DeadLetterQueue;
    getLogger(): BackboneLogger;
    getMetrics(): EventBusMetrics;
    publish(eventType: string, payload: unknown, meta?: {
        tenantId?: string;
        userId?: string;
        idempotencyKey?: string;
    }): Promise<string>;
    subscribe(eventType: string, handler: EventHandler): void;
    private isProcessed;
    private markProcessed;
    private ensureConsumerGroups;
    startConsuming(): Promise<void>;
    stopConsuming(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=redis-stream-bus.d.ts.map