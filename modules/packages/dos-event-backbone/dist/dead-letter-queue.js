"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueue = void 0;
const DEFAULT_DLQ_CONFIG = {
    maxRetries: 5,
    retryBackoffMs: 1000,
    retryBackoffMultiplier: 2,
    retryBackoffMaxMs: 60_000,
    poisonThreshold: 10,
};
class DeadLetterQueue {
    redis;
    config;
    serviceCode;
    constructor(redis, serviceCode, config) {
        this.redis = redis;
        this.serviceCode = serviceCode;
        this.config = { ...DEFAULT_DLQ_CONFIG, ...config };
    }
    dlqKey(eventType) {
        return `dlq:${this.serviceCode}:${eventType}`;
    }
    retryCountKey(eventId) {
        return `dlq:retry-count:${eventId}`;
    }
    retryMetaKey(eventId) {
        return `dlq:retry-meta:${eventId}`;
    }
    computeBackoff(attemptNumber) {
        const delay = this.config.retryBackoffMs * Math.pow(this.config.retryBackoffMultiplier, attemptNumber - 1);
        const jitter = Math.random() * 0.1 * delay;
        return Math.min(delay + jitter, this.config.retryBackoffMaxMs);
    }
    async recordFailure(envelope, stream, consumerGroup, error) {
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
            const entry = {
                envelope,
                originalStream: stream,
                consumerGroup,
                failureReason: error.message,
                failureCount,
                firstFailedAt,
                lastFailedAt: now,
                poisoned,
            };
            await this.redis.xadd(this.dlqKey(envelope.eventType), '*', 'entry', JSON.stringify(entry));
            await this.redis.del(countKey, metaKey);
            return { shouldRetry: false, retryDelayMs: 0, poisoned };
        }
        return {
            shouldRetry: true,
            retryDelayMs: this.computeBackoff(failureCount),
            poisoned: false,
        };
    }
    async listDeadLetters(eventType, count = 100) {
        const results = await this.redis.xrange(this.dlqKey(eventType), '-', '+', 'COUNT', count);
        return results.map(([_id, fields]) => {
            const idx = fields.indexOf('entry');
            return idx >= 0 ? JSON.parse(fields[idx + 1]) : null;
        }).filter((e) => e !== null);
    }
    async replayDeadLetter(eventType, messageId, republish) {
        const results = await this.redis.xrange(this.dlqKey(eventType), messageId, messageId);
        if (results.length === 0)
            return false;
        const [_id, fields] = results[0];
        const idx = fields.indexOf('entry');
        if (idx < 0)
            return false;
        const entry = JSON.parse(fields[idx + 1]);
        await republish(entry.envelope);
        await this.redis.xdel(this.dlqKey(eventType), messageId);
        return true;
    }
    async purge(eventType) {
        const len = await this.redis.xlen(this.dlqKey(eventType));
        if (len > 0) {
            await this.redis.del(this.dlqKey(eventType));
        }
        return len;
    }
    async getMetrics(eventType) {
        const len = await this.redis.xlen(this.dlqKey(eventType));
        let oldest;
        if (len > 0) {
            const first = await this.redis.xrange(this.dlqKey(eventType), '-', '+', 'COUNT', 1);
            if (first.length > 0) {
                const idx = first[0][1].indexOf('entry');
                if (idx >= 0) {
                    const entry = JSON.parse(first[0][1][idx + 1]);
                    oldest = entry.firstFailedAt;
                }
            }
        }
        return { pending: len, oldest };
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
//# sourceMappingURL=dead-letter-queue.js.map