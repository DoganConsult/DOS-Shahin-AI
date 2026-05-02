// ============================================
// Shahin -- Notification Deadline Checks
// Scans tenant tables for upcoming deadlines
// and creates in-app notifications for assignees
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { createNotification, dispatchDeadlineNotifications } from './notification.service';

/**
 * Check for upcoming deadlines and create notifications.
 *
 * Queries:
 *  1. remediation_tasks with due_date within the next 7 days (table may not exist yet -- Phase 3)
 *  2. policies with review_date within the next 7 days
 *  3. evidence with expiry_date within the next 7 days (column may not exist yet -- Phase 2)
 *  4. assessments stalled for >14 days
 *  5. workflow approvals approaching SLA deadline (within 24 hours)
 *  6. vendor reviews due within 30 days
 *  7. controls with failed test status needing re-test
 *
 * For each item found, creates an in-app notification via `createNotification`.
 * Returns the total number of notifications created.
 */
export async function checkDeadlineNotifications(
  tenantId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);
  let created = 0;

  // --- Remediation tasks due within 7 days ---
  try {
    const taskResult = await safeQuery(
      `SELECT task_id, title, assigned_to, due_date
       FROM "${schema}".remediation_tasks
       WHERE due_date IS NOT NULL
         AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND status NOT IN ('completed', 'overdue')`,
      []
    );
    for (const row of taskResult.rows) {
      if (!row.assigned_to) continue;

      // Use DB-driven dispatch with fallback
      const daysUntil = Math.ceil((new Date(row.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const dispatched = await dispatchDeadlineNotifications(tenantId, row.assigned_to, daysUntil, {
        entityType: 'remediation',
        entityId: row.task_id,
        entityTitle: row.title,
        dueDate: row.due_date,
      });

      if (dispatched.length > 0) {
        // Notifications dispatched via DB-driven rules
        for (const notif of dispatched) {
          await createNotification(tenantId, {
            userId: notif.userId,
            type: notif.type,
            title: notif.title,
            body: notif.body,
            link: notif.link,
          });
          created++;
        }
      } else {
        // Fallback: create directly
        await createNotification(tenantId, {
          userId: row.assigned_to,
          type: "deadline_reminder",
          title: `Remediation task due soon: ${row.title}`,
          body: `Task "${row.title}" is due on ${row.due_date}.`,
          link: `/remediation/${row.task_id}`,
        });
        created++;
      }
    }
  } catch (err: unknown) {
    // remediation_tasks table may not exist yet (Phase 3)
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  // --- Policy review dates within 7 days ---
  try {
    const policyResult = await safeQuery(
      `SELECT policy_id, title, owner_id, review_date
       FROM "${schema}".policies
       WHERE review_date IS NOT NULL
         AND review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND status != 'archived'`,
      []
    );
    for (const row of policyResult.rows) {
      if (!row.owner_id) continue;
      await createNotification(tenantId, {
        userId: row.owner_id,
        type: "deadline_reminder",
        title: `Policy review due soon: ${row.title}`,
        body: `Policy "${row.title}" review is due on ${row.review_date}.`,
        link: `/policies/${row.policy_id}`,
      });
      created++;
    }
  } catch (err: unknown) {
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  // --- Evidence expiring within 7 days ---
  try {
    const evidenceResult = await safeQuery(
      `SELECT evidence_id, title, submitted_by, expiry_date
       FROM "${schema}".evidence
       WHERE expiry_date IS NOT NULL
         AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
      []
    );
    for (const row of evidenceResult.rows) {
      if (!row.submitted_by) continue;
      await createNotification(tenantId, {
        userId: row.submitted_by,
        type: "deadline_reminder",
        title: `Evidence expiring soon: ${row.title}`,
        body: `Evidence "${row.title}" expires on ${row.expiry_date}.`,
        link: `/evidence/${row.evidence_id}`,
      });
      created++;
    }
  } catch (err: unknown) {
    // expiry_date column may not exist yet (Phase 2)
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  // --- Assessments in progress with stale updated_at (>14 days) ---
  try {
    const staleAssessments = await safeQuery(
      `SELECT assessment_id, title, created_by
       FROM "${schema}".assessments
       WHERE status = 'in_progress'
         AND updated_at < CURRENT_DATE - INTERVAL '14 days'`,
      []
    );
    for (const row of staleAssessments.rows) {
      if (!row.created_by) continue;
      await createNotification(tenantId, {
        userId: row.created_by,
        type: "deadline_reminder",
        title: `Assessment stalled: ${row.title}`,
        body: `Assessment "${row.title}" has not been updated in over 14 days.`,
        link: `/assessments/${row.assessment_id}`,
      });
      created++;
    }
  } catch (err: unknown) {
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  // --- Workflow approvals approaching SLA deadline (within 24 hours) ---
  try {
    const urgentApprovals = await safeQuery(
      `SELECT approval_id, approver_id, step_id, sla_deadline, execution_id
       FROM "${schema}".approvals
       WHERE status = 'pending'
         AND sla_deadline IS NOT NULL
         AND sla_deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`,
      []
    );
    for (const row of urgentApprovals.rows) {
      if (!row.approver_id) continue;
      await createNotification(tenantId, {
        userId: row.approver_id,
        type: "sla_warning",
        title: `Approval SLA expiring in <24h`,
        body: `Your approval for step ${row.step_id} is due by ${row.sla_deadline}. Please review promptly.`,
        link: `/workflows/${row.execution_id}`,
      });
      created++;
    }
  } catch (err: unknown) {
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  // --- Vendor reviews due within 30 days ---
  try {
    const vendorReviews = await safeQuery(
      `SELECT vendor_id, name, owner_id, next_review_date
       FROM "${schema}".vendors
       WHERE next_review_date IS NOT NULL
         AND next_review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND status != 'terminated'`,
      []
    );
    for (const row of vendorReviews.rows) {
      if (!row.owner_id) continue;
      await createNotification(tenantId, {
        userId: row.owner_id,
        type: "vendor_review_reminder",
        title: `Vendor review due: ${row.name}`,
        body: `Vendor "${row.name}" review is due on ${row.next_review_date}.`,
        link: `/vendors/${row.vendor_id}`,
      });
      created++;
    }
  } catch (err: unknown) {
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  // --- Controls with failed test status needing re-test ---
  try {
    const failedControls = await safeQuery(
      `SELECT control_id, title, owner
       FROM "${schema}".controls
       WHERE test_status = 'failed'
         AND last_tested_at < CURRENT_DATE - INTERVAL '7 days'`,
      []
    );
    for (const row of failedControls.rows) {
      if (!row.owner) continue;
      await createNotification(tenantId, {
        userId: row.owner,
        type: "control_retest_needed",
        title: `Control re-test needed: ${row.title}`,
        body: `Control "${row.title}" failed testing and needs re-testing.`,
        link: `/controls/${row.control_id}`,
      });
      created++;
    }
  } catch (err: unknown) {
    if (!toErrorMessage(err).includes("does not exist")) throw err;
  }

  return created;
}
