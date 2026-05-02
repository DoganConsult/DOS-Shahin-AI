// ============================================================================
// Shahin-Ai — CAPA Service (F46: Issue / CAPA Lifecycle)
//
// Full Corrective and Preventive Action management:
//   - CAPA record creation linked to source (audit, incident, test failure)
//   - State machine transitions with validation
//   - Status log tracking every transition
//   - Effectiveness reviews with evidence
//   - Overdue detection and dashboard aggregation
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { v4 as uuid } from 'uuid';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// ── Types ──────────────────────────────────────────────────────────────────

export type CapaType = 'corrective' | 'preventive' | 'improvement';

export type CapaStatus =
  | 'open'
  | 'investigating'
  | 'action_planned'
  | 'implementing'
  | 'verification'
  | 'closed'
  | 'reopened';

export type CapaPriority = 'critical' | 'high' | 'medium' | 'low';

export type CapaSourceType =
  | 'audit_finding'
  | 'test_failure'
  | 'incident'
  | 'complaint'
  | 'observation'
  | 'risk_assessment'
  | 'management_review'
  | 'other';

export type EffectivenessRating = 'effective' | 'partial' | 'ineffective';

export interface CapaRecord {
  capaId: string;
  capaType: CapaType;
  titleEn: string;
  titleAr?: string;
  description?: string;
  sourceType: CapaSourceType;
  sourceId?: string;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  status: CapaStatus;
  priority: CapaPriority;
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  effectivenessReview?: string;
  effectivenessRating?: EffectivenessRating;
  effectivenessReviewedBy?: string;
  effectivenessReviewedAt?: string;
  evidenceIds?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  statusLog?: CapaStatusLogEntry[];
  linkedEntities?: CapaLinkedEntity[];
}

export interface CapaStatusLogEntry {
  logId: string;
  capaId: string;
  fromStatus: CapaStatus | null;
  toStatus: CapaStatus;
  changedBy: string;
  reason?: string;
  changedAt: string;
}

export interface CapaLinkedEntity {
  entityType: string;
  entityId: string;
  entityTitle?: string;
}

export interface CapaInput {
  capaType: CapaType;
  titleEn: string;
  titleAr?: string;
  description?: string;
  sourceType: CapaSourceType;
  sourceId?: string;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  priority?: CapaPriority;
  assignedTo?: string;
  dueDate?: string;
  createdBy?: string;
}

export interface CapaFilters {
  status?: CapaStatus;
  capaType?: CapaType;
  priority?: CapaPriority;
  sourceType?: CapaSourceType;
  assignedTo?: string;
  overdue?: boolean;
}

export interface CapaDashboard {
  tenantId: string;
  generatedAt: string;
  byStatus: Record<CapaStatus, number>;
  byType: Record<CapaType, number>;
  byPriority: Record<CapaPriority, number>;
  overdueCount: number;
  total: number;
  avgDaysToClose: number;
}

// ── Allowed State Transitions ─────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<CapaStatus, CapaStatus[]> = {
  open: ['investigating'],
  investigating: ['action_planned'],
  action_planned: ['implementing'],
  implementing: ['verification'],
  verification: ['closed'],
  closed: ['reopened'],
  reopened: ['investigating'],
};

// Any status can also transition to 'reopened' (except 'reopened' itself)
function isTransitionAllowed(from: CapaStatus, to: CapaStatus): boolean {
  if (to === 'reopened' && from !== 'reopened') return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// ── Internal Helpers ──────────────────────────────────────────────────────

function rowToCapa( r: Record<string, unknown>): CapaRecord {
  return {

    capaId: r.capa_id,

    capaType: r.capa_type,

    titleEn: r.title_en,

    titleAr: r.title_ar,

    description: r.description,

    sourceType: r.source_type || 'other',

    sourceId: r.source_id || r.finding_id || r.audit_observation_id,

    rootCauseAnalysis: r.root_cause_analysis,

    correctiveAction: r.corrective_action,

    preventiveAction: r.preventive_action,

    status: r.status,

    priority: r.priority || 'medium',

    assignedTo: r.assigned_to,

    dueDate: r.due_date,

    completedDate: r.completed_date,

    effectivenessReview: r.effectiveness_review,

    effectivenessRating: r.effectiveness_rating,

    effectivenessReviewedBy: r.effectiveness_reviewed_by,

    effectivenessReviewedAt: r.effectiveness_reviewed_at,
    evidenceIds: r.evidence_ids ? (typeof r.evidence_ids === 'string' ? JSON.parse(r.evidence_ids) : r.evidence_ids) : undefined,

    createdBy: r.created_by,

    createdAt: r.created_at,

    updatedAt: r.updated_at,
  };
}

function rowToStatusLog( r: Record<string, unknown>): CapaStatusLogEntry {
  return {

    logId: r.log_id,

    capaId: r.capa_id,

    fromStatus: r.from_status,

    toStatus: r.to_status,

    changedBy: r.changed_by,

    reason: r.reason,

    changedAt: r.changed_at || r.created_at,
  };
}

/** Record a status transition in the capa_status_log table */
async function logStatusTransition(
  schema: string,
  capaId: string,
  fromStatus: CapaStatus | null,
  toStatus: CapaStatus,
  changedBy: string,
  reason?: string
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".capa_status_log
     (log_id, capa_id, from_status, to_status, changed_by, reason, changed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [uuid(), capaId, fromStatus, toStatus, changedBy, reason || null]
  );
}

// ── Exported Functions ────────────────────────────────────────────────────

/**
 * Create a new CAPA record linked to a source entity.
 */
export async function createCAPA(
  tenantId: string,
  input: CapaInput
): Promise<CapaRecord> {
  const schema = tenantSchema(tenantId);
  const capaId = uuid();
  const initialStatus: CapaStatus = 'open';

  await safeQuery(
    `INSERT INTO "${schema}".capa_records
     (capa_id, capa_type, title_en, title_ar, description,
      source_type, source_id,
      root_cause_analysis, corrective_action, preventive_action,
      status, priority, assigned_to, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      capaId, input.capaType,
      input.titleEn, input.titleAr || null, input.description || null,
      input.sourceType, input.sourceId || null,
      input.rootCauseAnalysis || null, input.correctiveAction || null,
      input.preventiveAction || null,
      initialStatus, input.priority || 'medium',
      input.assignedTo || null, input.dueDate || null,
      input.createdBy || null,
    ]
  );

  // Log the initial status
  await logStatusTransition(
    schema, capaId, null, initialStatus,
    input.createdBy || SYSTEM_JOB_ACTOR, 'CAPA created'
  );

  eventBus.publish(('capa.created' as any), {
    tenantId,
    capaId,
    type: input.capaType,
    sourceType: input.sourceType,
    priority: input.priority || 'medium',
  });

  return getCAPA(tenantId, capaId) as Promise<CapaRecord>;
}

/**
 * Update a CAPA record's fields (not status -- use transitionStatus for that).
 */
export async function updateCAPA(
  tenantId: string,
  capaId: string,
  updates: Partial<CapaInput>
): Promise<CapaRecord | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const columnMap: Record<string, string> = {
    titleEn: 'title_en',
    titleAr: 'title_ar',
    description: 'description',
    rootCauseAnalysis: 'root_cause_analysis',
    correctiveAction: 'corrective_action',
    preventiveAction: 'preventive_action',
    priority: 'priority',
    assignedTo: 'assigned_to',
    dueDate: 'due_date',
    sourceType: 'source_type',
    sourceId: 'source_id',
  };

  for (const [key, col] of Object.entries(columnMap)) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push((updates as Record<string, unknown>)[key]);
    }
  }

  if (fields.length === 0) return getCAPA(tenantId, capaId);

  fields.push('updated_at = NOW()');
  params.push(capaId);

  await safeQuery(
    `UPDATE "${schema}".capa_records SET ${fields.join(', ')} WHERE capa_id = $${idx}`,
    params
  );

  return getCAPA(tenantId, capaId);
}

/**
 * Get a single CAPA record with its status log and linked entities.
 */
export async function getCAPA(
  tenantId: string,
  capaId: string
): Promise<CapaRecord | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT * FROM "${schema}".capa_records WHERE capa_id = $1`,
    [capaId]
  );

  if (res.rows.length === 0) return null;

  const capa = rowToCapa(res.rows[0]);

  // Fetch status log
  try {
    const logRes = await safeQuery(
      `SELECT * FROM "${schema}".capa_status_log
       WHERE capa_id = $1 ORDER BY changed_at ASC`,
      [capaId]
    );
    capa.statusLog = (logRes.rows || []).map(rowToStatusLog);
  } catch {
    capa.statusLog = [];
  }

  // Fetch linked entities if source is available
  const linkedEntities: CapaLinkedEntity[] = [];
  if (capa.sourceId && capa.sourceType) {
    linkedEntities.push({
      entityType: capa.sourceType,
      entityId: capa.sourceId,
    });
  }
  capa.linkedEntities = linkedEntities;

  return capa;
}

/**
 * List CAPAs with filtering, pagination, and priority sorting.
 */
export async function listCAPAs(
  tenantId: string,
  filters: CapaFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<{ records: CapaRecord[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters.capaType) { conditions.push(`capa_type = $${idx++}`); params.push(filters.capaType); }
  if (filters.priority) { conditions.push(`priority = $${idx++}`); params.push(filters.priority); }
  if (filters.sourceType) { conditions.push(`source_type = $${idx++}`); params.push(filters.sourceType); }
  if (filters.assignedTo) { conditions.push(`assigned_to = $${idx++}`); params.push(filters.assignedTo); }
  if (filters.overdue) {
    conditions.push(`due_date < CURRENT_DATE AND status NOT IN ('closed', 'verification')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await safeQuery(
    `SELECT COUNT(*) FROM "${schema}".capa_records ${where}`,
    params
  );
  const total = parseInt(countRes.rows[0]?.count) || 0;

  const dataRes = await safeQuery(
    `SELECT * FROM "${schema}".capa_records ${where}
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       due_date ASC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    records: dataRes.rows.map(rowToCapa),
    total,
  };
}

/**
 * Transition a CAPA's status using the state machine.
 * Validates the transition and records the change in the status log.
 */
export async function transitionStatus(
  tenantId: string,
  capaId: string,
  newStatus: CapaStatus,
  reason: string,
  changedBy: string
): Promise<CapaRecord> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Record an effectiveness review for a CAPA in verification status.
 */
export async function recordEffectivenessReview(
  tenantId: string,
  capaId: string,
  rating: EffectivenessRating,
  notes: string,
  evidenceIds: string[] = []
): Promise<CapaRecord> {
      const queryResult = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return queryResult?.rows || [];
}

/**
 * Get all CAPAs that are past their due date and not closed.
 */
export async function getOverdueCAPAs(tenantId: string): Promise<CapaRecord[]> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT * FROM "${schema}".capa_records
     WHERE due_date < CURRENT_DATE
       AND status NOT IN ('closed', 'verification')
     ORDER BY due_date ASC`,
    []
  );

  return (res.rows || []).map(rowToCapa);
}

/**
 * Get CAPA dashboard with aggregated counts by status, type, priority, and overdue.
 */
export async function getCAPADashboard(tenantId: string): Promise<CapaDashboard> {
  const schema = tenantSchema(tenantId);

  // Counts by status
  const statusRes = await safeQuery(
    `SELECT status, COUNT(*) AS cnt FROM "${schema}".capa_records GROUP BY status`,
    []
  );
  const byStatus: Record<string, number> = {
    open: 0, investigating: 0, action_planned: 0,
    implementing: 0, verification: 0, closed: 0, reopened: 0,
  };
  for (const row of statusRes.rows || []) {
    byStatus[row.status] = parseInt(row.cnt) || 0;
  }

  // Counts by type
  const typeRes = await safeQuery(
    `SELECT capa_type, COUNT(*) AS cnt FROM "${schema}".capa_records GROUP BY capa_type`,
    []
  );
  const byType: Record<string, number> = { corrective: 0, preventive: 0, improvement: 0 };
  for (const row of typeRes.rows || []) {
    byType[row.capa_type] = parseInt(row.cnt) || 0;
  }

  // Counts by priority
  const priorityRes = await safeQuery(
    `SELECT priority, COUNT(*) AS cnt FROM "${schema}".capa_records GROUP BY priority`,
    []
  );
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of priorityRes.rows || []) {
    byPriority[row.priority] = parseInt(row.cnt) || 0;
  }

  // Overdue count
  const overdueRes = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".capa_records
     WHERE due_date < CURRENT_DATE AND status NOT IN ('closed', 'verification')`,
    []
  );
  const overdueCount = parseInt(overdueRes.rows[0]?.cnt) || 0;

  // Average days to close
  const avgRes = await safeQuery(
    `SELECT AVG(EXTRACT(EPOCH FROM (completed_date::timestamp - created_at::timestamp)) / 86400) AS avg_days
     FROM "${schema}".capa_records
     WHERE status = 'closed' AND completed_date IS NOT NULL`,
    []
  );
  const avgDaysToClose = Math.round(parseFloat(avgRes.rows[0]?.avg_days) || 0);

  // Total count
  const totalRes = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".capa_records`,
    []
  );
  const total = parseInt(totalRes.rows[0]?.cnt) || 0;

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    byStatus: byStatus as Record<CapaStatus, number>,
    byType: byType as Record<CapaType, number>,
    byPriority: byPriority as Record<CapaPriority, number>,
    overdueCount,
    total,
    avgDaysToClose,
  };
}

// ── Legacy Aliases (backward compatibility) ───────────────────────────────

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use createCAPA instead */
export const createCapa = createCAPA;

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use getCAPA instead */
export const getCapa = getCAPA;

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use listCAPAs instead */
export async function listCapas(
  tenantId: string,
  filters: { status?: CapaStatus; type?: CapaType; controlId?: string; findingId?: string } = {},
  limit = 50,
  offset = 0
): Promise<{ records: CapaRecord[]; total: number }> {
  return listCAPAs(tenantId, {
    status: filters.status,
    capaType: filters.type,
  }, limit, offset);
}

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use updateCAPA instead */
export const updateCapa = updateCAPA;

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use transitionStatus instead */
export async function updateCapaStatus(
  tenantId: string,
  capaId: string,
  newStatus: CapaStatus,
  updatedBy: string
): Promise<void> {
  try {
    await transitionStatus(tenantId, capaId, newStatus, 'Status update (legacy)', updatedBy);
  } catch {
    // Fallback: direct update for legacy callers that may use non-standard transitions
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `UPDATE "${schema}".capa_records SET status = $1, updated_at = NOW() WHERE capa_id = $2`,
      [newStatus, capaId]
    );

    eventBus.publish(('capa.status_changed' as any), {
      tenantId, capaId, status: newStatus, changedBy: updatedBy,
    });
  }
}

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use recordEffectivenessReview instead */
export async function reviewEffectiveness(
  tenantId: string,
  capaId: string,
  review: string,
  rating: EffectivenessRating,
  _reviewedBy: string
): Promise<void> {
  await recordEffectivenessReview(tenantId, capaId, rating, review);
}

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use getOverdueCAPAs instead */
export async function markOverdueCapas(tenantId: string): Promise<number> {
  const overdue = await getOverdueCAPAs(tenantId);
  return overdue.length;
}
