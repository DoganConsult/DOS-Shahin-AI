/**
 * workflow-service / notification adapter.
 *
 * Publishes a `notification.created` event on the canonical event backbone.
 * `notification-inbox-service` owns persistence + dispatch; this adapter
 * is a thin best-effort publisher so the workflow engine stays non-blocking
 * and does not need to know about SMTP/SMS/push transports.
 *
 * Call shapes:
 *   createNotification(tenantId, { userId, type, title, body?, link?, data? })
 *   createNotification({ tenantId, userId, type, title, body?, link?, data? })
 *
 * The 2-arg form is used by Temporal activities (policy, risk, etc.). The
 * single-object form is kept for callers that already bundle tenantId into
 * the payload.
 */
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface CreateNotificationInput {
  tenantId?: string;
  userId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
  /** Optional domain-entity routing fields — merged into the event payload. */
  entityType?: string;
  entityId?: string;
  moduleCode?: string;
  severity?: 'info' | 'warn' | 'warning' | 'error' | 'critical';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  tenantIdOrPayload: string | CreateNotificationInput,
  payload?: CreateNotificationInput,
): Promise<void> {
  let tenantId: string | undefined;
  let body: CreateNotificationInput;
  if (typeof tenantIdOrPayload === 'string') {
    tenantId = tenantIdOrPayload;
    body = payload ?? { type: 'unknown', title: '(empty)' };
  } else {
    tenantId = tenantIdOrPayload.tenantId;
    body = tenantIdOrPayload;
  }
  try {
    await publish('notification.created', tenantId ?? '', {
      userId: body.userId,
      type: body.type,
      title: body.title,
      body: body.body,
      link: body.link ?? body.actionUrl,
      entityType: body.entityType,
      entityId: body.entityId,
      moduleCode: body.moduleCode,
      severity: body.severity,
      data: body.data ?? body.metadata,
    });
  } catch (err) {
    logger.warn('[NotificationAdapter] publish failed', {
      tenantId, type: body.type, error: toErrorMessage(err),
    });
  }
}
