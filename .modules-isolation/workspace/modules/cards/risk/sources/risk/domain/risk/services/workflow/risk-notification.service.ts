/**
 * Risk Notification Service — per spec section 13 (risk-notification.service)
 *
 * Manages risk-specific notifications:
 *   - Due alerts (review dates, treatment deadlines)
 *   - Breach alerts (KRI threshold breaches)
 *   - Escalation alerts (SLA breaches, risk escalations)
 *   - Review reminders (periodic risk review cycles)
 *
 * Integrates with the shared notification_queue table.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent as _emitEvent } from '../../ports/events.port';

export type RiskNotificationType =
  | 'risk_review_due'
  | 'treatment_overdue'
  | 'kri_breach'
  | 'risk_escalated'
  | 'assessment_due'
  | 'appetite_breach'
  | 'issue_assigned'
  | 'treatment_completed';

export interface RiskNotification {
  recipientId: string;
  notificationType: RiskNotificationType;
  subject: string;
  body: string;
  entityType: string;
  entityId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export async function sendRiskNotification(tenantId: string, notification: RiskNotification) {
  const ts = tenantSchema(tenantId);

  const { rows } = await safeQuery(`
    INSERT INTO ${ts}.notification_queue (
      recipient_id, notification_type, subject, body,
      entity_type, entity_id, priority, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING notification_id
  `, [
    notification.recipientId,
    notification.notificationType,
    notification.subject,
    notification.body,
    notification.entityType,
    notification.entityId,
    notification.priority,
  ]);

  return rows[0]?.notification_id;
}

export async function sendBulkRiskNotifications(tenantId: string, notifications: RiskNotification[]) {
  const results: string[] = [];
  for (const n of notifications) {
    const id = await sendRiskNotification(tenantId, n);
    if (id) results.push(id);
  }
  return results;
}

export async function notifyRiskReviewDue(tenantId: string) {
  const ts = tenantSchema(tenantId);

  // Find risks with review dates in the next 7 days
  const { rows: risks } = await safeQuery(`
    SELECT r.risk_id, r.title, r.owner, r.owner_user_id, r.next_review_date
    FROM ${ts}.risks r
    WHERE r.next_review_date IS NOT NULL
      AND r.next_review_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND r.status NOT IN ('closed', 'archived')
      AND r.deleted_at IS NULL
  `, []);

  const notifications: RiskNotification[] = risks
    .filter(r => r.owner_user_id || r.owner)
    .map(r => ({
      recipientId: r.owner_user_id || r.owner,
      notificationType: 'risk_review_due' as RiskNotificationType,
      subject: `Risk Review Due: ${r.title}`,
      body: `Risk "${r.title}" (${r.risk_id}) is due for review on ${r.next_review_date}.`,
      entityType: 'risk',
      entityId: r.risk_id,
      priority: 'normal' as const,
    }));

  return sendBulkRiskNotifications(tenantId, notifications);
}

export async function notifyTreatmentOverdue(tenantId: string) {
  const ts = tenantSchema(tenantId);

  const { rows: treatments } = await safeQuery(`
    SELECT tp.treatment_id, tp.risk_id, tp.owner, tp.end_date, r.title as risk_title
    FROM ${ts}.risk_treatments tp
    JOIN ${ts}.risks r ON r.risk_id = tp.risk_id
    WHERE tp.treatment_status NOT IN ('completed', 'closed')
      AND tp.end_date < NOW()
  `, []);

  const notifications: RiskNotification[] = treatments
    .filter(t => t.owner)
    .map(t => ({
      recipientId: t.owner,
      notificationType: 'treatment_overdue' as RiskNotificationType,
      subject: `Treatment Overdue: ${t.risk_title}`,
      body: `Treatment plan for risk "${t.risk_title}" was due on ${t.end_date}. Please update or close the treatment.`,
      entityType: 'risk_treatment',
      entityId: t.treatment_id,
      priority: 'high' as const,
    }));

  return sendBulkRiskNotifications(tenantId, notifications);
}

export async function notifyKRIBreach(tenantId: string, kriId: string, breachId: string) {
  const ts = tenantSchema(tenantId);

  const { rows } = await safeQuery(`
    SELECT k.name, k.owner, bl.breach_value, bl.threshold_breached, bl.threshold_value
    FROM ${ts}.kri_breach_log bl
    JOIN ${ts}.risk_kris k ON k.kri_id = bl.kri_id
    WHERE bl.breach_id = $1
  `, [breachId]);

  if (!rows[0]?.owner) return null;

  return sendRiskNotification(tenantId, {
    recipientId: rows[0].owner,
    notificationType: 'kri_breach',
    subject: `KRI Breach: ${rows[0].name}`,
    body: `KRI "${rows[0].name}" breached ${rows[0].threshold_breached} threshold (value: ${rows[0].breach_value}, threshold: ${rows[0].threshold_value}).`,
    entityType: 'risk_kri',
    entityId: kriId,
    priority: rows[0].threshold_breached === 'red' ? 'urgent' : 'high',
  });
}
