/**
 * Widget Event Publishers -- Typed emission helpers for widget domain events.
 *
 * Published events:
 *   - widgets.record.created
 *   - widgets.record.updated
 *   - widgets.record.deleted
 *   - widgets.status.changed
 *
 * @owner widgets
 * @module widgets
 */

import { emitEvent } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { WIDGETS_EVENT_TYPES } from './widgets.events';

interface WidgetEventPayload {
  tenantId: string;
  userId: string;
  entityId: string;
  entityType: 'widget' | 'widget_bundle';
  data?: Record<string, unknown>;
  previousData?: Record<string, unknown>;
}

interface StatusChangePayload extends WidgetEventPayload {
  fromStatus: string;
  toStatus: string;
}

async function emit(eventType: string, payload: WidgetEventPayload): Promise<void> {
  await emitEvent(({
      tenantId: payload.tenantId,
      userId: payload.userId,
      module: 'widgets',
      event: eventType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      data: payload.data ?? {},
      previousData: payload.previousData,
    } as any)).catch((err) => {
    logger.warn(`[widgets] Event emission failed: ${eventType}`, {
      error: err instanceof Error ? err.message : String(err),
      tenantId: payload.tenantId,
    });
  });
}

export async function emitWidgetCreated(payload: WidgetEventPayload): Promise<void> {
  await emit(WIDGETS_EVENT_TYPES.RECORD_CREATED, payload);
}

export async function emitWidgetUpdated(payload: WidgetEventPayload): Promise<void> {
  await emit(WIDGETS_EVENT_TYPES.RECORD_UPDATED, payload);
}

export async function emitWidgetDeleted(payload: WidgetEventPayload): Promise<void> {
  await emit(WIDGETS_EVENT_TYPES.RECORD_DELETED, payload);
}

export async function emitWidgetStatusChanged(payload: StatusChangePayload): Promise<void> {
  await emit(WIDGETS_EVENT_TYPES.STATUS_CHANGED, {
    ...payload,
    data: {
      ...payload.data,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
    },
  });
}
