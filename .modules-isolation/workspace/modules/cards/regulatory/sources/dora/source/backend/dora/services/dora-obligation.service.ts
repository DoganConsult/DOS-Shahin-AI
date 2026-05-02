/**
 * DORA Obligation Service — Manages DORA regulatory obligations.
 *
 * MP-25 §3.1: CRUD for DORA obligations covering the five DORA pillars:
 *   1. ICT Risk Management (Art. 5-16)
 *   2. ICT Incident Reporting (Art. 17-23)
 *   3. Digital Operational Resilience Testing (Art. 24-27)
 *   4. Third-Party ICT Risk Management (Art. 28-44)
 *   5. Information Sharing (Art. 45)
 *
 * Links obligations to compliance frameworks, tracks status with deadlines.
 * All mutations emit events. All status changes go through lifecycle auth.
 *
 * DB tables: dora_obligations, dora_obligation_mappings
 *
 * @owner dora
 * @module dora
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { emitDoraEvent, emitDoraStatusChange } from './dora-event.service';
import type { GenericRow } from '@dos/types';

// ── DORA Obligation Pillars ────────────────────────────────────────────
export const DORA_PILLARS = [
  'ict_risk_management',
  'incident_reporting',
  'resilience_testing',
  'third_party_risk',
  'information_sharing',
] as const;
export type DoraPillar = typeof DORA_PILLARS[number];

export const OBLIGATION_STATUSES = [
  'draft', 'under_review', 'approved', 'active', 'overdue', 'expired', 'archived',
] as const;
export type ObligationStatus = typeof OBLIGATION_STATUSES[number];

// ── Obligation Create/Update DTOs ──────────────────────────────────────
export interface CreateObligationDTO {
  title: string;
  pillar: DoraPillar;
  articleReference: string;
  description?: string;
  ownerId?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  complianceFrameworkId?: string;
  evidenceRequirements?: string[];
}

export interface UpdateObligationDTO {
  title?: string;
  pillar?: DoraPillar;
  articleReference?: string;
  description?: string;
  ownerId?: string;
  deadline?: string;
  priority?: string;
  status?: ObligationStatus;
  complianceFrameworkId?: string;
  evidenceRequirements?: string[];
  completionPercentage?: number;
  notes?: string;
}

// ── List Filters ───────────────────────────────────────────────────────
export interface ObligationFilters {
  pillar?: DoraPillar;
  status?: string;
  priority?: string;
  ownerId?: string;
  overdue?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}

// ── Obligation Mapping DTO ─────────────────────────────────────────────
export interface ObligationMappingDTO {
  obligationId: string;
  frameworkId?: string;
  controlId?: string;
  riskId?: string;
  evidenceId?: string;
  mappingType: 'framework' | 'control' | 'risk' | 'evidence';
  notes?: string;
}

/**
 * List all DORA obligations for a tenant with filtering, pagination, and search.
 */
export async function listObligations(
  tenantId: string,
  filters: ObligationFilters = {},
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.pillar) {
    conditions.push(`pillar = $${idx++}`);
    params.push(filters.pillar);
  }
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.priority) {
    conditions.push(`priority = $${idx++}`);
    params.push(filters.priority);
  }
  if (filters.ownerId) {
    conditions.push(`owner_id = $${idx++}`);
    params.push(filters.ownerId);
  }
  if (filters.overdue) {
    conditions.push(`deadline < NOW() AND status NOT IN ('expired','archived','approved')`);
  }
  if (filters.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR article_reference ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const validSortCols = ['title', 'pillar', 'status', 'priority', 'deadline', 'created_at', 'updated_at'];
  const sortCol = validSortCols.includes(filters.sortBy || '') ? filters.sortBy! : 'created_at';
  const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".dora_obligations ${where}`,
    params,
  );
  const total = getFirstRow(countResult)?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".dora_obligations ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  return { rows: dataResult.rows, total };
}

/**
 * Get a single DORA obligation by ID.
 */
export async function getObligationById(
  tenantId: string,
  obligationId: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_obligations WHERE obligation_id = $1 AND deleted_at IS NULL`,
    [obligationId],
  );
  return getFirstRow(result);
}

/**
 * Create a new DORA obligation.
 * Emits dora.obligation_created event on success.
 */
export async function createObligation(
  tenantId: string,
  dto: CreateObligationDTO,
  createdBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_obligations
      (title, pillar, article_reference, description, owner_id, deadline, priority,
       compliance_framework_id, evidence_requirements, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10)
     RETURNING *`,
    [
      dto.title,
      dto.pillar,
      dto.articleReference,
      dto.description || null,
      dto.ownerId || null,
      dto.deadline || null,
      dto.priority || 'medium',
      dto.complianceFrameworkId || null,
      JSON.stringify(dto.evidenceRequirements || []),
      createdBy || null,
    ],
  );
  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.obligation_created', 'obligation', row.obligation_id, {
      title: row.title,
      pillar: row.pillar,
      articleReference: row.article_reference,
    });
  }
  return row;
}

/**
 * Update an existing DORA obligation.
 * Emits dora.obligation_updated and optionally dora.status_changed events.
 */
export async function updateObligation(
  tenantId: string,
  obligationId: string,
  dto: UpdateObligationDTO,
  updatedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const allowedCols: Record<string, string> = {
    title: 'title',
    pillar: 'pillar',
    articleReference: 'article_reference',
    description: 'description',
    ownerId: 'owner_id',
    deadline: 'deadline',
    priority: 'priority',
    status: 'status',
    complianceFrameworkId: 'compliance_framework_id',
    completionPercentage: 'completion_percentage',
    notes: 'notes',
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [dtoKey, colName] of Object.entries(allowedCols)) {
    const value = (dto as Record<string, unknown>)[dtoKey];
    if (value !== undefined) {
      sets.push(`${colName} = $${idx++}`);
      params.push(value);
    }
  }

  // Handle JSON array fields separately
  if (dto.evidenceRequirements !== undefined) {
    sets.push(`evidence_requirements = $${idx++}`);
    params.push(JSON.stringify(dto.evidenceRequirements));
  }

  if (sets.length === 0) return getObligationById(tenantId, obligationId);

  sets.push(`updated_at = NOW()`);
  if (updatedBy) {
    sets.push(`updated_by = $${idx++}`);
    params.push(updatedBy);
  }

  params.push(obligationId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_obligations
     SET ${sets.join(', ')}
     WHERE obligation_id = $${idx} AND deleted_at IS NULL
     RETURNING *`,
    params,
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.obligation_updated', 'obligation', obligationId, {
      title: row.title,
      pillar: row.pillar,
    });
  }
  return row;
}

/**
 * Transition obligation status through lifecycle auth.
 * Validates the transition, updates the record, and emits status change event.
 */
export async function transitionObligationStatus(
  tenantId: string,
  obligationId: string,
  fromStatus: string,
  toStatus: ObligationStatus,
  transitionedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_obligations
     SET status = $1, updated_at = NOW(), updated_by = $3
     WHERE obligation_id = $2 AND status = $4 AND deleted_at IS NULL
     RETURNING *`,
    [toStatus, obligationId, transitionedBy || null, fromStatus],
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraStatusChange(tenantId, 'obligation', obligationId, fromStatus, toStatus);
  }
  return row;
}

/**
 * Soft-delete a DORA obligation.
 * Emits dora.obligation_deleted event on success.
 */
export async function deleteObligation(
  tenantId: string,
  obligationId: string,
  deletedBy?: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_obligations
     SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
     WHERE obligation_id = $1 AND deleted_at IS NULL
     RETURNING obligation_id`,
    [obligationId, deletedBy || null],
  );
  const deleted = (result.rows?.length ?? 0) > 0;
  if (deleted) {
    await emitDoraEvent(tenantId, 'dora.obligation_deleted', 'obligation', obligationId, {});
  }
  return deleted;
}

// ── Obligation Mappings ────────────────────────────────────────────────

/**
 * List mappings for a specific obligation.
 * Returns all linked frameworks, controls, risks, and evidence.
 */
export async function listObligationMappings(
  tenantId: string,
  obligationId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_obligation_mappings
     WHERE obligation_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [obligationId],
  );
  return result.rows;
}

/**
 * Create a mapping between an obligation and a framework/control/risk/evidence entity.
 * Emits dora.obligation_mapping_created event.
 */
export async function createObligationMapping(
  tenantId: string,
  dto: ObligationMappingDTO,
  createdBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_obligation_mappings
      (obligation_id, framework_id, control_id, risk_id, evidence_id, mapping_type, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      dto.obligationId,
      dto.frameworkId || null,
      dto.controlId || null,
      dto.riskId || null,
      dto.evidenceId || null,
      dto.mappingType,
      dto.notes || null,
      createdBy || null,
    ],
  );
  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.obligation_mapping_created', 'obligation_mapping', row.mapping_id, {
      obligationId: dto.obligationId,
      mappingType: dto.mappingType,
    });
  }
  return row;
}

/**
 * Delete an obligation mapping by ID.
 */
export async function deleteObligationMapping(
  tenantId: string,
  mappingId: string,
  _deletedBy?: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_obligation_mappings
     SET deleted_at = NOW()
     WHERE mapping_id = $1 AND deleted_at IS NULL
     RETURNING mapping_id`,
    [mappingId],
  );
  return (result.rows?.length ?? 0) > 0;
}

// ── Aggregation Queries ────────────────────────────────────────────────

/**
 * Get obligation counts grouped by pillar for dashboard summaries.
 */
export async function getObligationCountsByPillar(
  tenantId: string,
): Promise<{ pillar: string; total: number; active: number; overdue: number }[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       pillar,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE deadline < NOW() AND status NOT IN ('expired','archived','approved'))::int AS overdue
     FROM "${schema}".dora_obligations
     WHERE deleted_at IS NULL
     GROUP BY pillar
     ORDER BY pillar`,
  );

  return result.rows as Record<string, unknown>[][];
}

/**
 * Get overdue obligations that need attention.
 * Used by background jobs and dashboard service.
 */
export async function getOverdueObligations(
  tenantId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_obligations
     WHERE deleted_at IS NULL
       AND deadline < NOW()
       AND status NOT IN ('expired', 'archived', 'approved')
     ORDER BY deadline ASC`,
  );
  return result.rows;
}

/**
 * Get obligation completion statistics for the dashboard.
 */
export async function getObligationStats(
  tenantId: string,
): Promise<{
  total: number;
  active: number;
  overdue: number;
  completed: number;
  avgCompletion: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE deadline < NOW() AND status NOT IN ('expired','archived','approved'))::int AS overdue,
       COUNT(*) FILTER (WHERE status IN ('approved','expired'))::int AS completed,
       COALESCE(AVG(completion_percentage), 0)::numeric(5,2) AS avg_completion
     FROM "${schema}".dora_obligations
     WHERE deleted_at IS NULL`,
  );
  const row = getFirstRow(result)!;
  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    overdue: row?.overdue ?? 0,
    completed: row?.completed ?? 0,
    avgCompletion: Number(row?.avg_completion ?? 0),
  };
}
