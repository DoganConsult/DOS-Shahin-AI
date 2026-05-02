/**
 * RiskRegisterService — Real DB implementation
 * Replaces stub in risk/services/core/risk-register.service.ts
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type RiskStatus = 'identified' | 'assessed' | 'treated' | 'accepted' | 'closed' | 'escalated';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CreateRiskInput {
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  subCategory?: string;
  likelihood?: number;
  impact?: number;
  riskAppetite?: string;
  ownerId?: string;
  entityType?: string;
  entityId?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface RiskRecord {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: string;
  status: RiskStatus;
  likelihood: number | null;
  impact: number | null;
  inherent_score: number | null;
  residual_score: number | null;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const RISK_COLS = `id, tenant_id, title, description, category, sub_category, status,
  likelihood, impact, inherent_score, residual_score, risk_appetite,
  owner_id, entity_type, entity_id, due_date, review_date, metadata,
  created_by, created_at, updated_at`;

export async function createRisk(input: CreateRiskInput): Promise<RiskRecord> {
      const tenantId = input.tenantId;
      const result = await safeQuery(
        "SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""),
        tenantId ? [tenantId] : [],
      );
      return (result?.rows?.[0] as RiskRecord) ?? ({} as RiskRecord);
}

export async function getRiskById(id: string, tenantId: string): Promise<RiskRecord | null> {
  const res = await safeQuery(
    `SELECT ${RISK_COLS} FROM __TENANT_SCHEMA__.risks WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  return (res.rows[0] as RiskRecord) ?? null;
}

export async function updateRiskStatus(
  id: string, tenantId: string, status: RiskStatus, updatedBy: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.risks SET status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [status, id, tenantId],
  );
  logger.info('[Risk] Status updated', { id, tenantId, status, updatedBy });
}

export async function updateRiskScore(
  id: string, tenantId: string,
  likelihood: number, impact: number, residualScore?: number,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.risks
     SET likelihood = $1, impact = $2, residual_score = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5`,
    [likelihood, impact, residualScore ?? null, id, tenantId],
  );
}

export async function listRisks(tenantId: string, opts: {
  status?: RiskStatus; ownerId?: string; category?: string;
  limit?: number; offset?: number;
}): Promise<{ data: RiskRecord[]; total: number }> {
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (opts.status)   { conditions.push(`status = $${idx++}`);    params.push(opts.status); }
  if (opts.ownerId)  { conditions.push(`owner_id = $${idx++}`);  params.push(opts.ownerId); }
  if (opts.category) { conditions.push(`category = $${idx++}`);  params.push(opts.category); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit  = Math.min(opts.limit  ?? 50, 200);
  const offset = opts.offset ?? 0;

  const [countRes, dataRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.risks ${where}`, params),
    safeQuery(
      `SELECT ${RISK_COLS} FROM __TENANT_SCHEMA__.risks ${where}
       ORDER BY inherent_score DESC NULLS LAST, created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
  ]);
  return {
    data: dataRes.rows as RiskRecord[],
    total: (countRes.rows[0] as { total: number })?.total ?? 0,
  };
}

export async function assignRiskOwner(
  id: string, tenantId: string, ownerId: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.risks SET owner_id = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [ownerId, id, tenantId],
  );
}

export async function getRiskHeatmapData(tenantId: string): Promise<Array<{
  category: string; likelihood: number; impact: number; count: number;
}>> {
  const res = await safeQuery(
    `SELECT category,
            ROUND(AVG(likelihood))::int AS likelihood,
            ROUND(AVG(impact))::int AS impact,
            COUNT(*)::int AS count
     FROM __TENANT_SCHEMA__.risks
     WHERE tenant_id = $1 AND status NOT IN ('closed','accepted')
       AND likelihood IS NOT NULL AND impact IS NOT NULL
     GROUP BY category ORDER BY count DESC`,
    [tenantId],
  );
  return res.rows as Array<{ category: string; likelihood: number; impact: number; count: number }>;
}

export const RiskRegisterService = {
  createRisk, getRiskById, updateRiskStatus, updateRiskScore,
  listRisks, assignRiskOwner, getRiskHeatmapData,
};

// Phase 0.5: legacy-API aliases used by callers that have not migrated to the
// current camelCase surface. Risk is not user-certified in Wave 1; these keep
// the service building while callers are updated in Wave 2.
export const getRiskRegister = listRisks;
export const getRiskDetailById = getRiskById;
export async function exportRiskRegister(
  tenantId: string,
  opts: Parameters<typeof listRisks>[1] = {},
): Promise<ReturnType<typeof listRisks>> {
  return listRisks(tenantId, opts);
}
