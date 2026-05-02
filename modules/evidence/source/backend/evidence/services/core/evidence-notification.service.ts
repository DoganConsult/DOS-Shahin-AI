// ============================================================================
// Shahin-Ai -- Evidence Notification Service
//
// Evidence-specific notifications dispatched via the existing
// notification_queue table. Supports collection reminders, expiry warnings,
// review requests, overdue alerts, SLA breach alerts, and package-ready
// notifications.
//
// notification_queue columns:
//   recipient_id, notification_type, subject, body, channel, priority,
//   metadata, tenant_id, created_at
// ============================================================================

import { v4 as _uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault as _swallowDefault, EC as _EC } from '@dos/platform-core/resilience';
import { eventBus as _eventBus } from '../../ports/events.port';
import { logger } from '../../ports/logger.port';

// ── 1. sendCollectionReminder ────────────────────────────────────────────

/**
 * Send a collection reminder notification for an evidence item.
 * Notifies the assignee that evidence collection is due.
 *
 * @param tenantId     - Tenant identifier
 * @param evidenceId   - Evidence item requiring collection
 * @param assigneeId   - User ID of the person responsible for collection
 * @param controlTitle - Title of the associated control (for context in the message)
 * @param dueDate      - When the evidence is due
 */
export async function sendCollectionReminder(
  tenantId: string,
  evidenceId: string,
  assigneeId: string,
  controlTitle: string,
  dueDate: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const subject = `Evidence collection reminder: ${controlTitle}`;
  const body =
    `Evidence collection for control "${controlTitle}" is due on ${dueDate}. ` +
    `Please submit the required evidence before the deadline to maintain compliance.`;
  const metadata = JSON.stringify({
    evidence_id: evidenceId,
    control_title: controlTitle,
    due_date: dueDate,
    trigger: 'evidence_collection_reminder',
  });

  await safeQuery(
    `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_collection_reminder', $3, $4, 'in_app', 'normal', $5, NOW())`,
    [tenantId, assigneeId, subject, body, metadata],
  );

  logger.info(
    `[evidence-notification] Collection reminder sent for evidence ${evidenceId} to ${assigneeId}`,
  );
}

// ── 2. sendExpiryWarning ─────────────────────────────────────────────────

/**
 * Send expiry warning notifications for multiple evidence items in a
 * single batch. Each evidence item generates one notification row.
 *
 * @param tenantId    - Tenant identifier
 * @param evidenceIds - Array of evidence item IDs that are expiring
 * @param recipientId - User ID to notify (typically evidence owner or compliance lead)
 */
export async function sendExpiryWarning(
  tenantId: string,
  evidenceIds: string[],
  recipientId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  if (evidenceIds.length === 0) {
    return;
  }

  // Fetch titles for each evidence item for meaningful notification bodies
  const placeholders = evidenceIds.map((_, i) => `$${i + 1}`).join(', ');
  let evidenceRows: GenericRow[] = [];
  try {
    const evidenceResult = await safeQuery(
      `SELECT evidence_id, title, valid_to
       FROM "${schema}".evidence
       WHERE evidence_id IN (${placeholders})`,
      evidenceIds,
    );
    evidenceRows = evidenceResult.rows;
  } catch {
    // Fallback: proceed with empty rows; notifications will use IDs instead of titles
    logger.warn('[evidence-notification] Failed to fetch evidence titles for expiry warning');
  }

  // Build a lookup map for evidence titles and expiry dates
  const evidenceMap = new Map<string, { title: string; validTo: string }>();
  for (const row of evidenceRows) {
    evidenceMap.set(row.evidence_id, {
      title: row.title || row.evidence_id,
      validTo: row.valid_to || 'unknown',
    });
  }

  // Insert one notification per evidence item
  for (const evidenceId of evidenceIds) {
    const info = evidenceMap.get(evidenceId);
    const title = info?.title || evidenceId;
    const validTo = info?.validTo || 'unknown';

    const subject = `Evidence expiring soon: ${title}`;
    const body =
      `The evidence "${title}" is set to expire on ${validTo}. ` +
      `Please renew or replace it before expiry to maintain compliance.`;
    const metadata = JSON.stringify({
      evidence_id: evidenceId,
      title,
      valid_to: validTo,
      trigger: 'evidence_expiry_warning',
    });

    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
         (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
       VALUES ($1, $2, 'evidence_expiry_warning', $3, $4, 'in_app', 'normal', $5, NOW())`,
      [tenantId, recipientId, subject, body, metadata],
    );
  }

  logger.info(
    `[evidence-notification] Expiry warnings sent for ${evidenceIds.length} evidence item(s) to ${recipientId}`,
  );
}

// ── 3. sendReviewRequired ────────────────────────────────────────────────

/**
 * Send review-required notifications to one or more reviewers for a
 * specific evidence item. One notification per reviewer.
 *
 * @param tenantId      - Tenant identifier
 * @param evidenceId    - Evidence item requiring review
 * @param evidenceTitle - Human-readable title of the evidence
 * @param reviewerIds   - Array of reviewer user IDs to notify
 */
export async function sendReviewRequired(
  tenantId: string,
  evidenceId: string,
  evidenceTitle: string,
  reviewerIds: string[],
): Promise<void> {
  const schema = tenantSchema(tenantId);

  if (reviewerIds.length === 0) {
    return;
  }

  const subject = `Evidence review required: ${evidenceTitle}`;
  const body =
    `The evidence "${evidenceTitle}" has been submitted and requires your review. ` +
    `Please review and approve or reject the submission to keep the compliance process on track.`;

  for (const reviewerId of reviewerIds) {
    const metadata = JSON.stringify({
      evidence_id: evidenceId,
      evidence_title: evidenceTitle,
      reviewer_id: reviewerId,
      trigger: 'evidence_review_required',
    });

    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
         (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
       VALUES ($1, $2, 'evidence_review_required', $3, $4, 'in_app', 'normal', $5, NOW())`,
      [tenantId, reviewerId, subject, body, metadata],
    );
  }

  logger.info(
    `[evidence-notification] Review-required sent for evidence "${evidenceTitle}" to ${reviewerIds.length} reviewer(s)`,
  );
}

// ── 4. sendRequestOverdueAlert ───────────────────────────────────────────

/**
 * Send an overdue alert for an evidence request that has passed its due date.
 *
 * @param tenantId     - Tenant identifier
 * @param requestId    - Evidence request UUID
 * @param requestTitle - Human-readable title of the request
 * @param assigneeId   - User ID of the responsible party
 * @param dueDate      - Original due date (already passed)
 */
export async function sendRequestOverdueAlert(
  tenantId: string,
  requestId: string,
  requestTitle: string,
  assigneeId: string,
  dueDate: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const subject = `Overdue evidence request: ${requestTitle}`;
  const body =
    `Your evidence request "${requestTitle}" was due on ${dueDate} and is now overdue. ` +
    `Please submit the required evidence as soon as possible to avoid compliance gaps.`;
  const metadata = JSON.stringify({
    request_id: requestId,
    request_title: requestTitle,
    due_date: dueDate,
    trigger: 'evidence_request_overdue',
  });

  await safeQuery(
    `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_request_overdue', $3, $4, 'in_app', 'high', $5, NOW())`,
    [tenantId, assigneeId, subject, body, metadata],
  );

  logger.info(
    `[evidence-notification] Overdue alert sent for request "${requestTitle}" to ${assigneeId}`,
  );
}

// ── 5. sendSlaBreachAlert ────────────────────────────────────────────────

/**
 * Send an SLA breach alert for an evidence item. Uses high priority
 * to ensure visibility. The escalation level is included in the message
 * for escalation-chain awareness.
 *
 * @param tenantId        - Tenant identifier
 * @param evidenceId      - Evidence item that breached SLA
 * @param evidenceTitle   - Human-readable title of the evidence
 * @param escalationLevel - Current escalation level (1 = initial breach, 2+ = escalated)
 * @param recipientId     - User ID to notify (escalation target)
 */
export async function sendSlaBreachAlert(
  tenantId: string,
  evidenceId: string,
  evidenceTitle: string,
  escalationLevel: number,
  recipientId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const levelLabel = escalationLevel === 1
    ? 'Initial breach'
    : `Escalation level ${escalationLevel}`;

  const subject = `SLA breach: ${evidenceTitle} (${levelLabel})`;
  const body =
    `The evidence "${evidenceTitle}" has breached its SLA deadline. ` +
    `${levelLabel} notification. ` +
    `Immediate action is required to resolve this compliance gap.`;
  const metadata = JSON.stringify({
    evidence_id: evidenceId,
    evidence_title: evidenceTitle,
    escalation_level: escalationLevel,
    trigger: 'evidence_sla_breach',
  });

  await safeQuery(
    `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_sla_breach', $3, $4, 'in_app', 'high', $5, NOW())`,
    [tenantId, recipientId, subject, body, metadata],
  );

  logger.info(
    `[evidence-notification] SLA breach alert (level ${escalationLevel}) sent for evidence "${evidenceTitle}" to ${recipientId}`,
  );
}

// ── 6. sendPackageReadyAlert ─────────────────────────────────────────────

/**
 * Send an alert when an evidence package has been finalized and is
 * ready for review or export.
 *
 * @param tenantId    - Tenant identifier
 * @param packageId   - Evidence package UUID
 * @param packageName - Human-readable name of the package
 * @param recipientId - User ID to notify (typically compliance lead or auditor)
 */
export async function sendPackageReadyAlert(
  tenantId: string,
  packageId: string,
  packageName: string,
  recipientId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const subject = `Evidence package ready: ${packageName}`;
  const body =
    `The evidence package "${packageName}" has been finalized and is ready for review or export. ` +
    `You can now review the package contents and export it in the required format.`;
  const metadata = JSON.stringify({
    package_id: packageId,
    package_name: packageName,
    trigger: 'evidence_package_ready',
  });

  await safeQuery(
    `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_package_ready', $3, $4, 'in_app', 'normal', $5, NOW())`,
    [tenantId, recipientId, subject, body, metadata],
  );

  logger.info(
    `[evidence-notification] Package-ready alert sent for "${packageName}" to ${recipientId}`,
  );
}

export interface BatchNotifyResult {
  overdueReminders: number;
  expiryAlerts: number;
  reviewNudges: number;
  connectorAlerts: number;
}

export async function batchNotify(tenantId: string): Promise<BatchNotifyResult> {
  const schema = tenantSchema(tenantId);
  let overdueReminders = 0;
  let expiryAlerts = 0;
  let reviewNudges = 0;
  const connectorAlerts = 0;

  try {
    const overdueRows = await safeQuery(
      `SELECT e.evidence_id, e.assignee_id, c.title AS control_title, e.due_date
       FROM "${schema}".evidence_items e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.status = 'pending' AND e.due_date < NOW()
         AND e.assignee_id IS NOT NULL
       LIMIT 100`,
    );
    for (const row of overdueRows.rows) {
      try {
        await sendRequestOverdueAlert(tenantId, row.evidence_id, row.assignee_id, row.control_title || 'N/A', row.due_date);
        overdueReminders++;
      } catch { /* skip individual failures */ }
    }

    const expiryRows = await safeQuery(
      `SELECT e.evidence_id, e.assignee_id, c.title AS control_title, e.valid_to
       FROM "${schema}".evidence_items e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.freshness_status = 'expiring_soon'
         AND e.assignee_id IS NOT NULL
       LIMIT 100`,
    );
    const expiryByRecipient = new Map<string, string[]>();
    for (const row of expiryRows.rows) {
      const key = row.assignee_id as string;
      if (!expiryByRecipient.has(key)) expiryByRecipient.set(key, []);
      expiryByRecipient.get(key)!.push(row.evidence_id as string);
    }
    for (const [recipientId, evidenceIds] of expiryByRecipient) {
      try {
        await sendExpiryWarning(tenantId, evidenceIds, recipientId);
        expiryAlerts += evidenceIds.length;
      } catch { /* skip individual failures */ }
    }

    const reviewRows = await safeQuery(
      `SELECT e.evidence_id, e.reviewer_id, c.title AS control_title
       FROM "${schema}".evidence_items e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.status = 'pending_review'
         AND e.reviewer_id IS NOT NULL
       LIMIT 100`,
    );
    for (const row of reviewRows.rows) {
      try {
        await sendReviewRequired(tenantId, row.evidence_id, row.control_title || 'N/A', [row.reviewer_id as string]);
        reviewNudges++;
      } catch { /* skip individual failures */ }
    }
  } catch (err) {
    logger.warn(`[evidence-notification] batchNotify failed for tenant ${tenantId}: ${(err as Error).message}`);
  }

  return { overdueReminders, expiryAlerts, reviewNudges, connectorAlerts };
}
