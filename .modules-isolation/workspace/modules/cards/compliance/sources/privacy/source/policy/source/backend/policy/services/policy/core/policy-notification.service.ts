// ============================================
// Policy Notification Service
// Automated notification dispatch for policy
// lifecycle events: review due, publication,
// acknowledgment nudges, exception expiry,
// approval reminders, and stale warnings.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { v4 as uuid } from 'uuid';

// ── Send Review Due Alerts ─────────────────────────────────────────────────

/**
 * Find policies with next_review_date approaching within thresholdDays
 * and insert review-due notifications into notification_queue.
 *
 * @param tenantId - Tenant identifier
 * @param thresholdDays - Days ahead to look for upcoming reviews (default: 30)
 * @returns Number of notifications enqueued
 */
export async function sendReviewDueAlerts(
  tenantId: string,
  thresholdDays: number = 30,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  // Find published policies with review dates approaching
  const result = await safeQuery(
    `SELECT p.policy_id, p.title, p.owner, p.next_review_date,
            EXTRACT(DAY FROM p.next_review_date - NOW())::int AS days_until_review
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
       AND p.status = 'published'
       AND p.next_review_date IS NOT NULL
       AND p.next_review_date > NOW()
       AND p.next_review_date <= NOW() + ($1::int * INTERVAL '1 day')`,
    [thresholdDays],
  );

  let count = 0;

  for (const policy of result.rows) {
    if (!policy.owner) continue;

    const subject = `Policy Review Due: ${policy.title}`;
    const body = `The policy "${policy.title}" is due for review in ${policy.days_until_review} day(s) (due date: ${policy.next_review_date}). Please initiate the review process.`;

    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, created_by)
       VALUES ($1, $2, 'policy_review_due', 'policy', 'medium', $3, $4, 'policy', 'email', 'pending', 'system')`,
      [uuid(), policy.owner, subject, body],
    );
    count++;
  }

  return count;
}

// ── Send Publication Alerts ────────────────────────────────────────────────

/**
 * Notify all audience members about a new policy publication.
 * Reads audience from policy_publication_audiences and creates
 * notifications for each targeted user.
 *
 * @param tenantId - Tenant identifier
 * @param publicationId - UUID of the publication
 * @returns Number of notifications enqueued
 */
export async function sendPublicationAlerts(
  tenantId: string,
  publicationId: string,
): Promise<number> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Send Acknowledgment Nudges ─────────────────────────────────────────────

/**
 * Find overdue attestation records and send reminder notifications.
 * Increments reminder_count on each record that receives a nudge.
 *
 * @param tenantId - Tenant identifier
 * @returns Number of nudge notifications enqueued
 */
export async function sendAcknowledgmentNudges(
  tenantId: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  // Find pending attestation records past due date with active campaigns
  const result = await safeQuery(
    `SELECT ar.record_id, ar.user_id, ar.campaign_id, ar.reminder_count,
            ac.name AS campaign_name, ac.due_date, ac.reminder_interval_days,
            p.title AS policy_title
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     LEFT JOIN "${schema}".policies p ON p.policy_id = ac.policy_id
     WHERE ar.status = 'pending'
       AND ac.status = 'active'
       AND ac.due_date < NOW()
       AND (ar.last_reminded_at IS NULL
            OR ar.last_reminded_at < NOW() - (COALESCE(ac.reminder_interval_days, 7) * INTERVAL '1 day'))`,
    [],
  );

  let count = 0;

  for (const record of result.rows) {
    const reminderNum = (record.reminder_count ?? 0) + 1;
    const subject = `Reminder #${reminderNum}: Policy Acknowledgment Overdue — ${record.policy_title ?? record.campaign_name}`;
    const body = `Your acknowledgment for "${record.policy_title ?? record.campaign_name}" (campaign: ${record.campaign_name}) was due on ${record.due_date}. Please complete your attestation as soon as possible. This is reminder #${reminderNum}.`;

    // Insert notification
    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
       VALUES ($1, $2, 'policy_ack_nudge', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`,
      [uuid(), record.user_id, subject, body],
    );

    // Update reminder_count and last_reminded_at
    await safeQuery(
      `UPDATE "${schema}".attestation_records
       SET reminder_count = $2, last_reminded_at = NOW()
       WHERE record_id = $1`,
      [record.record_id, reminderNum],
    );

    count++;
  }

  return count;
}

// ── Send Exception Expiry Alerts ───────────────────────────────────────────

/**
 * Find approved exceptions expiring within daysAhead and notify
 * the requestor and approvers.
 *
 * @param tenantId - Tenant identifier
 * @param daysAhead - Number of days to look ahead for expiring exceptions (default: 30)
 * @returns Number of notifications enqueued
 */
export async function sendExceptionExpiryAlerts(
  tenantId: string,
  daysAhead: number = 30,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT ex.exception_id, ex.policy_id, ex.requested_by, ex.expiry_date,
            ex.compensating_controls, ex.reason,
            p.title AS policy_title,
            EXTRACT(DAY FROM ex.expiry_date - NOW())::int AS days_until_expiry
     FROM "${schema}".policy_exception_requests ex
     LEFT JOIN "${schema}".policies p ON p.policy_id = ex.policy_id
     WHERE ex.status = 'approved'
       AND ex.expiry_date IS NOT NULL
       AND ex.expiry_date > NOW()
       AND ex.expiry_date <= NOW() + ($1::int * INTERVAL '1 day')`,
    [daysAhead],
  );

  let count = 0;

  for (const ex of result.rows) {
    const subject = `Policy Exception Expiring: ${ex.policy_title ?? ex.policy_id}`;
    const body = `The policy exception for "${ex.policy_title ?? ex.policy_id}" is expiring in ${ex.days_until_expiry} day(s) on ${ex.expiry_date}. Reason: ${ex.reason}. Please review and decide whether to renew or close the exception.`;

    // Notify the requestor
    if (ex.requested_by) {
      await safeQuery(
        `INSERT INTO "${schema}".notification_queue
          (notification_id, recipient_id, notification_type, notification_category,
           priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
         VALUES ($1, $2, 'policy_exception_expiry', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`,
        [uuid(), ex.requested_by, subject, body],
      );
      count++;
    }

    // Notify approvers from approval history
    const approverResult = await safeQuery(
      `SELECT DISTINCT approver_user_id FROM "${schema}".policy_exception_approvals
       WHERE exception_id = $1 AND decision = 'approve'`,
      [ex.exception_id],
    );

    for (const approver of approverResult.rows) {
      if (approver.approver_user_id && approver.approver_user_id !== ex.requested_by) {
        await safeQuery(
          `INSERT INTO "${schema}".notification_queue
            (notification_id, recipient_id, notification_type, notification_category,
             priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
           VALUES ($1, $2, 'policy_exception_expiry', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`,
          [uuid(), approver.approver_user_id, subject, body],
        );
        count++;
      }
    }
  }

  return count;
}

// ── Send Approval Reminders ────────────────────────────────────────────────

/**
 * Find pending policy_process_actions that are past their SLA due_date
 * and notify the assigned user.
 *
 * @param tenantId - Tenant identifier
 * @returns Number of notifications enqueued
 */
export async function sendApprovalReminders(
  tenantId: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.assigned_to,
            ppa.assigned_role, ppa.due_date, ppa.sla_hours,
            p.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies p ON p.policy_id = ppa.policy_id
     WHERE ppa.status = 'pending'
       AND ppa.due_date IS NOT NULL
       AND ppa.due_date < NOW()`,
    [],
  );

  let count = 0;

  for (const action of result.rows) {
    const recipient = action.assigned_to || action.assigned_role;
    if (!recipient) continue;

    const subject = `Approval Overdue: ${action.policy_title ?? action.policy_id} — ${action.step_key}`;
    const body = `The "${action.step_key}" step for policy "${action.policy_title ?? action.policy_id}" is overdue (was due ${action.due_date}). Please complete this action promptly to keep the policy lifecycle on track.`;

    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
       VALUES ($1, $2, 'policy_approval_reminder', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`,
      [uuid(), recipient, subject, body],
    );
    count++;
  }

  return count;
}

// ── Send Stale Warnings ────────────────────────────────────────────────────

/**
 * Find published policies not updated in monthsThreshold months
 * and notify the owner.
 *
 * @param tenantId - Tenant identifier
 * @param monthsThreshold - Number of months without update to consider stale (default: 12)
 * @returns Number of notifications enqueued
 */
export async function sendStaleWarnings(
  tenantId: string,
  monthsThreshold: number = 12,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT p.policy_id, p.title, p.owner, p.updated_at, p.next_review_date,
            EXTRACT(MONTH FROM AGE(NOW(), p.updated_at))::int AS months_since_update
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
       AND p.status = 'published'
       AND p.updated_at < NOW() - ($1::int * INTERVAL '1 month')`,
    [monthsThreshold],
  );

  let count = 0;

  for (const policy of result.rows) {
    if (!policy.owner) continue;

    const subject = `Stale Policy Warning: ${policy.title}`;
    const body = `The policy "${policy.title}" has not been updated in over ${policy.months_since_update} month(s) (last updated: ${policy.updated_at}). This policy may be outdated and should be reviewed for accuracy and relevance.`;

    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, created_by)
       VALUES ($1, $2, 'policy_stale_warning', 'policy', 'medium', $3, $4, 'policy', 'email', 'pending', 'system')`,
      [uuid(), policy.owner, subject, body],
    );
    count++;
  }

  return count;
}
