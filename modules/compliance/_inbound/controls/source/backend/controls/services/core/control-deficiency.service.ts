// ============================================
// AGRC-OS — Control Deficiency Service
// CRUD and lifecycle management for control
// deficiencies (issues), remediation plans,
// closure, and retest requests.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ControlDeficiency {
  id: string;
  control_id: string;
  control_title: string;
  severity: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateDeficiencyData {
  control_id: string;
  severity: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  created_by: string;
}

export interface RemediationAction {
  action_id: string;
  control_id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
}

export interface DeficiencyDetail {
  deficiency: ControlDeficiency;
  remediationActions: RemediationAction[];
  relatedFailures: ControlFailureRecord[];
}

export interface ControlFailureRecord {
  failure_id: string;
  control_id: string;
  failure_type: string;
  severity: string;
  detected_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface CreateRemediationData {
  title: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  created_by: string;
}

export interface CloseData {
  closed_by: string;
  resolution_note: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlDeficiencyService {
  /**
   * Lists deficiencies (control_issues), optionally filtered by status.
   * Joins to controls table for the control title.
   */
  async listDeficiencies(
    tenantId: string,
    status?: string
  ): Promise<ControlDeficiency[]> {
    const schema = tenantSchema(tenantId);

    let whereClause = "";
    const params: unknown[] = [];

    if (status) {
      whereClause = "AND ci.status = $1";
      params.push(status);
    }

    const result = await safeQuery(
      `SELECT ci.id, ci.control_id, c.title AS control_title,
              ci.severity, ci.status, ci.assigned_to, ci.due_date,
              ci.description, ci.created_at
         FROM ${schema}.control_issues ci
         LEFT JOIN ${schema}.controls c ON c.control_id = ci.control_id
        WHERE 1=1 ${whereClause}
        ORDER BY
          CASE ci.severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          ci.created_at DESC`,
      params
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      control_id: r.control_id,
      control_title: r.control_title,
      severity: r.severity,
      status: r.status,
      assigned_to: r.assigned_to,
      due_date: r.due_date,
      description: r.description,
      created_at: r.created_at,
    }));
  }

  /**
   * Creates a new deficiency (control_issue) record.
   */
  async createDeficiency(
    tenantId: string,
    data: CreateDeficiencyData
  ): Promise<{ deficiencyId: string }> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `INSERT INTO ${schema}.control_issues
         (control_id, severity, status, description, assigned_to, due_date, created_by)
       VALUES ($1, $2, 'open', $3, $4, $5, $6)
       RETURNING id`,
      [
        data.control_id,
        data.severity,
        data.description,
        data.assigned_to ?? null,
        data.due_date ?? null,
        data.created_by,
      ]
    );

    return { deficiencyId: result.rows[0].id };
  }

  /**
   * Returns full deficiency detail including remediation actions
   * and related control failures.
   */
  async getDeficiency(
    tenantId: string,
    deficiencyId: string
  ): Promise<DeficiencyDetail | null> {
    const schema = tenantSchema(tenantId);

    const [defResult, actionsResult, failuresResult] = await Promise.all([
      safeQuery(
        `SELECT ci.id, ci.control_id, c.title AS control_title,
                ci.severity, ci.status, ci.assigned_to, ci.due_date,
                ci.description, ci.created_at
           FROM ${schema}.control_issues ci
           LEFT JOIN ${schema}.controls c ON c.control_id = ci.control_id
          WHERE ci.id = $1`,
        [deficiencyId]
      ),

      // Remediation actions linked to the same control
      safeQuery(
        `SELECT ca.action_id, ca.control_id, ca.title, ca.status,
                ca.priority, ca.assigned_to, ca.due_date, ca.created_at
           FROM ${schema}.control_actions ca
           JOIN ${schema}.control_issues ci ON ci.control_id = ca.control_id
          WHERE ci.id = $1
          ORDER BY ca.created_at DESC`,
        [deficiencyId]
      ),

      // Related failures for the same control
      safeQuery(
        `SELECT cf.failure_id, cf.control_id, cf.failure_type, cf.severity,
                cf.detected_at, cf.resolved_at, cf.resolution_note
           FROM ${schema}.control_failures cf
           JOIN ${schema}.control_issues ci ON ci.control_id = cf.control_id
          WHERE ci.id = $1
          ORDER BY cf.detected_at DESC
          LIMIT 20`,
        [deficiencyId]
      ),
    ]);

    if (defResult.rows.length === 0) {
      return null;
    }

    const d = defResult.rows[0];

    return {
      deficiency: {
        id: d.id,
        control_id: d.control_id,
        control_title: d.control_title,
        severity: d.severity,
        status: d.status,
        assigned_to: d.assigned_to,
        due_date: d.due_date,
        description: d.description,
        created_at: d.created_at,
      },

      remediationActions: actionsResult.rows.map(( r: Record<string, unknown>) => ({
        action_id: r.action_id,
        control_id: r.control_id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        assigned_to: r.assigned_to,
        due_date: r.due_date,
        created_at: r.created_at,
      })),

      relatedFailures: failuresResult.rows.map(( r: Record<string, unknown>) => ({
        failure_id: r.failure_id,
        control_id: r.control_id,
        failure_type: r.failure_type,
        severity: r.severity,
        detected_at: r.detected_at,
        resolved_at: r.resolved_at,
        resolution_note: r.resolution_note,
      })),
    };
  }

  /**
   * Creates a remediation action for the control associated
   * with the given deficiency.
   */
  async createRemediation(
    tenantId: string,
    deficiencyId: string,
    data: CreateRemediationData
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    // Resolve the control_id from the deficiency
    const defResult = await safeQuery(
      `SELECT control_id FROM ${schema}.control_issues WHERE id = $1`,
      [deficiencyId]
    );

    if (defResult.rows.length === 0) {
      throw new Error(`Deficiency ${deficiencyId} not found`);
    }

    const controlId = defResult.rows[0].control_id;

    await safeQuery(
      `INSERT INTO ${schema}.control_actions
         (control_id, title, status, priority, assigned_to, due_date)
       VALUES ($1, $2, 'open', $3, $4, $5)`,
      [
        controlId,
        data.title,
        data.priority,
        data.assigned_to ?? null,
        data.due_date ?? null,
      ]
    );
  }

  /**
   * Closes a deficiency by setting status to 'closed'
   * with a resolution note and timestamp.
   *
   * Validates that a passing retest exists before allowing
   * closure, and creates a closure_review record for audit trail.
   */
  async closeDeficiency(
    tenantId: string,
    deficiencyId: string,
    data: CloseData
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    // Resolve the control_id from the deficiency
    const defResult = await safeQuery(
      `SELECT control_id FROM ${schema}.control_issues WHERE id = $1`,
      [deficiencyId]
    );

    if (defResult.rows.length === 0) {
      throw new Error(`Deficiency ${deficiencyId} not found`);
    }

    const controlId = defResult.rows[0].control_id;

    // Validate that a passing retest exists for this control
    const retestResult = await safeQuery(
      `SELECT id FROM ${schema}.control_retests
        WHERE control_id = $1
          AND result = 'pass'
        ORDER BY tested_at DESC
        LIMIT 1`,
      [controlId]
    );

    if (retestResult.rows.length === 0) {
      throw new Error(
        `Cannot close deficiency ${deficiencyId}: no passing retest found for control ${controlId}`
      );
    }

    // Update the deficiency status to closed
    await safeQuery(
      `UPDATE ${schema}.control_issues
          SET status = 'closed',
              resolution_note = $1,
              closed_by = $2,
              closed_at = NOW()
        WHERE id = $3`,
      [data.resolution_note, data.closed_by, deficiencyId]
    );

    // Create a closure_review record for audit trail
    await safeQuery(
      `INSERT INTO ${schema}.control_closure_reviews
         (deficiency_id, control_id, reviewer_id, decision, comments, reviewed_at)
       VALUES ($1, $2, $3, 'approved', $4, NOW())`,
      [deficiencyId, controlId, data.closed_by, data.resolution_note]
    );
  }

  /**
   * Requests a retest for a deficiency by resetting its
   * status to 'retest_requested'.
   */
  async requestRetest(
    tenantId: string,
    deficiencyId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `UPDATE ${schema}.control_issues
          SET status = 'retest_requested',
              updated_at = NOW()
        WHERE id = $1`,
      [deficiencyId]
    );
  }
}
