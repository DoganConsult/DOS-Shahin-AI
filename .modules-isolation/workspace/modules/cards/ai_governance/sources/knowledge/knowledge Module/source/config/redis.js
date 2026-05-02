"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
exports.getRedisSubscriber = getRedisSubscriber;
exports.connectRedis = connectRedis;
exports.isRedisHealthy = isRedisHealthy;
exports.redisConnected = redisConnected;
exports.disconnectRedis = disconnectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const errors_1 = require("./errors");
let client = null;
let subscriber = null;
let isConnected = false;
function buildRedisOptions() {
    const logger = (0, logger_1.getDbLogger)();
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT;
    if (!host || !port) {
        logger.warn('[Redis] REDIS_HOST or REDIS_PORT not set in environment. Connection may fail.');
    }
    return {
        host: host || '',
        port: parseInt(port || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 10) {
                logger.error('[Redis] max retries exceeded, giving up');
                return null;
            }
            const delay = Math.min(times * 200, 5000);
            logger.warn(`[Redis] retry attempt ${times}, next in ${delay}ms`);
            return delay;
        },
        reconnectOnError(err) {
            const targetErrors = ['READONLY', 'ECONNRESET'];
            return targetErrors.some(e => (0, errors_1.toErrorMessage)(err).includes(e));
        },
        lazyConnect: true,
        enableReadyCheck: true,
        connectTimeout: 10000,
        keepAlive: 30000,
        keyPrefix: process.env.REDIS_PREFIX || 'dos:',
    };
}
function wireEvents(redis, label) {
    const logger = (0, logger_1.getDbLogger)();
    redis.on('connect', () => {
        logger.info(`[Redis] ${label}: connected`);
    });
    redis.on('ready', () => {
        isConnected = true;
        logger.info(`[Redis] ${label}: ready`);
    });
    redis.on('error', (err) => {
        logger.error({ error: (0, errors_1.toErrorMessage)(err) }, `[Redis] ${label}: error`);
    });
    redis.on('close', () => {
        isConnected = false;
        logger.warn(`[Redis] ${label}: connection closed`);
    });
    redis.on('reconnecting', () => {
        logger.info(`[Redis] ${label}: reconnecting...`);
    });
}
function getRedis() {
    if (!client) {
        client = new ioredis_1.default(buildRedisOptions());
        wireEvents(client, 'client');
    }
    return client;
}
function getRedisSubscriber() {
    if (!subscriber) {
        subscriber = new ioredis_1.default(buildRedisOptions());
        wireEvents(subscriber, 'subscriber');
    }
    return subscriber;
}
async function connectRedis() {
    const logger = (0, logger_1.getDbLogger)();
    try {
        const redis = getRedis();
        await redis.connect();
        const pong = await redis.ping();
        if (pong === 'PONG') {
            isConnected = true;
            logger.info('[Redis] connection established and verified');
            return true;
        }
        return false;
    }
    catch (err) {
        logger.warn({ error: (0, errors_1.toErrorMessage)(err) }, '[Redis] connection failed (cache will use in-memory fallback)');
        isConnected = false;
        return false;
    }
}
async function isRedisHealthy() {
    if (!client || !isConnected)
        return { connected: false, latencyMs: -1 };
    try {
        const start = Date.now();
        await client.ping();
        return { connected: true, latencyMs: Date.now() - start };
    }
    catch {
        return { connected: false, latencyMs: -1 };
    }
}
function redisConnected() {
    return isConnected;
}
async function disconnectRedis() {
    const logger = (0, logger_1.getDbLogger)();
    const promises = [];
    if (client) {
        promises.push(client.quit().then(() => { client = null; }));
    }
    if (subscriber) {
        promises.push(subscriber.quit().then(() => { subscriber = null; }));
    }
    await Promise.allSettled(promises);
    isConnected = false;
    logger.info('[Redis] disconnected');
}
//# sourceMappingURL=redis.js.map