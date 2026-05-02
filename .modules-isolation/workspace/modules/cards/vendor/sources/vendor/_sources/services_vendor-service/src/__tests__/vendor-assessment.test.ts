import { describe, it, expect } from 'vitest';
import {
  VENDOR_STATES,
  VENDOR_TRANSITIONS,
  IllegalVendorTransitionError,
} from '../domain/vendor-assessment.service';

describe('vendor assessment — transition graph', () => {
  it('every state appears as a key in the transition map', () => {
    for (const s of VENDOR_STATES) {
      expect(VENDOR_TRANSITIONS[s]).toBeDefined();
    }
  });

  it('every transition target is a known state', () => {
    const known = new Set<string>(VENDOR_STATES);
    for (const [from, targets] of Object.entries(VENDOR_TRANSITIONS)) {
      for (const t of targets) {
        expect(known.has(t), `${from} -> ${t} (unknown target)`).toBe(true);
      }
    }
  });

  it('happy-path: identified → ... → active', () => {
    expect(VENDOR_TRANSITIONS.identified).toContain('questionnaire_sent');
    expect(VENDOR_TRANSITIONS.questionnaire_sent).toContain('questionnaire_received');
    expect(VENDOR_TRANSITIONS.questionnaire_received).toContain('assessing');
    expect(VENDOR_TRANSITIONS.assessing).toContain('assessed');
    expect(VENDOR_TRANSITIONS.assessed).toContain('approved');
    expect(VENDOR_TRANSITIONS.approved).toContain('onboarded');
    expect(VENDOR_TRANSITIONS.onboarded).toContain('active');
  });

  it('terminal states have no outgoing transitions', () => {
    expect(VENDOR_TRANSITIONS.rejected).toEqual([]);
    expect(VENDOR_TRANSITIONS.offboarded).toEqual([]);
  });

  it('IllegalVendorTransitionError carries from/to context', () => {
    const e = new IllegalVendorTransitionError('rejected', 'active');
    expect(e.fromState).toBe('rejected');
    expect(e.toState).toBe('active');
  });
});
