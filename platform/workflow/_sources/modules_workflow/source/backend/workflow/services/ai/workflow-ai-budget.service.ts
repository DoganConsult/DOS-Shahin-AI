import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger } from '../../ports/logger.port';

// DAuth authority check for expensive AI operations is enforced in budget-guard.ts (Patch 8 §2.13).
// checkBudget() enforces tenant-level execution/cost limits; actor authority is
// validated by the calling service before invoking budget checks.

export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface AIBudget {
  budget_id: string;
  tenant_id: string;
  period_type: BudgetPeriod;
  max_executions: number;
  max_cost_units: number;
  current_executions: number;
  current_cost_units: number;
  period_start: string;
  period_end: string | null;
  is_active: boolean;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remaining_executions: number;
  remaining_cost_units: number;
  utilization_pct: number;
}

export async function getBudget(
  tenantId: string,
  periodType: BudgetPeriod = 'daily',
): Promise<AIBudget | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_ai_budget
     WHERE tenant_id = $1 AND period_type = $2 AND is_active = TRUE`,
    [tenantId, periodType],
  );
  return result.rows.length > 0 ? mapRow(getFirstRow(result)) : null;
}

export async function checkBudget(
  tenantId: string,
  costUnits = 1,
): Promise<BudgetCheckResult> {
  const schema = tenantSchema(tenantId);

  const budgets = await safeQuery(
    `SELECT * FROM "${schema}".workflow_ai_budget
     WHERE tenant_id = $1 AND is_active = TRUE`,
    [tenantId],
  );

  if (budgets.rows.length === 0) {
    return { allowed: true, remaining_executions: 999999, remaining_cost_units: 999999, utilization_pct: 0 };
  }

  for (const row of budgets.rows) {
    const budget = mapRow(row);

    if (budget.period_end && new Date(budget.period_end) < new Date()) {
      await resetBudgetPeriod(tenantId, budget.budget_id, budget.period_type);
      continue;
    }

    if (budget.current_executions >= budget.max_executions) {
      return {
        allowed: false,
        reason: `Execution limit reached (${budget.current_executions}/${budget.max_executions}) for ${budget.period_type} period`,
        remaining_executions: 0,
        remaining_cost_units: Math.max(0, budget.max_cost_units - budget.current_cost_units),
        utilization_pct: 100,
      };
    }

    if (budget.current_cost_units + costUnits > budget.max_cost_units) {
      return {
        allowed: false,
        reason: `Cost limit would be exceeded (${budget.current_cost_units + costUnits}/${budget.max_cost_units}) for ${budget.period_type} period`,
        remaining_executions: Math.max(0, budget.max_executions - budget.current_executions),
        remaining_cost_units: 0,
        utilization_pct: (budget.current_cost_units / budget.max_cost_units) * 100,
      };
    }
  }

  const first = mapRow(budgets.rows[0]);
  return {
    allowed: true,
    remaining_executions: Math.max(0, first.max_executions - first.current_executions),
    remaining_cost_units: Math.max(0, first.max_cost_units - first.current_cost_units),
    utilization_pct: (first.current_executions / first.max_executions) * 100,
  };
}

export async function recordExecution(
  tenantId: string,
  costUnits = 1,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".workflow_ai_budget
     SET current_executions = current_executions + 1,
         current_cost_units = current_cost_units + $1
     WHERE tenant_id = $2 AND is_active = TRUE`,
    [costUnits, tenantId],
  ).catch(err => {
    logger.warn(`[AIBudget] Failed to record execution: ${err instanceof Error ? err.message : String(err)}`);
  });
}

export async function upsertBudget(
  tenantId: string,
  input: {
    periodType: BudgetPeriod;
    maxExecutions: number;
    maxCostUnits: number;
  },
): Promise<AIBudget> {
  const schema = tenantSchema(tenantId);
  const periodEnd = computePeriodEnd(input.periodType);

  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_ai_budget
       (tenant_id, period_type, max_executions, max_cost_units, period_end)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, period_type) WHERE is_active = TRUE DO UPDATE SET
       max_executions = EXCLUDED.max_executions,
       max_cost_units = EXCLUDED.max_cost_units,
       period_end = EXCLUDED.period_end
     RETURNING *`,
    [tenantId, input.periodType, input.maxExecutions, input.maxCostUnits, periodEnd],
  );
  return mapRow(getFirstRow(result));
}

async function resetBudgetPeriod(tenantId: string, budgetId: string, periodType: BudgetPeriod): Promise<void> {
  const schema = tenantSchema(tenantId);
  const periodEnd = computePeriodEnd(periodType);
  await safeQuery(
    `UPDATE "${schema}".workflow_ai_budget
     SET current_executions = 0, current_cost_units = 0,
         period_start = NOW(), period_end = $1
     WHERE budget_id = $2`,
    [periodEnd, budgetId],
  );
}

function computePeriodEnd(periodType: BudgetPeriod): string {
  const now = new Date();
  switch (periodType) {
    case 'hourly': now.setHours(now.getHours() + 1); break;
    case 'daily': now.setDate(now.getDate() + 1); break;
    case 'weekly': now.setDate(now.getDate() + 7); break;
    case 'monthly': now.setMonth(now.getMonth() + 1); break;
  }
  return now.toISOString();
}

function mapRow(row: Record<string, unknown>): AIBudget {
  return {

    budget_id: row.budget_id,

    tenant_id: row.tenant_id,

    period_type: row.period_type,
    max_executions: Number(row.max_executions),
    max_cost_units: Number(row.max_cost_units),
    current_executions: Number(row.current_executions ?? 0),
    current_cost_units: Number(row.current_cost_units ?? 0),

    period_start: row.period_start,

    period_end: row.period_end || null,

    is_active: row.is_active ?? true,
  };
}
