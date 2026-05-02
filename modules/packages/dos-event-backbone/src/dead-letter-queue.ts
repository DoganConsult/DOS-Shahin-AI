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

const DEFAULT_DLQ_CONFIG: DLQConfig = {
  maxRetries: 5,
  retryBackoffMs: 1000,
  retryBackoffMultiplier: 2,
  retryBackoffMaxMs: 60_000,
  poisonThreshold: 10,
};

export class DeadLetterQueue {
  private redis: Redis;
  private config: DLQConfig;
  private serviceCode: string;

  constructor(redis: Redis, serviceCode: string, config?: Partial<DLQConfig>) {
    this.redis = redis;
    this.serviceCode = serviceCode;
    this.config = { ...DEFAULT_DLQ_CONFIG, ...config };
  }

  private dlqKey(eventType: string): string {
    return `dlq:${this.serviceCode}:${eventType}`;
  }

  private retryCountKey(eventId: string): string {
    return `dlq:retry-count:${eventId}`;
  }

  private retryMetaKey(eventId: string): string {
    return `dlq:retry-meta:${eventId}`;
  }

  computeBackoff(attemptNumber: number): number {
    const delay = this.config.retryBackoffMs * Math.pow(this.config.retryBackoffMultiplier, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, this.config.retryBackoffMaxMs);
  }

  async recordFailure(
    envelope: EventEnvelope,
    stream: string,
    consumerGroup: string,
    error: Error,
  ): Promise<{ shouldRetry: boolean; retryDelayMs: number; poisoned: boolean }> {
    const countKey = this.retryCountKey(envelope.eventId);
    const metaKey = this.retryMetaKey(envelope.eventId);
    const failureCount = await this.redis.incr(countKey);
    await this.redis.expire(countKey, 86400 * 7);

    const now = new Date().toISOString();
    const existingMeta = await this.redis.get(metaKey);
    const firstFailedAt = existingMeta ? JSON.parse(existingMeta).firstFailedAt : now;

    await this.redis.set(metaKey, JSON.stringify({ firstFailedAt, lastFailedAt: now }), 'EX', 86400 * 7);

    const poisoned = failureCount >= this.config.poisonThreshold;

    if (failureCount > this.config.maxRetries || poisoned) {
      const entry: DeadLetterEntry = {
        envelope,
        originalStream: stream,
        consumerGroup,
        failureReason: error.message,
        failureCount,
        firstFailedAt,
        lastFailedAt: now,
        poisoned,
      };

      await this.redis.xadd(
        this.dlqKey(envelope.eventType),
        '*',
        'entry', JSON.stringify(entry),
      );

      await this.redis.del(countKey, metaKey);

      return { shouldRetry: false, retryDelayMs: 0, poisoned };
    }

    return {
      shouldRetry: true,
      retryDelayMs: this.computeBackoff(failureCount),
      poisoned: false,
    };
  }

  async listDeadLetters(eventType: string, count = 100): Promise<DeadLetterEntry[]> {
    const results = await this.redis.xrange(this.dlqKey(eventType), '-', '+', 'COUNT', count);
    return results.map(([_id, fields]) => {
      const idx = fields.indexOf('entry');
      return idx >= 0 ? JSON.parse(fields[idx + 1]) as DeadLetterEntry : null;
    }).filter((e): e is DeadLetterEntry => e !== null);
  }

  async replayDeadLetter(
    eventType: string,
    messageId: string,
    republish: (envelope: EventEnvelope) => Promise<void>,
  ): Promise<boolean> {
    const results = await this.redis.xrange(this.dlqKey(eventType), messageId, messageId);
    if (results.length === 0) return false;

    const [_id, fields] = results[0];
    const idx = fields.indexOf('entry');
    if (idx < 0) return false;

    const entry: DeadLetterEntry = JSON.parse(fields[idx + 1]);
    await republish(entry.envelope);
    await this.redis.xdel(this.dlqKey(eventType), messageId);
    return true;
  }

  async purge(eventType: string): Promise<number> {
    const len = await this.redis.xlen(this.dlqKey(eventType));
    if (len > 0) {
      await this.redis.del(this.dlqKey(eventType));
    }
    return len;
  }

  async getMetrics(eventType: string): Promise<{ pending: number; oldest?: string }> {
    const len = await this.redis.xlen(this.dlqKey(eventType));
    let oldest: string | undefined;
    if (len > 0) {
      const first = await this.redis.xrange(this.dlqKey(eventType), '-', '+', 'COUNT', 1);
      if (first.length > 0) {
        const idx = first[0][1].indexOf('entry');
        if (idx >= 0) {
          const entry: DeadLetterEntry = JSON.parse(first[0][1][idx + 1]);
          oldest = entry.firstFailedAt;
        }
      }
    }
    return { pending: len, oldest };
  }
}
