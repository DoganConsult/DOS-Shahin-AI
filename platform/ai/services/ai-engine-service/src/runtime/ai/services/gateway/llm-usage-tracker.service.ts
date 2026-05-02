import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

export interface UsageRecord {
  tenantId: string;
  userId?: string;
  agentId?: string;
  runId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cacheHit?: boolean;
  endpointType?: string;
  error?: string;
}

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'llama-3.3-70b-versatile': { input: 0.0, output: 0.0 },
  'gemini-2.0-flash': { input: 0.0, output: 0.0 },
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'mistral-small-latest': { input: 0.0002, output: 0.0006 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rate = COST_PER_1K[model];
  if (!rate) return 0;
  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
}

export async function trackUsage(record: UsageRecord): Promise<void> {
  const schema = tenantSchema(record.tenantId);
  const totalTokens = record.inputTokens + record.outputTokens;
  const costUsd = estimateCost(record.model, record.inputTokens, record.outputTokens);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".llm_usage_log
         (tenant_id, user_id, agent_id, run_id, provider, model,
          input_tokens, output_tokens, total_tokens, cost_usd,
          latency_ms, cache_hit, endpoint_type, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        record.tenantId, record.userId || null, record.agentId || null,
        record.runId || null, record.provider, record.model,
        record.inputTokens, record.outputTokens, totalTokens, costUsd,
        record.latencyMs, record.cacheHit || false,
        record.endpointType || 'chat', record.error || null,
      ],
    );

    await safeQuery(
      `UPDATE "${schema}".tenant_llm_budgets
       SET tokens_used_month = tokens_used_month + $1,
           cost_used_month = cost_used_month + $2,
           updated_at = NOW()
       WHERE tenant_id = $3`,
      [totalTokens, costUsd, record.tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  } catch { /* non-fatal */ }
}

export interface UsageSummary {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
  byAgent: Record<string, { calls: number; tokens: number; cost: number }>;
}

export async function getUsageSummary(
  tenantId: string,
  daysBack: number = 30,
): Promise<UsageSummary> {
  const schema = tenantSchema(tenantId);
  const summary: UsageSummary = {
    totalCalls: 0, totalTokens: 0, totalCost: 0, avgLatency: 0,
    byProvider: {}, byAgent: {},
  };

  try {
    const result = await safeQuery(
      `SELECT provider, agent_id,
              COUNT(*)::int AS calls,
              SUM(total_tokens)::int AS tokens,
              SUM(cost_usd)::real AS cost,
              AVG(latency_ms)::int AS avg_latency
       FROM "${schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY provider, agent_id`,
      [tenantId, daysBack],
    );

    for (const row of result.rows) {
      summary.totalCalls += row.calls;
      summary.totalTokens += row.tokens || 0;
      summary.totalCost += row.cost || 0;

      if (row.provider) {
        if (!summary.byProvider[row.provider]) summary.byProvider[row.provider] = { calls: 0, tokens: 0, cost: 0 };
        summary.byProvider[row.provider].calls += row.calls;
        summary.byProvider[row.provider].tokens += row.tokens || 0;
        summary.byProvider[row.provider].cost += row.cost || 0;
      }

      if (row.agent_id) {
        if (!summary.byAgent[row.agent_id]) summary.byAgent[row.agent_id] = { calls: 0, tokens: 0, cost: 0 };
        summary.byAgent[row.agent_id].calls += row.calls;
        summary.byAgent[row.agent_id].tokens += row.tokens || 0;
        summary.byAgent[row.agent_id].cost += row.cost || 0;
      }

      summary.avgLatency = row.avg_latency || 0;
    }
  } catch { /* non-fatal */ }

  return summary;
}

export interface BudgetStatus {
  tenant_id: string;
  monthly_token_limit: number;
  monthly_cost_limit: number;
  tokens_used_month: number;
  cost_used_month: number;
  tokens_pct: number;
  cost_pct: number;
  budget_reset_at: string;
  soft_limit_pct: number;
  hard_limit_action: string;
  is_over_soft: boolean;
  is_over_hard: boolean;
}

export async function getBudgetStatus(tenantId: string): Promise<BudgetStatus | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".tenant_llm_budgets WHERE tenant_id = $1`,
      [tenantId],
    );
    if (result.rows.length === 0) return null;
    const b = getFirstRow(result);
    const tokensPct = b.monthly_token_limit > 0 ? (b.tokens_used_month / b.monthly_token_limit) * 100 : 0;
    const costPct = b.monthly_cost_limit > 0 ? (b.cost_used_month / b.monthly_cost_limit) * 100 : 0;
    return {
      ...b,
      tokens_pct: Math.round(tokensPct * 10) / 10,
      cost_pct: Math.round(costPct * 10) / 10,
      is_over_soft: tokensPct >= b.soft_limit_pct || costPct >= b.soft_limit_pct,
      is_over_hard: tokensPct >= 100 || costPct >= 100,
    };
  } catch {
    return null;
  }
}

export async function ensureBudgetRecord(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".tenant_llm_budgets (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [tenantId],
    );
  } catch { /* non-fatal */ }
}

export async function updateBudgetLimits(
  tenantId: string,
  tokenLimit: number,
  costLimit: number,
  softPct: number,
  hardAction: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".tenant_llm_budgets
       SET monthly_token_limit = $1, monthly_cost_limit = $2,
           soft_limit_pct = $3, hard_limit_action = $4, updated_at = NOW()
       WHERE tenant_id = $5`,
      [tokenLimit, costLimit, softPct, hardAction, tenantId],
    );
    return true;
  } catch {
    return false;
  }
}

export async function checkBudgetAllowance(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
  const status = await getBudgetStatus(tenantId);
  if (!status) return { allowed: true };

  if (status.is_over_hard) {
    if (status.hard_limit_action === 'block') {
      return { allowed: false, reason: 'Monthly LLM budget exceeded (hard limit)' };
    }
    if (status.hard_limit_action === 'throttle') {
      return { allowed: true, reason: 'Budget exceeded — throttled mode' };
    }
  }
  return { allowed: true };
}

export async function resetMonthlyBudgets(): Promise<number> {
  let count = 0;
  try {
    const result = await safeQuery(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`,
    );
    for (const row of result.rows) {
      try {
        await safeQuery(
          `UPDATE "${row.schema_name}".tenant_llm_budgets
           SET tokens_used_month = 0, cost_used_month = 0,
               notified_soft = FALSE, notified_hard = FALSE,
               budget_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month',
               updated_at = NOW()
           WHERE budget_reset_at <= NOW()`,
        );
        count++;
      } catch { /* schema may not have table */ }
    }
  } catch { /* non-fatal */ }
  return count;
}
