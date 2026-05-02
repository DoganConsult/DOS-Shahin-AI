import { describe, it, expect } from 'vitest';
import {
  RISK_STATES,
  RISK_TRANSITIONS,
  IllegalRiskTransitionError,
} from '../domain/risk-treatment.service';

describe('risk treatment — transition graph', () => {
  it('every state appears as a key in the transition map', () => {
    for (const s of RISK_STATES) {
      expect(RISK_TRANSITIONS[s]).toBeDefined();
    }
  });

  it('every transition target is a known state', () => {
    const known = new Set<string>(RISK_STATES);
    for (const [from, targets] of Object.entries(RISK_TRANSITIONS)) {
      for (const t of targets) {
        expect(known.has(t), `${from} -> ${t} (unknown target)`).toBe(true);
      }
    }
  });

  it('full assess→treat→accept→close flow is reachable', () => {
    expect(RISK_TRANSITIONS.assessed).toContain('treatment_planned');
    expect(RISK_TRANSITIONS.treatment_planned).toContain('approved');
    expect(RISK_TRANSITIONS.approved).toContain('active');
    expect(RISK_TRANSITIONS.active).toContain('mitigating');
    expect(RISK_TRANSITIONS.mitigating).toContain('accepted');
    expect(RISK_TRANSITIONS.accepted).toContain('closed');
  });

  it('terminal states have no outgoing transitions', () => {
    expect(RISK_TRANSITIONS.retired).toEqual([]);
    expect(RISK_TRANSITIONS.archived).toEqual([]);
  });

  it('IllegalRiskTransitionError carries from/to context', () => {
    const e = new IllegalRiskTransitionError('archived', 'active');
    expect(e.fromState).toBe('archived');
    expect(e.toState).toBe('active');
  });
});
