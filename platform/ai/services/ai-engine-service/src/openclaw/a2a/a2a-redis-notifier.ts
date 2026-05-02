/**
 * OpenClaw A2A Redis Pub/Sub Notification Layer.
 *
 * Provides real-time notification when messages are enqueued,
 * allowing consumers to react immediately instead of polling.
 *
 * Channel pattern: a2a:{tenantId}:agent:{agentId}
 *
 * Gracefully degrades when Redis is unavailable — consumers
 * fall back to periodic polling via the PostgreSQL queue.
 */

import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/platform-core/resilience';

type RedisClientType = any;
let createClient: any;
try { ({ createClient } = require('redis')); } catch { createClient = null; }

let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;
let redisAvailable = false;

const subscriptions = new Map<string, (messageId: string) => void>();

function channelKey(tenantId: string, agentId: string): string {
  return `a2a:${tenantId}:agent:${agentId}`;
}

async function ensurePubClient(): Promise<RedisClientType | null> {
  if (pubClient) return pubClient;
  if (!createClient) return null;

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
  if (!redisUrl) return null;

  try {
    pubClient = createClient({ url: redisUrl });
    pubClient.on('error', (err: unknown) => {
      logger.error('[A2A-Redis] Pub client error:', toErrorMessage(err));
      redisAvailable = false;
    });
    await pubClient.connect();
    redisAvailable = true;
    logger.info('[A2A-Redis] Pub client connected');
    return pubClient;
  } catch (err: unknown) {
    logger.warn('[A2A-Redis] Pub client connection failed — notifications disabled:', toErrorMessage(err));
    pubClient = null;
    return null;
  }
}

async function ensureSubClient(): Promise<RedisClientType | null> {
  if (subClient) return subClient;
  if (!createClient) return null;

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
  if (!redisUrl) return null;

  try {
    subClient = createClient({ url: redisUrl });
    subClient.on('error', (err: unknown) => {
      logger.error('[A2A-Redis] Sub client error:', toErrorMessage(err));
    });
    await subClient.connect();
    logger.info('[A2A-Redis] Sub client connected');
    return subClient;
  } catch (err: unknown) {
    logger.warn('[A2A-Redis] Sub client connection failed:', toErrorMessage(err));
    subClient = null;
    return null;
  }
}

/**
 * Notify that a new message has been enqueued for an agent.
 * Called after PostgreSQL insert in enqueueA2AMessage().
 */
export async function notifyNewMessage(
  tenantId: string,
  toAgentId: string,
  messageId: string,
): Promise<void> {
  try {
    const client = await ensurePubClient();
    if (!client || !redisAvailable) return;

    const channel = channelKey(tenantId, toAgentId);
    await client.publish(channel, messageId);
  } catch (err: unknown) {
    // Non-fatal: consumer will pick up via polling
    logger.warn(`[A2A-Redis] Publish failed: ${toErrorMessage(err)}`);
  }
}

/**
 * Subscribe to new message notifications for a specific agent.
 * The callback receives the messageId of the newly enqueued message.
 */
export async function subscribeToAgent(
  tenantId: string,
  agentId: string,
  callback: (messageId: string) => void,
): Promise<boolean> {
  try {
    const client = await ensureSubClient();
    if (!client) return false;

    const channel = channelKey(tenantId, agentId);
    subscriptions.set(channel, callback);

    await client.subscribe(channel, (message: string) => {
      const handler = subscriptions.get(channel);
      if (handler) {
        try {
          handler(message);
        } catch (err: unknown) {
          logger.warn(`[A2A-Redis] Subscription handler error: ${toErrorMessage(err)}`);
        }
      }
    });

    logger.info(`[A2A-Redis] Subscribed to ${channel}`);
    return true;
  } catch (err: unknown) {
    logger.warn(`[A2A-Redis] Subscribe failed: ${toErrorMessage(err)}`);
    return false;
  }
}

/**
 * Unsubscribe from an agent's message notifications.
 */
export async function unsubscribeFromAgent(
  tenantId: string,
  agentId: string,
): Promise<void> {
  try {
    const channel = channelKey(tenantId, agentId);
    subscriptions.delete(channel);

    if (subClient) {
      await subClient.unsubscribe(channel);
      logger.info(`[A2A-Redis] Unsubscribed from ${channel}`);
    }
  } catch (err: unknown) {
    logger.warn(`[A2A-Redis] Unsubscribe failed: ${toErrorMessage(err)}`);
  }
}

/**
 * Check if Redis pub/sub is available.
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Gracefully disconnect Redis clients.
 * Call during service shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  subscriptions.clear();
  try {
    if (subClient) { await subClient.quit(); subClient = null; }
    if (pubClient) { await pubClient.quit(); pubClient = null; }
    redisAvailable = false;
  } catch (err: unknown) {
    logger.warn(`[A2A-Redis] Disconnect error: ${toErrorMessage(err)}`);
  }
}
