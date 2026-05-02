/**
 * OpenClaw A2A Message Consumer.
 *
 * Listens for new messages via Redis pub/sub notification,
 * dequeues from PostgreSQL, and runs the provided handler.
 * Falls back to periodic polling when Redis is unavailable.
 */

import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { dequeueA2AMessages, ackA2AMessage, nackA2AMessage, type A2AMessage } from './agent-message-queue';
import { subscribeToAgent, unsubscribeFromAgent, isRedisAvailable } from './a2a-redis-notifier';

export type A2AMessageHandler = (message: A2AMessage) => Promise<void>;

interface ConsumerHandle {
  tenantId: string;
  agentId: string;
  stop: () => void;
}

const POLL_INTERVAL_MS = parseInt(process.env.A2A_POLL_INTERVAL_MS || '10000', 10);
const BATCH_SIZE = parseInt(process.env.A2A_BATCH_SIZE || '10', 10);

/**
 * Start consuming A2A messages for a specific agent.
 *
 * Uses Redis pub/sub for real-time delivery with a periodic
 * polling fallback to catch any missed notifications.
 *
 * Returns a handle with a `stop()` method for cleanup.
 */
export async function startA2AConsumer(
  tenantId: string,
  agentId: string,
  handler: A2AMessageHandler,
): Promise<ConsumerHandle> {
  let running = true;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function processMessages(): Promise<void> {
    if (!running) return;

    try {
      const messages = await dequeueA2AMessages(tenantId, agentId, BATCH_SIZE);
      for (const msg of messages) {
        if (!running) break;
        try {
          await handler(msg);
          await ackA2AMessage(tenantId, msg.messageId);
        } catch (err: unknown) {
          const errMsg = toErrorMessage(err) || 'Handler execution failed';
          logger.warn(`[A2A-Consumer] Handler failed for ${msg.messageId}: ${errMsg}`);
          await nackA2AMessage(tenantId, msg.messageId, errMsg);
        }
      }
    } catch (err: unknown) {
      logger.warn(`[A2A-Consumer] Dequeue failed for agent ${agentId}: ${toErrorMessage(err)}`);
    }
  }

  // Attempt Redis subscription for real-time notifications
  const subscribed = await subscribeToAgent(tenantId, agentId, () => {
    processMessages().catch((err) =>
      logger.warn(`[A2A-Consumer] Process on notification failed: ${toErrorMessage(err)}`),
    );
  });

  if (subscribed && isRedisAvailable()) {
    logger.info(`[A2A-Consumer] Agent ${agentId}: Redis-backed real-time mode`);
  } else {
    logger.info(`[A2A-Consumer] Agent ${agentId}: polling-only mode (Redis unavailable)`);
  }

  // Always set up polling fallback (catches missed notifications + handles Redis outage)
  pollTimer = setInterval(() => {
    processMessages().catch((err) =>
      logger.warn(`[A2A-Consumer] Poll cycle failed: ${toErrorMessage(err)}`),
    );
  }, POLL_INTERVAL_MS);

  // Do an initial dequeue immediately
  await processMessages();

  return {
    tenantId,
    agentId,
    stop: () => {
      running = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      unsubscribeFromAgent(tenantId, agentId).catch((err) =>
        logger.warn(`[A2A-Consumer] Unsubscribe on stop failed: ${toErrorMessage(err)}`),
      );
      logger.info(`[A2A-Consumer] Stopped consumer for agent ${agentId}`);
    },
  };
}
