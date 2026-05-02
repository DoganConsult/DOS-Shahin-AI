import { describe, it, expect } from 'vitest';
import {
  POLICY_STATES,
  POLICY_TRANSITIONS,
  IllegalStateTransitionError,
} from '../domain/policy-state-machine.service';

describe('policy state machine — transition graph', () => {
  it('every state appears as a key in the transition map', () => {
    for (const s of POLICY_STATES) {
      expect(POLICY_TRANSITIONS[s]).toBeDefined();
    }
  });

  it('every transition target is a known state', () => {
    const known = new Set<string>(POLICY_STATES);
    for (const [from, targets] of Object.entries(POLICY_TRANSITIONS)) {
      for (const t of targets) {
        expect(known.has(t), `${from} -> ${t} (unknown target)`).toBe(true);
      }
    }
  });

  it('terminal state archived has no outgoing transitions', () => {
    expect(POLICY_TRANSITIONS.archived).toEqual([]);
  });

  it('happy-path: draft → submitted → under_review → approved → published → active', () => {
    expect(POLICY_TRANSITIONS.draft).toContain('submitted');
    expect(POLICY_TRANSITIONS.submitted).toContain('under_review');
    expect(POLICY_TRANSITIONS.under_review).toContain('approved');
    expect(POLICY_TRANSITIONS.approved).toContain('published');
    expect(POLICY_TRANSITIONS.published).toContain('active');
  });

  it('IllegalStateTransitionError carries from/to context', () => {
    const e = new IllegalStateTransitionError('archived', 'active');
    expect(e.fromState).toBe('archived');
    expect(e.toState).toBe('active');
    expect(e.message).toMatch(/archived -> active/);
  });
});
