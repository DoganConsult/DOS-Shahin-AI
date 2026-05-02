/**
 * cost-cap.service — real-time per-tenant daily LLM cost cap.
 *
 * Reads today's tokens_in / tokens_out from public.agent_performance_log,
 * converts to USD using per-model pricing, and compares against the
 * tenant cap from env or per-tenant config. Returns deny if a follow-on
 * Claude call would exceed the cap.
 *
 * Env:
 *   AI_COST_HARD_CAP_ENABLED  (default: true)
 *   AI_TENANT_DAILY_USD_CAP   (default: 50)  — per-tenant daily ceiling in USD
 *   AI_PRICE_INPUT_USD_PER_MTOK   (default: 3 — Claude Sonnet 4 input price)
 *   AI_PRICE_OUTPUT_USD_PER_MTOK  (default: 15 — Claude Sonnet 4 output price)
 *
 * Per-tenant overrides may live in dos.tenants.settings->>'ai_daily_usd_cap'
 * (consulted when present).
 */

import { safeQuery } from '../../ports/database.port';

export interface CostStatus {
  allowed: boolean;
  reason: string;
  spentTodayUsd: number;
  capUsd: number;
  remainingUsd: number;
}

function priceInputPerMTok(): number {
  const v = parseFloat(String(process.env.AI_PRICE_INPUT_USD_PER_MTOK || '3'));
  return Number.isFinite(v) && v > 0 ? v : 3;
}
function priceOutputPerMTok(): number {
  const v = parseFloat(String(process.env.AI_PRICE_OUTPUT_USD_PER_MTOK || '15'));
  return Number.isFinite(v) && v > 0 ? v : 15;
}

function defaultCapUsd(): number {
  const v = parseFloat(String(process.env.AI_TENANT_DAILY_USD_CAP || '50'));
  return Number.isFinite(v) && v > 0 ? v : 50;
}

function flagOn(): boolean {
  const v = process.env.AI_COST_HARD_CAP_ENABLED;
  if (v === undefined) return true;
  return v === 'true' || v === '1';
}

export function tokensToUsd(tokensIn: number, tokensOut: number): number {
  const inUsd = (tokensIn / 1_000_000) * priceInputPerMTok();
  const outUsd = (tokensOut / 1_000_000) * priceOutputPerMTok();
  return inUsd + outUsd;
}

async function tenantDailyCapUsd(tenantId: string): Promise<number> {
  try {
    const r = await safeQuery(
      `SELECT (settings->>'ai_daily_usd_cap')::float AS cap
         FROM dos.tenants
        WHERE tenant_id = $1
        LIMIT 1`,
      [tenantId],
    );
    const cap = Number(r.rows?.[0]?.cap);
    if (Number.isFinite(cap) && cap > 0) return cap;
  } catch {
    /* tenants table absent / column missing — fall through */
  }
  return defaultCapUsd();
}

export async function getTenantSpendToday(tenantId: string): Promise<number> {
  try {
    const r = await safeQuery(
      `SELECT COALESCE(SUM(tokens_in), 0)::int AS tin,
              COALESCE(SUM(tokens_out), 0)::int AS tout
         FROM public.agent_performance_log
        WHERE tenant_id = $1
          AND created_at >= CURRENT_DATE`,
      [tenantId],
    );
    const tin = Number(r.rows?.[0]?.tin || 0);
    const tout = Number(r.rows?.[0]?.tout || 0);
    return tokensToUsd(tin, tout);
  } catch {
    return 0;
  }
}

/**
 * Check whether the next Claude call for this tenant would exceed the daily
 * USD cap. The check is conservative: if today's spend ALREADY exceeds the
 * cap, deny. Soft-budget callers can also pass `estimatedNextCallUsd` to
 * enforce strict pre-call accounting.
 */
export async function checkCostCap(
  tenantId: string,
  estimatedNextCallUsd: number = 0,
): Promise<CostStatus> {
  if (!flagOn()) {
    return {
      allowed: true,
      reason: 'cost cap disabled (AI_COST_HARD_CAP_ENABLED=false)',
      spentTodayUsd: 0,
      capUsd: 0,
      remainingUsd: Number.POSITIVE_INFINITY,
    };
  }

  const [spent, cap] = await Promise.all([
    getTenantSpendToday(tenantId),
    tenantDailyCapUsd(tenantId),
  ]);
  const projected = spent + Math.max(0, estimatedNextCallUsd);
  const remaining = Math.max(0, cap - spent);

  if (projected > cap) {
    return {
      allowed: false,
      reason: `BUDGET_EXCEEDED: spent=$${spent.toFixed(4)}, cap=$${cap.toFixed(2)}, projected=$${projected.toFixed(4)}`,
      spentTodayUsd: spent,
      capUsd: cap,
      remainingUsd: remaining,
    };
  }

  return {
    allowed: true,
    reason: 'within budget',
    spentTodayUsd: spent,
    capUsd: cap,
    remainingUsd: remaining,
  };
}
