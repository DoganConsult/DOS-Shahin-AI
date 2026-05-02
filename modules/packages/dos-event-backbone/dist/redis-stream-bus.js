"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStreamEventBus = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const node_crypto_1 = require("node:crypto");
const dead_letter_queue_1 = require("./dead-letter-queue");
const consoleFallbackLogger = {
    info: (msg, ctx) => console.log(`[event-backbone] ${msg}`, ctx ?? ''),
    warn: (msg, ctx) => console.warn(`[event-backbone] ${msg}`, ctx ?? ''),
    error: (msg, ctx) => console.error(`[event-backbone] ${msg}`, ctx ?? ''),
};
class RedisStreamEventBus {
    redis;
    subscriber;
    serviceCode;
    consumerGroup;
    consumerId;
    subscriptions = new Map();
    running = false;
    maxRetries;
    retryDelayMs;
    batchSize;
    dlq;
    processedIdempotencyKeys = new Set();
    idempotencyTTLMs;
    metrics = { published: 0, consumed: 0, failed: 0, deadLettered: 0, poisoned: 0 };
    logger;
    constructor(config, dlqConfig) {
        this.redis = new ioredis_1.default(config.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
        this.subscriber = new ioredis_1.default(config.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
        this.serviceCode = config.serviceCode;
        this.consumerGroup = config.consumerGroup || config.serviceCode;
        this.consumerId = `${config.serviceCode}-${process.pid}`;
        this.maxRetries = config.maxRetries || 3;
        this.retryDelayMs = config.retryDelayMs || 1000;
        this.batchSize = config.batchSize || 10;
        this.idempotencyTTLMs = 3600_000;
        this.logger = config.logger ?? consoleFallbackLogger;
        this.dlq = new dead_letter_queue_1.DeadLetterQueue(this.redis, config.serviceCode, {
            maxRetries: this.maxRetries,
            ...dlqConfig,
        });
    }
    async connect() {
        await this.redis.connect();
        await this.subscriber.connect();
    }
    getDLQ() {
        return this.dlq;
    }
    getLogger() {
        return this.logger;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    async publish(eventType, payload, meta) {
        const envelope = {
            eventId: (0, node_crypto_1.randomUUID)(),
            eventType,
            tenantId: meta?.tenantId || '',
            userId: meta?.userId,
            payload,
            timestamp: new Date().toISOString(),
            source: this.serviceCode,
            idempotencyKey: meta?.idempotencyKey || (0, node_crypto_1.randomUUID)(),
            version: 1,
        };
        const streamKey = `events:${eventType}`;
        try {
            await this.redis.xgroup('CREATE', streamKey, this.consumerGroup, '0', 'MKSTREAM');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('BUSYGROUP')) {
                this.logger.warn('xgroup CREATE failed during publish', { streamKey, group: this.consumerGroup, error: msg });
            }
        }
        await this.redis.xadd(streamKey, '*', 'envelope', JSON.stringify(envelope));
        this.metrics.published++;
        return envelope.eventId;
    }
    subscribe(eventType, handler) {
        const handlers = this.subscriptions.get(eventType) || [];
        handlers.push(handler);
        this.subscriptions.set(eventType, handlers);
    }
    async isProcessed(idempotencyKey) {
        if (this.processedIdempotencyKeys.has(idempotencyKey))
            return true;
        const redisKey = `idem:${this.serviceCode}:${idempotencyKey}`;
        const exists = await this.redis.exists(redisKey);
        return exists === 1;
    }
    async markProcessed(idempotencyKey) {
        this.processedIdempotencyKeys.add(idempotencyKey);
        const redisKey = `idem:${this.serviceCode}:${idempotencyKey}`;
        await this.redis.set(redisKey, '1', 'PX', this.idempotencyTTLMs);
        if (this.processedIdempotencyKeys.size > 10_000) {
            const entries = [...this.processedIdempotencyKeys];
            this.processedIdempotencyKeys = new Set(entries.slice(entries.length - 5_000));
        }
    }
    async ensureConsumerGroups() {
        for (const eventType of this.subscriptions.keys()) {
            const streamKey = `events:${eventType}`;
            try {
                await this.subscriber.xgroup('CREATE', streamKey, this.consumerGroup, '0', 'MKSTREAM');
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                // BUSYGROUP = group already exists; anything else is a real failure we
                // must surface so a NOGROUP at read time can self-heal on the next pass.
                if (!msg.includes('BUSYGROUP')) {
                    this.logger.warn('xgroup CREATE failed', { streamKey, group: this.consumerGroup, error: msg });
                }
            }
        }
    }
    async startConsuming() {
        this.running = true;
        await this.ensureConsumerGroups();
        while (this.running) {
            try {
                const streams = [...this.subscriptions.keys()].map(et => `events:${et}`);
                if (streams.length === 0) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                const results = await this.subscriber.xreadgroup('GROUP', this.consumerGroup, this.consumerId, 'COUNT', this.batchSize, 'BLOCK', 2000, 'STREAMS', ...streams, ...streams.map(() => '>'));
                if (!results)
                    continue;
                for (const result of results) {
                    const stream = result[0];
                    const messages = result[1];
                    const eventType = stream.replace('events:', '');
                    const handlers = this.subscriptions.get(eventType) || [];
                    for (const message of messages) {
                        const messageId = message[0];
                        const fields = message[1];
                        try {
                            const envelopeIdx = fields.indexOf('envelope');
                            const envelopeStr = envelopeIdx >= 0 ? fields[envelopeIdx + 1] : null;
                            if (!envelopeStr)
                                continue;
                            const envelope = JSON.parse(envelopeStr);
                            if (await this.isProcessed(envelope.idempotencyKey)) {
                                await this.subscriber.xack(stream, this.consumerGroup, messageId);
                                continue;
                            }
                            for (const handler of handlers) {
                                await handler(envelope);
                            }
                            await this.markProcessed(envelope.idempotencyKey);
                            await this.subscriber.xack(stream, this.consumerGroup, messageId);
                            this.metrics.consumed++;
                        }
                        catch (err) {
                            this.metrics.failed++;
                            const envelopeIdx = fields.indexOf('envelope');
                            const envelopeStr = envelopeIdx >= 0 ? fields[envelopeIdx + 1] : null;
                            if (envelopeStr) {
                                try {
                                    const envelope = JSON.parse(envelopeStr);
                                    const dlqResult = await this.dlq.recordFailure(envelope, stream, this.consumerGroup, err instanceof Error ? err : new Error(String(err)));
                                    if (!dlqResult.shouldRetry) {
                                        await this.subscriber.xack(stream, this.consumerGroup, messageId);
                                        this.metrics.deadLettered++;
                                        if (dlqResult.poisoned)
                                            this.metrics.poisoned++;
                                    }
                                    else {
                                        await new Promise(r => setTimeout(r, dlqResult.retryDelayMs));
                                    }
                                }
                                catch (dlqErr) {
                                    this.logger.error('DLQ recording failed', {
                                        eventType,
                                        messageId,
                                        error: dlqErr instanceof Error ? dlqErr.message : String(dlqErr),
                                    });
                                }
                            }
                        }
                    }
                }
            }
            catch (err) {
                if (this.running) {
                    const msg = err instanceof Error ? err.message : String(err);
                    // NOGROUP means a stream we're reading from is missing its consumer
                    // group — heal by re-running ensureConsumerGroups before retrying.
                    if (msg.includes('NOGROUP')) {
                        this.logger.warn('NOGROUP detected — re-creating missing consumer groups', {
                            group: this.consumerGroup,
                            error: msg,
                        });
                        await this.ensureConsumerGroups().catch(() => { });
                    }
                    else {
                        this.logger.error('Consumer error, retrying', { error: msg });
                    }
                    await new Promise(r => setTimeout(r, this.retryDelayMs));
                }
            }
        }
    }
    async stopConsuming() {
        this.running = false;
    }
    async disconnect() {
        this.running = false;
        await this.redis.quit();
        await this.subscriber.quit();
    }
}
exports.RedisStreamEventBus = RedisStreamEventBus;
//# sourceMappingURL=redis-stream-bus.js.map