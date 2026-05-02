// ============================================
// AGRC-OS — Control Workflow Service
// Orchestrates control lifecycle workflows:
// test scheduling, team assignment, evidence
// requests, and remediation reviews.
// ============================================

import { safeQuery as _safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlWorkflowService {
  /**
   * Schedules a control test by inserting into control_tests
   * with status='scheduled' and creating a corresponding
   * process_task for tracking.
   */
  async scheduleTest(
    tenantId: string,
    controlId: string,
    testType: string,
    scheduledAt: string,
    testerId: string
  ): Promise<{ testId: string }> {
    const schema = tenantSchema(tenantId);

    const testId = await withTransaction(tenantId, async (client) => {
      const testResult = await safeQueryWithClient(
        `INSERT INTO ${schema}.control_tests
           (control_id, test_type, status, scheduled_at, tester_id, created_at)
         VALUES ($1, $2, 'scheduled', $3, $4, NOW())
         RETURNING id`,
        [controlId, testType, scheduledAt, testerId], client
      );

      const id = testResult.rows[0].id;

      await safeQueryWithClient(
        `INSERT INTO ${schema}.process_tasks
           (task_type, entity_type, entity_id, assigned_to, status, due_date, created_at)
         VALUES ('control_test', 'control_test', $1, $2, 'open', $3, NOW())`,
        [id, testerId, scheduledAt], client
      );

      return id;
    });

    emitEvent(({
          tenantId,
          userId: testerId,
          module: "controls",
          event: "created",
          entityType: "control_test",
          entityId: testId,
          data: { controlId, testType, scheduledAt },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    return { testId };
  }

  /**
   * Assigns a team to a control by updating the owner_team_id
   * and recording the change in control_status_history.
   */
  async assignTeam(
    tenantId: string,
    controlId: string,
    teamId: string,
    assignedBy: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    const previousTeamId = await withTransaction(tenantId, async (client) => {
      const currentResult = await safeQueryWithClient(
        `SELECT owner_team_id FROM ${schema}.controls WHERE control_id = $1 FOR UPDATE`,
        [controlId], client
      );

      const prevTeam = currentResult.rows[0]?.owner_team_id ?? null;

      await safeQueryWithClient(
        `UPDATE ${schema}.controls
            SET owner_team_id = $1,
                updated_at = NOW()
          WHERE control_id = $2`,
        [teamId, controlId], client
      );

      await safeQueryWithClient(
        `INSERT INTO ${schema}.control_status_history
           (control_id, field_changed, old_value, new_value, changed_by, changed_at)
         VALUES ($1, 'owner_team_id', $2, $3, $4, NOW())`,
        [controlId, prevTeam, teamId, assignedBy], client
      );

      return prevTeam;
    });

    emitEvent(({
          tenantId,
          userId: assignedBy,
          module: "controls",
          event: "updated",
          entityType: "control",
          entityId: controlId,
          data: { teamId, previousTeamId },
        } as any)).catch(catchHandler(EC.EVENT_BUS));
  }

  /**
   * Creates an evidence request for a control by inserting into
   * evidence_tasks and creating a process_task for tracking.
   */
  async requestEvidence(
    tenantId: string,
    controlId: string,
    evidenceTypeCode: string,
    assignedTo: string
  ): Promise<{ requestId: string }> {
    const schema = tenantSchema(tenantId);

    const requestId = await withTransaction(tenantId, async (client) => {
      const evidenceResult = await safeQueryWithClient(
        `INSERT INTO ${schema}.evidence_tasks
           (tenant_id, control_id, evidence_type_code, status, assigned_to, created_at)
         VALUES ($1, $2, $3, 'pending', $4, NOW())
         RETURNING task_id`,
        [tenantId, controlId, evidenceTypeCode, assignedTo], client
      );

      const id = evidenceResult.rows[0].task_id;

      await safeQueryWithClient(
        `INSERT INTO ${schema}.process_tasks
           (task_type, entity_type, entity_id, assigned_to, status, created_at)
         VALUES ('evidence_request', 'evidence_task', $1, $2, 'open', NOW())`,
        [id, assignedTo], client
      );

      return id;
    });

    emitEvent(({
          tenantId,
          userId: assignedTo,
          module: "evidence",
          event: "created",
          entityType: "evidence_task",
          entityId: requestId,
          data: { controlId, evidenceTypeCode },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    return { requestId };
  }

  /**
   * Reviews a remediation action with a decision (approved,
   * rejected, or requires_retest). Creates a closure_review
   * record and updates the action status accordingly.
   */
  async reviewRemediation(
    tenantId: string,
    actionId: string,
    reviewerId: string,
    decision: "approved" | "rejected" | "requires_retest",
    comments: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    const controlId = await withTransaction(tenantId, async (client) => {
      const actionResult = await safeQueryWithClient(
        `SELECT control_id FROM ${schema}.control_actions WHERE action_id = $1`,
        [actionId], client
      );

      if (actionResult.rows.length === 0) {
        throw new Error(`Remediation action ${actionId} not found`);
      }

      const ctrlId = actionResult.rows[0].control_id;

      await safeQueryWithClient(
        `INSERT INTO ${schema}.control_closure_reviews
           (deficiency_id, control_id, reviewer_id, decision, comments, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [actionId, ctrlId, reviewerId, decision, comments], client
      );

      if (decision === "approved") {
        await safeQueryWithClient(
          `UPDATE ${schema}.control_actions
              SET status = 'completed',
                  updated_at = NOW()
            WHERE action_id = $1`,
          [actionId], client
        );
      } else if (decision === "requires_retest") {
        await safeQueryWithClient(
          `INSERT INTO ${schema}.control_retests
             (control_id, requested_by, status, created_at)
           VALUES ($1, $2, 'pending', NOW())`,
          [ctrlId, reviewerId], client
        );
      }

      return ctrlId;
    });

    emitEvent(({
          tenantId,
          userId: reviewerId,
          module: "controls",
          event: "updated",
          entityType: "remediation_review",
          entityId: actionId,
          data: { controlId, decision, comments },
        } as any)).catch(catchHandler(EC.EVENT_BUS));
  }
}
