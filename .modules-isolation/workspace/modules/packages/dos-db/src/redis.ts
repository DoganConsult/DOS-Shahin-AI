import Redis, { RedisOptions } from 'ioredis';
import { getDbLogger } from './logger';
import { toErrorMessage } from './errors';
import { assertTenantId } from './tenant';

let client: Redis | null = null;
let subscriber: Redis | null = null;
let isConnected = false;

function buildRedisOptions(): RedisOptions {
  const logger = getDbLogger();
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
    retryStrategy(times: number) {
      if (times > 10) {
        logger.error('[Redis] max retries exceeded, giving up');
        return null;
      }
      const delay = Math.min(times * 200, 5000);
      logger.warn(`[Redis] retry attempt ${times}, next in ${delay}ms`);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET'];
      return targetErrors.some(e => toErrorMessage(err).includes(e));
    },
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 10000,
    keepAlive: 30000,
    keyPrefix: process.env.REDIS_PREFIX || 'dos:',
  };
}

function wireEvents(redis: Redis, label: string): void {
  const logger = getDbLogger();
  redis.on('connect', () => {
    logger.info(`[Redis] ${label}: connected`);
  });
  redis.on('ready', () => {
    isConnected = true;
    logger.info(`[Redis] ${label}: ready`);
  });
  redis.on('error', (err) => {
    logger.error({ error: toErrorMessage(err) }, `[Redis] ${label}: error`);
  });
  redis.on('close', () => {
    isConnected = false;
    logger.warn(`[Redis] ${label}: connection closed`);
  });
  redis.on('reconnecting', () => {
    logger.info(`[Redis] ${label}: reconnecting...`);
  });
}

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(buildRedisOptions());
    wireEvents(client, 'client');
  }
  return client;
}

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(buildRedisOptions());
    wireEvents(subscriber, 'subscriber');
  }
  return subscriber;
}

export async function connectRedis(): Promise<boolean> {
  const logger = getDbLogger();
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
  } catch (err: unknown) {
    logger.warn({ error: toErrorMessage(err) }, '[Redis] connection failed (cache will use in-memory fallback)');
    isConnected = false;
    return false;
  }
}

export async function isRedisHealthy(): Promise<{ connected: boolean; latencyMs: number }> {
  if (!client || !isConnected) return { connected: false, latencyMs: -1 };
  try {
    const start = Date.now();
    await client.ping();
    return { connected: true, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: -1 };
  }
}

export function redisConnected(): boolean {
  return isConnected;
}

export function tenantCacheKey(tenantId: string, key: string): string {
  assertTenantId(tenantId);
  if (!key) throw new Error('tenantCacheKey: key is required');
  return `t:${tenantId}:${key}`;
}

export function tenantUserCacheKey(tenantId: string, userId: string, key: string): string {
  assertTenantId(tenantId);
  if (!userId) throw new Error('tenantUserCacheKey: userId is required');
  if (!key) throw new Error('tenantUserCacheKey: key is required');
  return `t:${tenantId}:u:${userId}:${key}`;
}

export async function disconnectRedis(): Promise<void> {
  const logger = getDbLogger();
  const promises: Promise<void>[] = [];
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
