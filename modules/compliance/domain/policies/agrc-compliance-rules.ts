// @ts-nocheck — module-layer imports not yet extracted
import type { ComplianceRule, RuleResult } from '@dos/module-sdk';
import { evaluateComplianceRules } from '@dos/module-sdk';

export function buildComplianceScoringRules(): ComplianceRule[] {
  return [
    {
      id: 'critical-control-gap',
      name: 'Critical Control Gap',
      nameAr: 'فجوة ضابط حرج',
      priority: 10,
      conditions: {
        all: [
          { fact: 'controlEffectiveness', operator: 'lessThan', value: 30 },
          { fact: 'controlCriticality', operator: 'equal', value: 'critical' },
        ],
      },
      event: {
        type: 'compliance_alert',
        params: { severity: 'critical', action: 'immediate_review', message: 'Critical control effectiveness below 30%' },
      },
    },
    {
      id: 'risk-threshold-breach',
      name: 'Risk Threshold Breach',
      nameAr: 'تجاوز عتبة المخاطر',
      priority: 8,
      conditions: {
        all: [
          { fact: 'riskScore', operator: 'greaterThanInclusive', value: 80 },
          { fact: 'hasMitigationPlan', operator: 'equal', value: false },
        ],
      },
      event: {
        type: 'risk_alert',
        params: { severity: 'high', action: 'create_remediation', message: 'High risk without mitigation plan' },
      },
    },
    {
      id: 'evidence-staleness',
      name: 'Evidence Staleness Alert',
      nameAr: 'تنبيه قِدم الأدلة',
      priority: 5,
      conditions: {
        all: [
          { fact: 'evidenceAgeDays', operator: 'greaterThan', value: 90 },
          { fact: 'controlStatus', operator: 'equal', value: 'active' },
        ],
      },
      event: {
        type: 'evidence_alert',
        params: { severity: 'medium', action: 'request_evidence', message: 'Evidence older than 90 days' },
      },
    },
    {
      id: 'sla-breach',
      name: 'SLA Breach Detection',
      nameAr: 'كشف خرق اتفاقية مستوى الخدمة',
      priority: 9,
      conditions: {
        all: [
          { fact: 'daysOverdue', operator: 'greaterThan', value: 0 },
          { fact: 'taskPriority', operator: 'in', value: ['critical', 'high'] },
        ],
      },
      event: {
        type: 'sla_breach',
        params: { severity: 'high', action: 'escalate', message: 'High-priority task overdue' },
      },
    },
    {
      id: 'audit-readiness',
      name: 'Audit Readiness Check',
      nameAr: 'فحص جاهزية التدقيق',
      priority: 6,
      conditions: {
        all: [
          { fact: 'complianceScore', operator: 'lessThan', value: 70 },
          { fact: 'upcomingAuditDays', operator: 'lessThanInclusive', value: 30 },
        ],
      },
      event: {
        type: 'audit_readiness_alert',
        params: { severity: 'high', action: 'compliance_sprint', message: 'Low compliance score with audit approaching' },
      },
    },
    {
      id: 'vendor-risk-escalation',
      name: 'Vendor Risk Escalation',
      nameAr: 'تصعيد مخاطر المورد',
      priority: 7,
      conditions: {
        all: [
          { fact: 'vendorRiskRating', operator: 'equal', value: 'critical' },
          { fact: 'hasActiveContracts', operator: 'equal', value: true },
        ],
      },
      event: {
        type: 'vendor_alert',
        params: { severity: 'critical', action: 'vendor_review', message: 'Critical vendor risk with active contracts' },
      },
    },
  ];
}

export async function evaluateControlCompliance(
  controlId: string,
  facts: {
    controlEffectiveness: number;
    controlCriticality: string;
    evidenceAgeDays: number;
    controlStatus: string;
  },
): Promise<RuleResult[]> {
  const rules = buildComplianceScoringRules().filter(r =>
    ['critical-control-gap', 'evidence-staleness'].includes(r.id)
  );
  return evaluateComplianceRules(facts, rules);
}

export async function evaluateRiskThresholds(
  riskId: string,
  facts: {
    riskScore: number;
    hasMitigationPlan: boolean;
  },
): Promise<RuleResult[]> {
  const rules = buildComplianceScoringRules().filter(r => r.id === 'risk-threshold-breach');
  return evaluateComplianceRules(facts, rules);
}
