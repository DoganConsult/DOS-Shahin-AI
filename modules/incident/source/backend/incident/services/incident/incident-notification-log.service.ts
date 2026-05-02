// ============================================
// Incident Notification Log Service
// Tracks all notifications sent for incidents,
// supports acknowledgement and filtering.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

// ── Types ────────────────────────────────────────────────────────────────────

interface LogNotificationInput {
  incident_id: string;
  notification_type: string;
  recipient_id: string;
  channel?: string;
  content_summary?: string;
}

interface NotificationLogFilters {
  incident_id?: string;
  notification_type?: string;
  recipient_id?: string;
}

// ── Log a notification ───────────────────────────────────────────────────────

/**
 * Records a notification entry in the incident_notifications_log table.
 */
export async function logNotification(
  tenantId: string,
  data: LogNotificationInput,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".incident_notifications_log
       (incident_id, notification_type, recipient_id, channel, content_summary)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.incident_id,
      data.notification_type,
      data.recipient_id,
      data.channel || null,
      data.content_summary || null,
    ],
  );

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.notification_logged',
      tenantId,
      severity: 'info',
      payload: {
        incidentId: data.incident_id,
        notificationType: data.notification_type,
        recipientId: data.recipient_id,
      },
    } as any)));

  return getFirstRow(result);
}

// ── Query notification log with optional filters ─────────────────────────────

/**
 * Returns notification log entries with optional filtering by incident,
 * notification type, or recipient. Joins incidents for title context.
 */
export async function getNotificationLog(
  tenantId: string,
  filters?: NotificationLogFilters,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.incident_id) {
    conditions.push(`nl.incident_id = $${paramIdx++}`);
    params.push(filters.incident_id);
  }
  if (filters?.notification_type) {
    conditions.push(`nl.notification_type = $${paramIdx++}`);
    params.push(filters.notification_type);
  }
  if (filters?.recipient_id) {
    conditions.push(`nl.recipient_id = $${paramIdx++}`);
    params.push(filters.recipient_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return (await safeQuery(
    `SELECT nl.*, i.title AS incident_title
     FROM "${schema}".incident_notifications_log nl
     LEFT JOIN "${schema}".incidents i ON i.incident_id = nl.incident_id
     ${where}
     ORDER BY nl.sent_at DESC`,
    params,
  )).rows;
}

// ── Acknowledge a notification ───────────────────────────────────────────────

/**
 * Marks a notification as acknowledged by the recipient.
 * Only the designated recipient can acknowledge.
 */
export async function acknowledgeNotification(
  tenantId: string,
  notificationId: string,
  userId: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `UPDATE "${schema}".incident_notifications_log
     SET acknowledged_at = NOW()
     WHERE notification_id = $1 AND recipient_id = $2
     RETURNING *`,
    [notificationId, userId],
  );

  return getFirstRow(result);
}

// ── Get unacknowledged notifications for a recipient ─────────────────────────

/**
 * Returns all unacknowledged notifications for a given recipient,
 * ordered by most recent first.
 */
export async function getUnacknowledgedNotifications(
  tenantId: string,
  recipientId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  return (await safeQuery(
    `SELECT nl.*, i.title AS incident_title
     FROM "${schema}".incident_notifications_log nl
     LEFT JOIN "${schema}".incidents i ON i.incident_id = nl.incident_id
     WHERE nl.recipient_id = $1 AND nl.acknowledged_at IS NULL
     ORDER BY nl.sent_at DESC`,
    [recipientId],
  )).rows;
}
