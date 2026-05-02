import Redis from 'ioredis';
import type { EventEnvelope } from './types';
export interface DeadLetterEntry {
    envelope: EventEnvelope;
    originalStream: string;
    consumerGroup: string;
    failureReason: string;
    failureCount: number;
    firstFailedAt: string;
    lastFailedAt: string;
    poisoned: boolean;
}
export interface DLQConfig {
    maxRetries: number;
    retryBackoffMs: number;
    retryBackoffMultiplier: number;
    retryBackoffMaxMs: number;
    poisonThreshold: number;
}
export declare class DeadLetterQueue {
    private redis;
    private config;
    private serviceCode;
    constructor(redis: Redis, serviceCode: string, config?: Partial<DLQConfig>);
    private dlqKey;
    private retryCountKey;
    private retryMetaKey;
    computeBackoff(attemptNumber: number): number;
    recordFailure(envelope: EventEnvelope, stream: string, consumerGroup: string, error: Error): Promise<{
        shouldRetry: boolean;
        retryDelayMs: number;
        poisoned: boolean;
    }>;
    listDeadLetters(eventType: string, count?: number): Promise<DeadLetterEntry[]>;
    replayDeadLetter(eventType: string, messageId: string, republish: (envelope: EventEnvelope) => Promise<void>): Promise<boolean>;
    purge(eventType: string): Promise<number>;
    getMetrics(eventType: string): Promise<{
        pending: number;
        oldest?: string;
    }>;
}
//# sourceMappingURL=dead-letter-queue.d.ts.map