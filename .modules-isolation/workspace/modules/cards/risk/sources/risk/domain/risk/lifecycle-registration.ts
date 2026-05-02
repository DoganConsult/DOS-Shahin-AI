/**
 * Risk Module — Lifecycle Registry Registration
 *
 * Registers the risk entity lifecycle (states + transitions) with the
 * central LifecycleRegistry. Aligned with migration 174 enterprise states.
 * Legacy domain states (identified, mitigating, accepted, archived) preserved
 * for backward compatibility with existing SQL/services.
 */

import { registerLifecycleDefinition, EntityStateMachine } from './ports/lifecycle.port';
import { RISK_STATES, RISK_TRANSITIONS } from './workflows/risk-lifecycle';

registerLifecycleDefinition(
  'risk',
  'risk',
  RISK_STATES,
  RISK_TRANSITIONS as Record<string, string[]>,
  {
    initialState: 'draft',
    terminalStates: ['closed', 'retired'],
    transitionPermissions: {
      'draft->submitted': 'risk.record.submit',
      'submitted->under_review': 'risk.record.review',
      'under_review->returned': 'risk.record.review',
      'under_review->assessed': 'risk.record.review',
      'assessed->treatment_planned': 'risk.treatment.assign',
      'treatment_planned->approved': 'risk.record.approve',
      'approved->active': 'risk.record.update',
      'active->monitoring': 'risk.record.update',
      'monitoring->closed': 'risk.record.close',
      'closed->active': 'risk.record.update',
      'returned->submitted': 'risk.record.submit',
    },
  },
);

type RiskState = typeof RISK_STATES[number];

export const RISK_STATE_MACHINE = new EntityStateMachine<RiskState>({
  entityType: 'risk',
  transitions: RISK_TRANSITIONS as Record<RiskState, RiskState[]>,
});
