// ============================================
// Shahin — Risk Management Service
// Extended risk CRUD, 5x5 heatmap, KRI trends
// Refactored: soft-delete, pagination, AppError
// ============================================

import { v4 as uuid } from "uuid";
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { createNotification, buildRiskScoreChangeNotifications } from '../../../../infrastructure/adapters/notification.adapter';
import { eventBus } from '../../ports/events.port';
import { NotFoundError } from "../../../../errors/index";
import { parsePaginationParams, buildPaginatedResult as paginatedResponse, PaginatedResult } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { recordActivity, SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// === Risk CRUD ===

export async function createRisk(tenantId: string, data: {
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  owner?: string;
  treatment_plan?: string;
  treatment_status?: string;
  control_ids?: string[];
  org_unit_id?: number | null;
  /** Feature 15: AI model risk register link */
  risk_category?: string | null;
  entity_links?: Record<string, unknown> | null;
}): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

export async function updateRisk(tenantId: string, riskId: string, update: {
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  status?: string;
  owner?: string;
  treatment_plan?: string;
  treatment_status?: string;
  control_ids?: string[];
  kri_config?: Record<string, unknown>;
  /** Feature 15: AI model risk register link */
  risk_category?: string | null;
  entity_links?: Record<string, unknown> | null;
}, actorUserId?: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT * FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`, [riskId]
  );
  if (current.rows.length === 0) throw new NotFoundError('risk', riskId);

  const result = await safeQuery(
    `UPDATE "${schema}".risks SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      likelihood = COALESCE($4, likelihood),
      impact = COALESCE($5, impact),
      status = COALESCE($6, status),
      owner = COALESCE($7, owner),
      treatment_plan = COALESCE($8, treatment_plan),
      treatment_status = COALESCE($9, treatment_status),
      control_ids = COALESCE($10, control_ids),
      kri_config = COALESCE($11, kri_config),
      risk_category = COALESCE($12, risk_category),
      entity_links = COALESCE($13, entity_links),
      updated_at = NOW()
     WHERE risk_id = $14 AND deleted_at IS NULL
     RETURNING *`,
    [
      update.title || null, update.description || null, update.category || null,
      update.likelihood || null, update.impact || null, update.status || null,
      update.owner || null, update.treatment_plan || null, update.treatment_status || null,
      update.control_ids || null, update.kri_config ? JSON.stringify(update.kri_config) : null,
      update.risk_category ?? null,
      update.entity_links != null ? JSON.stringify(update.entity_links) : null,
      riskId,
    ]
  );
  const updatedRisk = getFirstRow(result);
  const previousRisk = getFirstRow(current);

  // Record activity
  try { await recordActivity(tenantId, { userId: updatedRisk.owner || 'system', module: 'risk', action: 'update', entityType: 'risk', entityId: riskId, summary: `Updated risk: ${updatedRisk.title}`, changes: {} }); } catch { /* best-effort */ }

  // Trigger notification on risk score change
  const oldScore = (previousRisk.likelihood || 0) * (previousRisk.impact || 0);
  const newScore = (updatedRisk.likelihood || 0) * (updatedRisk.impact || 0);
  const owner = updatedRisk.owner;
  if (owner) {
    const triggers = buildRiskScoreChangeNotifications(owner, oldScore, newScore);
    for (const t of triggers) {
      try {
        await createNotification(tenantId, {
          userId: t.userId,
          type: t.type,
          title: `Risk score changed: ${updatedRisk.title}`,
          body: `Score changed from ${oldScore} to ${newScore}`,
          link: `/risks/${updatedRisk.risk_id}`,
        });
      } catch { /* best-effort */ }
    }
  }

  // EventBus: risk.score_changed + treatment updates
  try {
    if (oldScore !== newScore) {
      await eventBus.publish(({ eventType: 'risk.score_changed', tenantId, sourceService: 'risk', entityType: 'risk', entityId: riskId, severity: newScore >= 20 ? 'critical' : newScore >= 12 ? 'warning' : 'info', payload: { title: updatedRisk.title, oldScore, newScore, likelihood: updatedRisk.likelihood, impact: updatedRisk.impact } } as any));
    }
    if (update.treatment_status && update.treatment_status !== previousRisk.treatment_status) {
      await eventBus.publish(({
              eventType: 'risk.treatment_updated',
              tenantId,
              sourceService: 'risk',
              entityType: 'risk',
              entityId: riskId,
              severity: 'info',
              payload: {
                riskId,
                title: updatedRisk.title,
                oldStatus: previousRisk.treatment_status,
                newStatus: update.treatment_status,
                userId: actorUserId ?? null,
                severity:
                  (Number(updatedRisk.likelihood) || 0) * (Number(updatedRisk.impact) || 0) >= 20
                    ? 'critical'
                    : (Number(updatedRisk.likelihood) || 0) * (Number(updatedRisk.impact) || 0) >= 12
                      ? 'high'
                      : 'medium',
              },
            } as any));
    }
  } catch { /* best-effort */ }

  return { risk: updatedRisk, previous: previousRisk };
}

/** Paginated, filterable, searchable risk listing. */
export async function getRisks(
  tenantId: string,
  scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] },
  queryParams?: Record<string, unknown>,
): Promise<PaginatedResult<GenericRow>> {
  const schema = tenantSchema(tenantId);
  const { page, pageSize, sortBy, sortOrder: sortDir } = parsePaginationParams(queryParams || {});

  // Whitelist sortable columns
  const SORTABLE = ['risk_score', 'created_at', 'title', 'category', 'likelihood', 'impact', 'status', 'updated_at'];
  const orderCol = SORTABLE.includes(sortBy) ? sortBy : 'risk_score';

  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramIdx = 1;

  // Scope filtering for non-admin roles
  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('risk.record.read_all');
  if (scopeUser && !hasFullScope) {
    conditions.push(`(owner_user_id = $${paramIdx} OR created_by = $${paramIdx})`);
    params.push(scopeUser.userId);
    paramIdx++;
  }

  // Filter: status
  if (queryParams?.status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(queryParams.status);
    paramIdx++;
  }

  // Filter: category
  if (queryParams?.category) {
    conditions.push(`category = $${paramIdx}`);
    params.push(queryParams.category);
    paramIdx++;
  }

  // Filter: owner
  if (queryParams?.owner) {
    conditions.push(`owner = $${paramIdx}`);
    params.push(queryParams.owner);
    paramIdx++;
  }

  // Filter: score range
  if (queryParams?.minScore) {
    conditions.push(`risk_score >= $${paramIdx}`);
    params.push(queryParams.minScore);
    paramIdx++;
  }
  if (queryParams?.maxScore) {
    conditions.push(`risk_score <= $${paramIdx}`);
    params.push(queryParams.maxScore);
    paramIdx++;
  }

  // Full-text search
  if (queryParams?.search) {
    conditions.push(`search_text @@ plainto_tsquery('english', $${paramIdx})`);
    params.push(queryParams.search);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".risks ${whereClause}`,
    params
  );
  const total = getFirstRow(countResult)?.total || 0;

  // Fetch page
  const offset = (page - 1) * pageSize;
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".risks ${whereClause} ORDER BY "${orderCol}" ${sortDir} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, pageSize, offset]
  );

  return paginatedResponse(dataResult.rows, total, page, pageSize);
}

/** Get a single risk by ID (respects soft-delete). */
export async function getRiskById(tenantId: string, riskId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`, [riskId]
  );
  return getFirstRow(result) || null;
}

/** Soft-delete a risk. */
export async function deleteRisk(tenantId: string, riskId: string, deletedBy?: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE risk_id = $1 AND deleted_at IS NULL
     RETURNING risk_id`,
    [riskId, deletedBy || SYSTEM_JOB_ACTOR]
  );
  if (result.rows.length > 0) {
    try { await recordActivity(tenantId, { userId: deletedBy || SYSTEM_JOB_ACTOR, module: 'risk', action: 'delete', entityType: 'risk', entityId: riskId, summary: `Deleted risk: ${riskId}`, changes: {} }); } catch { /* best-effort */ }
  }
  return result.rows.length > 0;
}

/** Bulk soft-delete risks. */
export async function bulkDeleteRisks(tenantId: string, riskIds: string[], deletedBy?: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE risk_id = ANY($1::text[]) AND deleted_at IS NULL
     RETURNING risk_id`,
    [riskIds, deletedBy || SYSTEM_JOB_ACTOR]
  );
  return result.rows.length;
}

// === 5x5 Risk Heatmap Matrix ===

export async function getRiskMatrix(tenantId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT likelihood, impact, COUNT(*)::int as count,
            ARRAY_AGG(json_build_object('risk_id', risk_id, 'title', title, 'status', status)) as risks
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     GROUP BY likelihood, impact
     ORDER BY likelihood, impact`
  );

  // Build 5x5 matrix
  const matrix: { count: number; risks: unknown[] }[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, (): { count: number; risks: unknown[] } => ({ count: 0, risks: [] }))
  );

  for (const row of result.rows) {
    const l = row.likelihood - 1;
    const i = row.impact - 1;
    if (l >= 0 && l < 5 && i >= 0 && i < 5) {
      matrix[l][i] = { count: row.count, risks: row.risks };
    }
  }

  // Summary stats
  const allRisks = await safeQuery(
    `SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE risk_score >= 20)::int as critical,
            COUNT(*) FILTER (WHERE risk_score >= 12 AND risk_score < 20)::int as high,
            COUNT(*) FILTER (WHERE risk_score >= 6 AND risk_score < 12)::int as medium,
            COUNT(*) FILTER (WHERE risk_score < 6)::int as low,
            COUNT(*) FILTER (WHERE treatment_status = 'treated')::int as treated,
            COUNT(*) FILTER (WHERE treatment_status = 'untreated')::int as untreated
     FROM "${schema}".risks
     WHERE deleted_at IS NULL`
  );

  return {
    matrix,
    summary: getFirstRow(allRisks),
    labels: {
      likelihood: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'],
      impact: ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'],
    },
  };
}

// === KRI Trends ===

export async function getKRITrends(tenantId: string, riskId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const risk = await safeQuery(
    `SELECT risk_id, title, kri_config, likelihood, impact, risk_score, treatment_status
     FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`, [riskId]
  );
  if (risk.rows.length === 0) throw new NotFoundError('risk', riskId);

  const r = getFirstRow(risk);
  const kriConfig = r.kri_config || {};

  return {
    riskId: r.risk_id,
    title: r.title,
    currentScore: r.risk_score,
    likelihood: r.likelihood,
    impact: r.impact,
    treatmentStatus: r.treatment_status,
    kriConfig,
    trendData: kriConfig.history || [],
    thresholds: kriConfig.thresholds || { red: 20, amber: 12, green: 6 },
  };
}

// === Update KRI data point (append to history) ===

export async function addKRIDataPoint(tenantId: string, riskId: string, dataPoint: {
  value: number;
  date?: string;
  note?: string;
}): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

// === Vendor Risk Rollup into Enterprise Risk ===

/**
 * Computes aggregate vendor risk exposure blended into enterprise risk posture.
 * Returns vendor-originated risks, their contribution to total risk,
 * and whether any vendor risk exceeds appetite thresholds.
 */
export async function getVendorRiskRollup(tenantId: string): Promise<{
  vendorRisks: GenericRow[];
  totalVendorRiskScore: number;
  avgVendorRiskScore: number;
  vendorRiskPctOfTotal: number;
  vendorsExceedingAppetite: number;
  highestVendorRisk: GenericRow | null;
}> {
  const schema = tenantSchema(tenantId);

  // All vendor-sourced risks in enterprise register
  const vendorRisksRes = await safeQuery(
    `SELECT r.risk_id, r.title, r.risk_score, r.likelihood, r.impact,
            r.source_id AS vendor_id, r.status, r.treatment_status,
            v.name AS vendor_name, v.risk_rating AS vendor_tier
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = r.source_id
     WHERE r.source_type = 'vendor' AND r.deleted_at IS NULL AND r.status != 'closed'
     ORDER BY r.risk_score DESC`
  );

  const vendorRisks = vendorRisksRes.rows;
  const totalVendorRiskScore = vendorRisks.reduce((s: number, r: GenericRow) => s + (Number(r.risk_score) || 0), 0);
  const avgVendorRiskScore = vendorRisks.length > 0 ? Math.round(totalVendorRiskScore / vendorRisks.length) : 0;

  // Total enterprise risk
  const totalRes = await safeQuery(
    `SELECT COALESCE(SUM(risk_score), 0)::int AS total
     FROM "${schema}".risks WHERE deleted_at IS NULL AND status != 'closed'`
  );
  const totalEnterprise = Number(getFirstRow(totalRes)?.total) || 1;
  const vendorRiskPctOfTotal = Math.round((totalVendorRiskScore / totalEnterprise) * 100);

  // Vendors exceeding risk appetite
  let vendorsExceedingAppetite = 0;
  try {
    const appetiteRes = await safeQuery(
      `SELECT COUNT(*)::int AS n
       FROM "${schema}".risks r
       JOIN "${schema}".risk_appetite a ON r.category = a.category
       WHERE r.source_type = 'vendor' AND r.deleted_at IS NULL AND r.status != 'closed'
         AND r.risk_score > a.max_acceptable_score`
    );
    vendorsExceedingAppetite = Number(getFirstRow(appetiteRes)?.n) || 0;
  } catch { /* risk_appetite table may not exist */ }

  return {
    vendorRisks,
    totalVendorRiskScore,
    avgVendorRiskScore,
    vendorRiskPctOfTotal,
    vendorsExceedingAppetite,
    highestVendorRisk: vendorRisks.length > 0 ? vendorRisks[0] : null,
  };
}
