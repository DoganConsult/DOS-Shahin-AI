/**
 * Governance AI Lifecycle Registration — Validation Tests
 *
 * MP-26 §12: unit tests for lifecycle state machine definitions.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const registeredDefinitions: Array<{
  moduleCode: string;
  entityType: string;
  states: readonly string[];
  transitions: Record<string, string[]>;
  opts: Record<string, unknown>;
}> = [];

vi.mock('../../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: (moduleCode: string, entityType: string, states: readonly string[], transitions: Record<string, string[]>, opts: Record<string, unknown>) => {
    registeredDefinitions.push({ moduleCode, entityType, states, transitions, opts });
  },
}));

describe('Governance AI Lifecycle Registration', () => {
  beforeAll(async () => {
    await import('./lifecycle-registration');
  });

  it('registers signal lifecycle with correct module code', () => {
    const signalDef = registeredDefinitions.find(d => d.entityType === 'governance_signal');
    expect(signalDef).toBeDefined();
    expect(signalDef!.moduleCode).toBe('governance-ai');
  });

  it('signal lifecycle has correct states', () => {
    const signalDef = registeredDefinitions.find(d => d.entityType === 'governance_signal')!;
    expect(signalDef.states).toContain('detected');
    expect(signalDef.states).toContain('interpreting');
    expect(signalDef.states).toContain('interpreted');
    expect(signalDef.states).toContain('escalated');
    expect(signalDef.states).toContain('resolved');
    expect(signalDef.states).toContain('dismissed');
    expect(signalDef.states).toContain('archived');
  });

  it('signal lifecycle has valid initial and terminal states', () => {
    const signalDef = registeredDefinitions.find(d => d.entityType === 'governance_signal')!;
    expect(signalDef.opts.initialState).toBe('detected');
    expect(signalDef.opts.terminalStates).toContain('archived');
  });

  it('signal lifecycle transitions are valid (no self-loops, targets exist)', () => {
    const signalDef = registeredDefinitions.find(d => d.entityType === 'governance_signal')!;
    const stateSet = new Set(signalDef.states);
    for (const [from, targets] of Object.entries(signalDef.transitions)) {
      expect(stateSet.has(from)).toBe(true);
      for (const to of targets) {
        expect(stateSet.has(to)).toBe(true);
        expect(to).not.toBe(from);
      }
    }
  });

  it('terminal states have no outgoing transitions', () => {
    const signalDef = registeredDefinitions.find(d => d.entityType === 'governance_signal')!;
    const terminalStates = signalDef.opts.terminalStates as string[];
    for (const terminal of terminalStates) {
      const outgoing = signalDef.transitions[terminal] || [];
      expect(outgoing.length).toBe(0);
    }
  });

  it('registers model lifecycle', () => {
    const modelDef = registeredDefinitions.find(d => d.entityType === 'governance_model');
    expect(modelDef).toBeDefined();
    expect(modelDef!.moduleCode).toBe('governance-ai');
    expect(modelDef!.states).toContain('training');
    expect(modelDef!.states).toContain('testing');
    expect(modelDef!.states).toContain('active');
    expect(modelDef!.states).toContain('retired');
    expect(modelDef!.opts.initialState).toBe('training');
    expect(modelDef!.opts.terminalStates).toContain('retired');
  });
});
