import { registerRule } from '../../ports/platform.port';
import { logger } from '../../ports/logger.port';
import { safeQuery } from "@dos/db";

export function registerControlRules() {
  registerRule({
    id: 'control.failed_critical',
    name: 'Critical Control Failure',
    description: 'A critical control failure always triggers governance action',
    condition: { '==': [{ var: 'severity' }, 'critical'] },
    action: 'create_governance_action',
    confidence: 1.0,
  });

  logger.info('[ControlsModule] Deterministic rules registered');
}
