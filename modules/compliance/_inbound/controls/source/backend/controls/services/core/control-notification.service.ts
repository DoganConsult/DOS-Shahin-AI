// ============================================
// AGRC-OS — Control Notification Service
// Sends notifications for control lifecycle
// events via the notification_queue table.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlNotificationService {
  /**
   * Notifies a control owner that a test is due.
   */
  async notifyTestDue(
    tenantId: string,
    controlId: string,
    ownerUserId: string,
    dueDate: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `INSERT INTO ${schema}.notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'control_test_due', $2, $3, $4, NOW())`,
      [
        ownerUserId,
        `Control test due on ${dueDate}`,
        `A control test for control ${controlId} is due on ${dueDate}. Please ensure the test is completed before the deadline.`,
        JSON.stringify({ controlId, dueDate }),
      ]
    );
  }

  /**
   * Notifies a control owner that a test has failed.
   */
  async notifyTestFailed(
    tenantId: string,
    controlId: string,
    ownerUserId: string,
    testId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `INSERT INTO ${schema}.notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'control_test_failed', $2, $3, $4, NOW())`,
      [
        ownerUserId,
        `Control test failed`,
        `Test ${testId} for control ${controlId} has failed. Please review the results and initiate remediation if needed.`,
        JSON.stringify({ controlId, testId }),
      ]
    );
  }

  /**
   * Notifies a control owner that a certification is due.
   */
  async notifyCertificationDue(
    tenantId: string,
    requestId: string,
    ownerUserId: string,
    deadline: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `INSERT INTO ${schema}.notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'certification_due', $2, $3, $4, NOW())`,
      [
        ownerUserId,
        `Certification due by ${deadline}`,
        `Certification request ${requestId} is due by ${deadline}. Please complete your certification response.`,
        JSON.stringify({ requestId, deadline }),
      ]
    );
  }

  /**
   * Notifies relevant parties of a monitoring breach/alert.
   */
  async notifyMonitoringBreach(
    tenantId: string,
    alertId: string,
    controlId: string,
    severity: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    // Look up the control owner for notification
    const ownerResult = await safeQuery(
      `SELECT owner_user_id FROM ${schema}.controls WHERE control_id = $1`,
      [controlId]
    );

    const recipientId = ownerResult.rows[0]?.owner_user_id;
    if (!recipientId) return;

    await safeQuery(
      `INSERT INTO ${schema}.notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'monitoring_breach', $2, $3, $4, NOW())`,
      [
        recipientId,
        `Monitoring breach detected (${severity})`,
        `A ${severity} monitoring alert (${alertId}) has been triggered for control ${controlId}. Immediate attention may be required.`,
        JSON.stringify({ alertId, controlId, severity }),
      ]
    );
  }

  /**
   * Notifies the assignee that a deficiency has been created.
   */
  async notifyDeficiencyCreated(
    tenantId: string,
    deficiencyId: string,
    assignedTo: string,
    severity: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `INSERT INTO ${schema}.notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'deficiency_created', $2, $3, $4, NOW())`,
      [
        assignedTo,
        `New ${severity} deficiency assigned`,
        `Deficiency ${deficiencyId} with ${severity} severity has been assigned to you. Please review and plan remediation.`,
        JSON.stringify({ deficiencyId, severity }),
      ]
    );
  }

  /**
   * Sends an SLA warning notification when a task is approaching its deadline.
   */
  async notifySlaWarning(
    tenantId: string,
    taskId: string,
    recipientId: string,
    percentElapsed: number
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `INSERT INTO ${schema}.notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'sla_warning', $2, $3, $4, NOW())`,
      [
        recipientId,
        `SLA warning: ${percentElapsed}% elapsed`,
        `Task ${taskId} has reached ${percentElapsed}% of its SLA window. Please take action to avoid a breach.`,
        JSON.stringify({ taskId, percentElapsed }),
      ]
    );
  }
}
