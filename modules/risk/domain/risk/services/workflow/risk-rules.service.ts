import { registerRule } from '../../ports/platform.port';
import { logger } from '../../ports/logger.port';
import { safeQuery } from "@dos/db";

export function registerRiskRules() {
  registerRule({
    id: 'risk.critical_score',
    name: 'Critical Risk Score',
    description: 'Any risk with score >= 20 is critical',
    condition: { '>=': [{ var: 'risk_score' }, 20] },
    action: 'escalate_to_governance',
    confidence: 0.99,
  });

  registerRule({
    id: 'risk.high_score',
    name: 'High Risk Score',
    description: 'Risk score 15-19 is high priority',
    condition: { and: [{ '>=': [{ var: 'risk_score' }, 15] }, { '<': [{ var: 'risk_score' }, 20] }] },
    action: 'assign_risk_owner',
    confidence: 0.95,
  });

  logger.info('[RiskModule] Deterministic rules registered');
}
