// ============================================
// AGRC-OS — Control Work Queue Service
// User-scoped work items: pending tests,
// controls awaiting review, evidence tasks,
// open deficiencies, and monitoring alerts.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PendingTest {
  test_id: string;
  control_id: string;
  control_title: string;
  tester: string;
  created_at: string;
}

export interface ControlAwaitingReview {
  control_id: string;
  title: string;
  status: string;
  owner: string;
  updated_at: string;
}

export interface PendingEvidenceTask {
  task_id: string;
  control_id: string;
  description: string;
  assigned_to: string;
  due_date: string | null;
  status: string;
}

export interface OpenDeficiency {
  id: string;
  control_id: string;
  severity: string;
  status: string;
  assigned_to: string;
  due_date: string | null;
  created_at: string;
}

export interface MonitoringAlertItem {
  id: string;
  control_id: string;
  rule_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
}

/** Aggregated work queue for the current user */
export interface ControlWorkQueue {
  pendingTests: PendingTest[];
  controlsAwaitingReview: ControlAwaitingReview[];
  pendingEvidence: PendingEvidenceTask[];
  openDeficiencies: OpenDeficiency[];
  monitoringAlerts: MonitoringAlertItem[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlWorkQueueService {
  /**
   * Returns the user-scoped control work queue.
   * Each section filters by the given userId where applicable.
   */
  async getWorkQueue(
    tenantId: string,
    userId: string
  ): Promise<ControlWorkQueue> {
    const schema = tenantSchema(tenantId);

    const [
      testsResult,
      reviewResult,
      evidenceResult,
      deficiencyResult,
      alertsResult,
    ] = await Promise.all([
      // Tests assigned to the user that are still pending
      safeQuery(
        `SELECT ct.test_id, ct.control_id, c.title AS control_title,
                ct.tester, ct.tested_at AS created_at
           FROM ${schema}.control_tests ct
           JOIN ${schema}.controls c ON c.control_id = ct.control_id
          WHERE ct.tester = $1
            AND ct.test_result = 'pending'
          ORDER BY ct.tested_at DESC
          LIMIT 50`,
        [userId]
      ),

      // Controls awaiting the user's review
      safeQuery(
        `SELECT control_id, title, status, owner, updated_at
           FROM ${schema}.controls
          WHERE owner = $1
            AND status = 'pending_review'
            AND deleted_at IS NULL
          ORDER BY updated_at DESC
          LIMIT 50`,
        [userId]
      ),

      // Evidence tasks assigned to the user
      safeQuery(
        `SELECT task_id, control_id, requirement_description_en AS description,
                assigned_to, due_date, status
           FROM ${schema}.evidence_tasks
          WHERE assigned_to = $1
            AND status = 'pending'
          ORDER BY due_date ASC NULLS LAST
          LIMIT 50`,
        [userId]
      ),

      // Open deficiencies assigned to the user
      safeQuery(
        `SELECT id, control_id, severity, status, assigned_to, due_date, created_at
           FROM ${schema}.control_issues
          WHERE assigned_to = $1
            AND status NOT IN ('closed', 'resolved')
          ORDER BY severity ASC, due_date ASC NULLS LAST
          LIMIT 50`,
        [userId]
      ),

      // New monitoring alerts (not yet acknowledged)
      safeQuery(
        `SELECT id, control_id, rule_id, alert_type, severity, message,
                status, created_at
           FROM ${schema}.control_monitoring_alerts
          WHERE status = 'new'
          ORDER BY created_at DESC
          LIMIT 50`,
        []
      ),
    ]);

    return {

      pendingTests: testsResult.rows.map(( r: Record<string, unknown>) => ({
        test_id: r.test_id,
        control_id: r.control_id,
        control_title: r.control_title,
        tester: r.tester,
        created_at: r.created_at,
      })),

      controlsAwaitingReview: reviewResult.rows.map(( r: Record<string, unknown>) => ({
        control_id: r.control_id,
        title: r.title,
        status: r.status,
        owner: r.owner,
        updated_at: r.updated_at,
      })),

      pendingEvidence: evidenceResult.rows.map(( r: Record<string, unknown>) => ({
        task_id: r.task_id,
        control_id: r.control_id,
        description: r.description,
        assigned_to: r.assigned_to,
        due_date: r.due_date,
        status: r.status,
      })),

      openDeficiencies: deficiencyResult.rows.map(( r: Record<string, unknown>) => ({
        id: r.id,
        control_id: r.control_id,
        severity: r.severity,
        status: r.status,
        assigned_to: r.assigned_to,
        due_date: r.due_date,
        created_at: r.created_at,
      })),

      monitoringAlerts: alertsResult.rows.map(( r: Record<string, unknown>) => ({
        id: r.id,
        control_id: r.control_id,
        rule_id: r.rule_id,
        alert_type: r.alert_type,
        severity: r.severity,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
      })),
    };
  }
}
