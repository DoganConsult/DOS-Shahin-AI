/**
 * DNOC AI Operations — Per-Tenant Daily Cost Rollup.
 *
 * Aggregates token usage from public.agent_performance_log and converts
 * to USD using configured per-token prices. Joins per-tenant cap from
 * dos.tenants.settings->>'ai_daily_usd_cap' so the dashboard can show
 * "today $X / $Y, N% of cap".
 */

import type { QueryFn } from './unified-timeline.service';

export interface CostRollupRow {
  tenantId: string;
  spentUsdToday: number;
  spentUsd7Day: number;
  spentUsd30Day: number;
  capUsdDaily: number;
  pctOfCapToday: number; // 0..100+
}

const PRICE_INPUT_PER_MTOK = parseFloat(process.env.AI_PRICE_INPUT_USD_PER_MTOK || '3');
const PRICE_OUTPUT_PER_MTOK = parseFloat(process.env.AI_PRICE_OUTPUT_USD_PER_MTOK || '15');
const DEFAULT_CAP = parseFloat(process.env.AI_TENANT_DAILY_USD_CAP || '50');

function tokensToUsd(tin: number, tout: number): number {
  return (tin / 1e6) * PRICE_INPUT_PER_MTOK + (tout / 1e6) * PRICE_OUTPUT_PER_MTOK;
}

export async function getCostRollup(
  query: QueryFn,
  opts: { tenantId?: string } = {},
): Promise<CostRollupRow[]> {
  const tenantClause = opts.tenantId ? `WHERE tenant_id = $1` : '';
  const params = opts.tenantId ? [opts.tenantId] : [];

  const perfRes = await query(
    `WITH today AS (
       SELECT tenant_id, COALESCE(SUM(tokens_in),0)::int AS tin, COALESCE(SUM(tokens_out),0)::int AS tout
         FROM public.agent_performance_log
        WHERE created_at >= CURRENT_DATE
        GROUP BY tenant_id
     ),
     last7 AS (
       SELECT tenant_id, COALESCE(SUM(tokens_in),0)::int AS tin, COALESCE(SUM(tokens_out),0)::int AS tout
         FROM public.agent_performance_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY tenant_id
     ),
     last30 AS (
       SELECT tenant_id, COALESCE(SUM(tokens_in),0)::int AS tin, COALESCE(SUM(tokens_out),0)::int AS tout
         FROM public.agent_performance_log
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY tenant_id
     ),
     tenants AS (
       SELECT DISTINCT tenant_id FROM (
         SELECT tenant_id FROM today
         UNION SELECT tenant_id FROM last7
         UNION SELECT tenant_id FROM last30
       ) all_tenants
     )
     SELECT t.tenant_id,
            COALESCE(today.tin,0)  AS today_tin,  COALESCE(today.tout,0)  AS today_tout,
            COALESCE(last7.tin,0)  AS d7_tin,     COALESCE(last7.tout,0)  AS d7_tout,
            COALESCE(last30.tin,0) AS d30_tin,    COALESCE(last30.tout,0) AS d30_tout
       FROM tenants t
       LEFT JOIN today  USING (tenant_id)
       LEFT JOIN last7  USING (tenant_id)
       LEFT JOIN last30 USING (tenant_id)
      ${tenantClause}
      ORDER BY tenant_id`,
    params,
  ).catch(() => ({ rows: [] }));

  // Per-tenant caps live in dos.tenants.settings->>'ai_daily_usd_cap'.
  const capsRes = await query(
    `SELECT tenant_id, COALESCE((settings->>'ai_daily_usd_cap')::float, NULL) AS cap
       FROM dos.tenants`,
    [],
  ).catch(() => ({ rows: [] }));

  const capByTenant = new Map<string, number>();
  for (const r of capsRes.rows) {
    if (typeof r.cap === 'number' && Number.isFinite(r.cap)) {
      capByTenant.set(r.tenant_id, r.cap);
    }
  }

  return perfRes.rows.map((r: any): CostRollupRow => {
    const today = tokensToUsd(Number(r.today_tin), Number(r.today_tout));
    const d7 = tokensToUsd(Number(r.d7_tin), Number(r.d7_tout));
    const d30 = tokensToUsd(Number(r.d30_tin), Number(r.d30_tout));
    const cap = capByTenant.get(r.tenant_id) ?? DEFAULT_CAP;
    return {
      tenantId: r.tenant_id,
      spentUsdToday: Number(today.toFixed(4)),
      spentUsd7Day: Number(d7.toFixed(4)),
      spentUsd30Day: Number(d30.toFixed(4)),
      capUsdDaily: cap,
      pctOfCapToday: cap > 0 ? Math.round((today / cap) * 100) : 0,
    };
  });
}
