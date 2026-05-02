import { publish } from '@dos/event-backbone';

export interface CreateNotificationInput {
  userId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
}

/**
 * Create an in-app notification for a user.
 *
 * The workflow module does not own the notification pipeline — it publishes
 * an event on the canonical backbone and lets `notification-inbox-service`
 * persist + dispatch. Best-effort: errors are swallowed by callers.
 */
export async function createNotification(
  tenantId: string,
  notification: CreateNotificationInput,
): Promise<void> {
  await publish('notification.created', tenantId, {
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    data: notification.data,
  });
}

/** Legacy facade object kept for callers that still dereference methods. */
export const notificationService = {
  send: createNotification,
  broadcast: async (tenantId: string, message: Record<string, unknown>) => {
    await publish('notification.broadcast', tenantId, message);
  },
};
