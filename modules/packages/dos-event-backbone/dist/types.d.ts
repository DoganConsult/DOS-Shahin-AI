export interface EventEnvelope {
    eventId: string;
    eventType: string;
    tenantId: string;
    userId?: string;
    payload: unknown;
    timestamp: string;
    source: string;
    idempotencyKey: string;
    version: number;
}
export interface EventHandler {
    (event: EventEnvelope): Promise<void>;
}
export interface BackboneLogger {
    info(msg: string, ctx?: Record<string, unknown>): void;
    warn(msg: string, ctx?: Record<string, unknown>): void;
    error(msg: string, ctx?: Record<string, unknown>): void;
}
export interface EventBackboneConfig {
    redisUrl: string;
    serviceCode: string;
    consumerGroup?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    batchSize?: number;
    logger?: BackboneLogger;
}
export interface EventSubscription {
    eventType: string;
    handler: EventHandler;
    consumerGroup?: string;
}
//# sourceMappingURL=types.d.ts.map