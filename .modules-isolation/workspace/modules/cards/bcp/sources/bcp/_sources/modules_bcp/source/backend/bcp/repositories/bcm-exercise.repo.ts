// ============================================
// BCP Module — Exercise & Findings Repository
// Data access for `bcp_exercises`, `bcp_exercise_results`,
// `bcm_findings`, and `crisis_events` aggregates.
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Exercise Repository ──────────────────────────────

export class BcmExerciseRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // --- Exercises ---

  async findExerciseById(exerciseId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".bcp_exercises WHERE exercise_id = $1 AND deleted_at IS NULL`,
      [exerciseId],
    );
    return getFirstRow(result);
  }

  async findAllExercises(filters: {
    status?: string; bcp_plan_id?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.bcp_plan_id) { conditions.push(`bcp_plan_id = $${idx++}`); params.push(filters.bcp_plan_id); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".bcp_exercises ${where}`, params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".bcp_exercises ${where}
       ORDER BY scheduled_date DESC NULLS LAST
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async createExercise(data: {
    title: string; bcp_plan_id?: string; exercise_type?: string;
    scenario?: string; facilitator_id?: string; scheduled_date?: string;
  }): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".bcp_exercises
        (title, bcp_plan_id, exercise_type, scenario, facilitator_id, scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.title, data.bcp_plan_id || null, data.exercise_type || 'tabletop',
        data.scenario || null, data.facilitator_id || null, data.scheduled_date || null,
      ],
    );
    return getFirstRow(result);
  }

  async updateExerciseStatus(exerciseId: string, status: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".bcp_exercises SET status = $1, updated_at = NOW()
       WHERE exercise_id = $2 AND deleted_at IS NULL RETURNING *`,
      [status, exerciseId],
    );
    return getFirstRow(result);
  }

  async countOverdueExercises(): Promise<number> {
    const result = await safeQuery(`
      SELECT COUNT(*)::int AS total FROM "${this.schema}".bcp_exercises
      WHERE status IN ('planned','scheduled') AND deleted_at IS NULL AND scheduled_date < NOW()`,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // --- Exercise pass rate trend (12 months) ---

  async getPassRateTrend(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT TO_CHAR(DATE_TRUNC('month', ex.scheduled_date), 'YYYY-MM') AS month,
             ROUND(AVG(CASE WHEN er.passed = TRUE THEN 100 ELSE 0 END))::int AS rate
      FROM "${this.schema}".bcp_exercises ex
      JOIN "${this.schema}".bcp_exercise_results er ON er.exercise_id = ex.exercise_id
      WHERE ex.status = 'completed' AND ex.deleted_at IS NULL
        AND ex.scheduled_date >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1`);
    return result.rows;
  }

  // --- Exercise results ---

  async createExerciseResult(exerciseId: string, data: {
    result_type: string; description: string; severity?: string;
    assigned_to?: string; due_date?: string;
  }): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".bcp_exercise_results
        (exercise_id, result_type, description, severity, assigned_to, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [exerciseId, data.result_type, data.description,
       data.severity || 'medium', data.assigned_to || null, data.due_date || null],
    );
    return getFirstRow(result);
  }

  async findExerciseResults(exerciseId: string, resultType?: string): Promise<GenericRow[]> {
    let sql = `SELECT * FROM "${this.schema}".bcp_exercise_results WHERE exercise_id = $1`;
    const params: unknown[] = [exerciseId];
    if (resultType) { params.push(resultType); sql += ` AND result_type = $2`; }
    sql += ` ORDER BY created_at DESC`;
    return (await safeQuery(sql, params)).rows;
  }
}

// ── Findings Repository ──────────────────────────────

export class BcmFindingsRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findById(findingId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".bcm_findings WHERE finding_id = $1 AND deleted_at IS NULL`,
      [findingId],
    );
    return getFirstRow(result);
  }

  async findAll(filters: {
    status?: string; severity?: string; source_type?: string; assigned_to?: string;
    page?: number; pageSize?: number;
  } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    if (filters.source_type) { conditions.push(`source_type = $${idx++}`); params.push(filters.source_type); }
    if (filters.assigned_to) { conditions.push(`assigned_to = $${idx++}`); params.push(filters.assigned_to); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".bcm_findings ${where}`, params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".bcm_findings ${where}
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async create(data: {
    title: string; description?: string; source_type?: string; source_id?: string;
    finding_type?: string; severity?: string; assigned_to?: string; assigned_team_id?: string;
    due_date?: string; remediation_plan?: string; root_cause?: string;
    linked_plan_id?: string; linked_risk_id?: string; linked_control_id?: string;
  }): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".bcm_findings
        (title, description, source_type, source_id, finding_type, severity,
         assigned_to, assigned_team_id, due_date, remediation_plan, root_cause,
         linked_plan_id, linked_risk_id, linked_control_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        data.title, data.description || null, data.source_type || null, data.source_id || null,
        data.finding_type || 'gap', data.severity || 'medium',
        data.assigned_to || null, data.assigned_team_id || null,
        data.due_date || null, data.remediation_plan || null, data.root_cause || null,
        data.linked_plan_id || null, data.linked_risk_id || null, data.linked_control_id || null,
      ],
    );
    return getFirstRow(result);
  }

  async update(findingId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const allowed = [
      'title', 'description', 'finding_type', 'severity', 'status',
      'assigned_to', 'assigned_team_id', 'due_date',
      'remediation_plan', 'root_cause', 'corrective_action', 'preventive_action',
      'remediation_evidence', 'linked_plan_id', 'linked_risk_id', 'linked_control_id',
    ];
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        params.push(key === 'remediation_evidence' ? JSON.stringify(data[key]) : data[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return this.findById(findingId);
    sets.push('updated_at = NOW()');
    params.push(findingId);
    const result = await safeQuery(
      `UPDATE "${this.schema}".bcm_findings SET ${sets.join(', ')}
       WHERE finding_id = $${params.length} AND deleted_at IS NULL RETURNING *`,
      params,
    );
    return getFirstRow(result);
  }

  async verify(findingId: string, verifiedBy: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".bcm_findings
       SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW()
       WHERE finding_id = $2 AND deleted_at IS NULL RETURNING *`,
      [verifiedBy, findingId],
    );
    return getFirstRow(result);
  }

  async close(findingId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".bcm_findings SET status = 'closed', updated_at = NOW()
       WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`,
      [findingId],
    );
    return getFirstRow(result);
  }

  async getSummary(): Promise<{
    total: number; open: number; overdue: number; bySeverity: GenericRow[]; bySource: GenericRow[];
  }> {
    const [totalR, statusR, sevR, srcR, overdueR] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${this.schema}".bcm_findings WHERE deleted_at IS NULL`),
      safeQuery(`SELECT status, COUNT(*)::int AS cnt FROM "${this.schema}".bcm_findings WHERE deleted_at IS NULL GROUP BY status`),
      safeQuery(`SELECT severity, COUNT(*)::int AS cnt FROM "${this.schema}".bcm_findings WHERE deleted_at IS NULL AND status NOT IN ('closed','accepted','verified') GROUP BY severity`),
      safeQuery(`SELECT source_type, COUNT(*)::int AS cnt FROM "${this.schema}".bcm_findings WHERE deleted_at IS NULL GROUP BY source_type`),
      safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${this.schema}".bcm_findings WHERE deleted_at IS NULL AND status NOT IN ('closed','accepted','verified') AND due_date < CURRENT_DATE`),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusR.rows) statusMap[row.status as string] = Number(row.cnt);

    return {
      total: Number(totalR.rows[0]?.cnt || 0),
      open: Number(statusMap['open'] || 0),
      overdue: Number(overdueR.rows[0]?.cnt || 0),
      bySeverity: sevR.rows,
      bySource: srcR.rows,
    };
  }
}

// ── Crisis Events Repository ─────────────────────────

export class CrisisEventRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findById(eventId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".crisis_events WHERE event_id = $1 AND deleted_at IS NULL`,
      [eventId],
    );
    return getFirstRow(result);
  }

  async findAll(filters: {
    status?: string; severity?: string; crisis_type?: string;
  } = {}): Promise<GenericRow[]> {
    let sql = `SELECT * FROM "${this.schema}".crisis_events WHERE deleted_at IS NULL`;
    const params: unknown[] = [];
    if (filters.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
    if (filters.severity) { params.push(filters.severity); sql += ` AND severity = $${params.length}`; }
    if (filters.crisis_type) { params.push(filters.crisis_type); sql += ` AND crisis_type = $${params.length}`; }
    sql += ` ORDER BY declared_at DESC NULLS LAST, created_at DESC`;
    return (await safeQuery(sql, params)).rows;
  }

  async findActive(): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".crisis_events
       WHERE deleted_at IS NULL AND status NOT IN ('resolved','post_review')
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, declared_at DESC`,
    );
    return result.rows;
  }

  async create(data: {
    title: string; description?: string; crisis_type?: string; severity?: string;
    declared_by?: string; incident_id?: string; affected_services?: unknown[];
    affected_locations?: unknown[]; command_team?: unknown[];
  }): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".crisis_events
        (title, description, crisis_type, severity, status, declared_at, declared_by,
         incident_id, affected_services, affected_locations, command_team, timeline)
       VALUES ($1,$2,$3,$4,'declared',NOW(),$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.title, data.description || null, data.crisis_type || 'operational',
        data.severity || 'high', data.declared_by || null, data.incident_id || null,
        JSON.stringify(data.affected_services || []),
        JSON.stringify(data.affected_locations || []),
        JSON.stringify(data.command_team || []),
        JSON.stringify([{ timestamp: new Date().toISOString(), type: 'declared', message: `Crisis declared: ${data.title}` }]),
      ],
    );
    return getFirstRow(result);
  }

  async updateStatus(eventId: string, status: string, timeline: unknown[]): Promise<GenericRow | null> {
    const resolveFields = status === 'resolved' ? `, resolved_at = NOW()` : '';
    const result = await safeQuery(
      `UPDATE "${this.schema}".crisis_events SET status = $1, timeline = $2, updated_at = NOW()${resolveFields}
       WHERE event_id = $3 AND deleted_at IS NULL RETURNING *`,
      [status, JSON.stringify(timeline), eventId],
    );
    return getFirstRow(result);
  }

  async resolve(eventId: string, resolvedBy: string, postCrisisReview: string | null, timeline: unknown[]): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".crisis_events
       SET status = 'resolved', resolved_at = NOW(), resolved_by = $1,
           post_crisis_review = $2, timeline = $3, updated_at = NOW()
       WHERE event_id = $4 AND deleted_at IS NULL RETURNING *`,
      [resolvedBy, postCrisisReview, JSON.stringify(timeline), eventId],
    );
    return getFirstRow(result);
  }

  async getDashboardStats(): Promise<{
    activeCrises: number; totalEvents: number; avgResolutionHours: number | null;
  }> {
    const [activeR, totalR, avgR] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${this.schema}".crisis_events WHERE deleted_at IS NULL AND status NOT IN ('resolved','post_review')`),
      safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${this.schema}".crisis_events WHERE deleted_at IS NULL`),
      safeQuery(`SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - declared_at))/3600) AS avg_hours FROM "${this.schema}".crisis_events WHERE resolved_at IS NOT NULL AND declared_at IS NOT NULL AND deleted_at IS NULL`),
    ]);

    return {
      activeCrises: Number(activeR.rows[0]?.cnt || 0),
      totalEvents: Number(totalR.rows[0]?.cnt || 0),
      avgResolutionHours: avgR.rows[0]?.avg_hours ? Math.round(Number(avgR.rows[0].avg_hours) * 10) / 10 : null,
    };
  }
}
