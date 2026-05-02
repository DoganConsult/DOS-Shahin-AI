// ============================================
// Policy Code Service — minimal contract-shape implementation
// Monolith equivalent (modules/policy/.../policy-code.service.ts) is itself a
// re-export chain with no real implementation, so this returns the
// caller-expected shape with no rule triggered. Callers (agrc-os-orchestrator)
// only check `result.triggered` and `result.action?.type`.
// ============================================

import { withTenantClient } from '@dos/db';

export interface PolicyRule {
  rule_id?: string;
  ruleId?: string;
  condition?: unknown;
  action?: { type: string; [k: string]: unknown };
  enabled?: boolean;
  [k: string]: unknown;
}

export interface RuleEvaluationContext {
  tenantId: string;
  [k: string]: unknown;
}

export interface RuleEvaluationResult {
  triggered: boolean;
  action: { type: string; [k: string]: unknown } | null;
  ruleId?: string;
}

/**
 * Evaluate a policy rule against a context. Without a monolith source to
 * port, this is a no-trigger placeholder — caller (agrc-os-orchestrator)
 * reads `triggered` and `action.type` and short-circuits when triggered=false.
 */
export function executeRule(
  rule: PolicyRule | null | undefined,
  _context?: RuleEvaluationContext,
): RuleEvaluationResult {
  return {
    triggered: false,
    action: null,
    ruleId: rule?.rule_id ?? rule?.ruleId,
  };
}

export async function getPolicyRules(tenantId: string): Promise<PolicyRule[]> {
  return withTenantClient(tenantId, async (client) => {
    try {
      const result = await client.query(
        `SELECT * FROM policy_code_rules ORDER BY created_at DESC`,
      );
      return result.rows as PolicyRule[];
    } catch {
      return [];
    }
  });
}
