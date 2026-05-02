export type ComplianceStatus = 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';

export interface ComplianceRule {
  id: string;
  name: string;
  frameworkCode: string;
  controlCode: string;
  condition: (context: ComplianceContext) => boolean;
  weight?: number;
}

export interface ComplianceContext {
  tenantId: string;
  frameworkCode?: string;
  controlCode?: string;
  evidenceCount?: number;
  lastAuditDate?: Date;
  isExceptionGranted?: boolean;
  customAttributes?: Record<string, unknown>;
}

export interface ComplianceRuleResult {
  ruleId: string;
  ruleName: string;
  status: ComplianceStatus;
  weight: number;
}

export interface ComplianceEvaluationResult {
  tenantId: string;
  overallStatus: ComplianceStatus;
  score: number;
  results: ComplianceRuleResult[];
  evaluatedAt: Date;
}

const DEFAULT_RULES: ComplianceRule[] = [
  {
    id: 'rule-evidence-required',
    name: 'Evidence must be present',
    frameworkCode: '*',
    controlCode: '*',
    condition: ctx => (ctx.evidenceCount ?? 0) > 0,
    weight: 1,
  },
  {
    id: 'rule-audit-recency',
    name: 'Audit within last 12 months',
    frameworkCode: '*',
    controlCode: '*',
    condition: ctx => {
      if (!ctx.lastAuditDate) return false;
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      return ctx.lastAuditDate >= twelveMonthsAgo;
    },
    weight: 1,
  },
  {
    id: 'rule-exception-check',
    name: 'No open exception',
    frameworkCode: '*',
    controlCode: '*',
    condition: ctx => !ctx.isExceptionGranted,
    weight: 0.5,
  },
];

function evaluateRule(rule: ComplianceRule, context: ComplianceContext): ComplianceRuleResult {
  let status: ComplianceStatus;
  try {
    status = rule.condition(context) ? 'compliant' : 'non-compliant';
  } catch {
    status = 'not-applicable';
  }
  return { ruleId: rule.id, ruleName: rule.name, status, weight: rule.weight ?? 1 };
}

export function evaluateComplianceRules(
  context: ComplianceContext,
  rules: ComplianceRule[] = DEFAULT_RULES,
): ComplianceEvaluationResult {
  const results = rules.map(r => evaluateRule(r, context));
  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const compliantWeight = results
    .filter(r => r.status === 'compliant')
    .reduce((sum, r) => sum + r.weight, 0);
  const score = totalWeight > 0 ? (compliantWeight / totalWeight) * 100 : 100;

  let overallStatus: ComplianceStatus;
  if (score >= 100) {
    overallStatus = 'compliant';
  } else if (score === 0) {
    overallStatus = 'non-compliant';
  } else {
    overallStatus = 'partial';
  }

  return {
    tenantId: context.tenantId,
    overallStatus,
    score,
    results,
    evaluatedAt: new Date(),
  };
}
