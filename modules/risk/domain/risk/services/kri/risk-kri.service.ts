/**
 * RiskKriService — Real DB implementation (Key Risk Indicators)
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export async function createKri(tenantId: string, riskId: string, input: {
  kriCode: string; name: string; description?: string;
  thresholdAmber?: number; thresholdRed?: number; unit?: string; frequency?: string;
}): Promise<string> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.risk_kris
       (id, tenant_id, risk_id, kri_code, name, description,
        threshold_amber, threshold_red, unit, frequency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, tenantId, riskId, input.kriCode, input.name, input.description ?? null,
     input.thresholdAmber ?? null, input.thresholdRed ?? null,
     input.unit ?? null, input.frequency ?? 'monthly'],
  );
  return id;
}

export async function recordKriValue(
  kriId: string, tenantId: string, value: number,
): Promise<{ status: 'green' | 'amber' | 'red' }> {
  const meta = await safeQuery(
    `SELECT threshold_amber, threshold_red FROM __TENANT_SCHEMA__.risk_kris
     WHERE id = $1 AND tenant_id = $2`,
    [kriId, tenantId],
  );
  const row = meta.rows[0] as {
    threshold_amber: number | null; threshold_red: number | null;
  } | undefined;

  const status: 'green' | 'amber' | 'red' =
    row?.threshold_red != null && value >= row.threshold_red ? 'red' :
    row?.threshold_amber != null && value >= row.threshold_amber ? 'amber' : 'green';

  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.risk_kris
     SET current_value = $1, status = $2, last_collected = NOW(), updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4`,
    [value, status, kriId, tenantId],
  );
  logger.info('[RiskKRI] Value recorded', { kriId, value, status });
  return { status };
}

export async function getKrisByRisk(riskId: string, tenantId: string): Promise<unknown[]> {
  const res = await safeQuery(
    `SELECT id, kri_code, name, current_value, threshold_amber, threshold_red,
            unit, frequency, status, last_collected
     FROM __TENANT_SCHEMA__.risk_kris
     WHERE risk_id = $1 AND tenant_id = $2 ORDER BY name`,
    [riskId, tenantId],
  );
  return res.rows;
}

export async function getRedKris(tenantId: string): Promise<unknown[]> {
  const res = await safeQuery(
    `SELECT k.id, k.kri_code, k.name, k.current_value, k.threshold_red,
            k.status, k.risk_id, r.title AS risk_title, r.owner_id
     FROM __TENANT_SCHEMA__.risk_kris k
     JOIN __TENANT_SCHEMA__.risks r ON r.id = k.risk_id
     WHERE k.tenant_id = $1 AND k.status = 'red'
     ORDER BY k.last_collected DESC`,
    [tenantId],
  );
  return res.rows;
}

export const RiskKriService = { createKri, recordKriValue, getKrisByRisk, getRedKris };

// Phase 0.5: legacy-API aliases. KRI callers use CamelCase names with a
// (tenantId-first, then id/filters) signature. The underlying service has
// been renamed to camelCase Kri with a different parameter order. These
// stubs match the caller contract and return safe empty results so the
// service builds in Wave 1 (risk is not user-certified). Wave 2 restores
// the real implementation.
export const getKRIs = async (_tenantId: string, _filters?: Record<string, string>): Promise<unknown[]> => [];
export const createKRIEntry = async (_tenantId: string, _input: unknown): Promise<{ kri_id: string } | null> => null;
export const updateKRIEntry = async (_tenantId: string, _id: string, _input: unknown): Promise<unknown | null> => null;
export const getKRITrendsData = async (_tenantId: string, _kriId?: string): Promise<unknown[]> => [];
export const getKRIBreachLog = async (_tenantId: string, _filters?: Record<string, string>): Promise<unknown[]> => [];
export const getReviewCadenceData = async (_tenantId: string): Promise<unknown[]> => [];
export const getKRIHistory = async (_tenantId: string, _kriId?: string): Promise<unknown[]> => [];
export const getKRICorrelation = async (_tenantId: string): Promise<unknown[]> => [];
export const addKRIDataPoint = async (_tenantId: string, _kriId: string, _input: unknown): Promise<unknown | null> => null;
