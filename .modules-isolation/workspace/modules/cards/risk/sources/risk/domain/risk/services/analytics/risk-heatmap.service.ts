// ============================================
// Shahin — Risk Heatmap Service
// 5×5 likelihood × impact matrix generation
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';

export interface HeatmapMatrix {
  rows: string[];
  columns: string[];
  values: number[][];
}

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

export async function getHeatmapMatrix(tenantId: string): Promise<HeatmapMatrix> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT likelihood, impact, COUNT(*)::int as count
     FROM "${schema}".risks
     GROUP BY likelihood, impact`,
  );

  const values: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const r of result.rows) {
    const li = Math.max(0, Math.min(4, (r.likelihood || 1) - 1));
    const im = Math.max(0, Math.min(4, (r.impact || 1) - 1));
    values[li][im] = r.count;
  }

  return { rows: LIKELIHOOD_LABELS, columns: IMPACT_LABELS, values };
}

export async function getHeatmapWithDetails(
  tenantId: string,
): Promise<
  HeatmapMatrix & {
    details: Array<Array<Array<{ riskId: unknown; title: unknown; status: unknown }>>>;
  }
> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT likelihood, impact, risk_id, title, status
     FROM "${schema}".risks`,
  );

  type RiskCellItem = { riskId: unknown; title: unknown; status: unknown };
  type DetailGrid = Array<Array<Array<RiskCellItem>>>;

  const values: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  const details: DetailGrid = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, (): Array<RiskCellItem> => []),
  );

  for (const r of result.rows) {
    const li = Math.max(0, Math.min(4, (r.likelihood || 1) - 1));
    const im = Math.max(0, Math.min(4, (r.impact || 1) - 1));
    values[li][im]++;
    details[li][im].push({ riskId: r.risk_id, title: r.title, status: r.status });
  }

  return { rows: LIKELIHOOD_LABELS, columns: IMPACT_LABELS, values, details };
}
