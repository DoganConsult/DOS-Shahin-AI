/**
 * Vendor Lifecycle -- Registration Tests
 *
 * MP-10 SS12: DAuth authority / lifecycle authorization tests.
 * Verifies lifecycle states and transitions are correctly registered
 * with the central LifecycleRegistry (DOS-owned).
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const registrations: unknown[] = [];
vi.mock('../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => registrations.push(args),
}));

// Import once -- vi.mock caches the module, so re-importing does not re-execute
beforeAll(async () => {
  registrations.length = 0;
  await import('./lifecycle-registration');
});

describe('Vendor Lifecycle Registration', () => {
  it('registers module-level + four sub-entity lifecycles', () => {
    expect(registrations.length).toBe(5);
  });

  it('registers vendor_engagements lifecycle with correct states', () => {
    const reg = registrations.find(r => r[1] === 'vendor_engagements');
    expect(reg).toBeDefined();

    const [moduleCode, entityType, states, transitions, options] = reg;
    expect(moduleCode).toBe('vendor');
    expect(entityType).toBe('vendor_engagements');

    // Must include all required states
    expect(states).toContain('draft');
    expect(states).toContain('in_review');
    expect(states).toContain('approved');
    expect(states).toContain('active');
    expect(states).toContain('suspended');
    expect(states).toContain('archived');

    // Initial state must be draft
    expect(options.initialState).toBe('draft');

    // Terminal states
    expect(options.terminalStates).toContain('archived');

    // draft -> in_review must be valid
    expect(transitions.draft).toContain('in_review');

    // in_review can go back to draft (return for rework)
    expect(transitions.in_review).toContain('draft');
    expect(transitions.in_review).toContain('approved');

    // archived is terminal -- no outgoing transitions
    expect(transitions.archived).toEqual([]);
  });

  it('registers vendor_risk_assessments lifecycle with correct states', () => {
    const reg = registrations.find(r => r[1] === 'vendor_risk_assessments');
    expect(reg).toBeDefined();

    const [moduleCode, , states, transitions, options] = reg;
    expect(moduleCode).toBe('vendor');

    expect(states).toContain('draft');
    expect(states).toContain('in_review');
    expect(states).toContain('approved');
    expect(states).toContain('active');

    expect(options.initialState).toBe('draft');
    expect(options.terminalStates).toContain('archived');

    // Active can transition to suspended or archived
    expect(transitions.active).toContain('suspended');
    expect(transitions.active).toContain('archived');
  });

  it('registers vendor_due_diligence lifecycle', () => {
    const reg = registrations.find(r => r[1] === 'vendor_due_diligence');
    expect(reg).toBeDefined();

    const [moduleCode, , states, , options] = reg;
    expect(moduleCode).toBe('vendor');
    expect(states).toContain('draft');
    expect(states).toContain('archived');
    expect(options.initialState).toBe('draft');
    expect(options.terminalStates).toContain('archived');
  });

  it('registers vendor_sla_definitions lifecycle', () => {
    const reg = registrations.find(r => r[1] === 'vendor_sla_definitions');
    expect(reg).toBeDefined();

    const [moduleCode, , states, transitions, options] = reg;
    expect(moduleCode).toBe('vendor');
    expect(states).toContain('draft');
    expect(states).toContain('active');
    expect(options.initialState).toBe('draft');

    // Suspended can be reactivated
    expect(transitions.suspended).toContain('active');
    expect(transitions.suspended).toContain('archived');
  });

  it('all lifecycles use the vendor module code', () => {
    for (const reg of registrations) {
      expect(reg[0]).toBe('vendor');
    }
  });

  it('all entity types start with vendor prefix', () => {
    for (const reg of registrations) {
      expect(reg[1]).toMatch(/^vendor/);
    }
  });

  it('no lifecycle has outgoing transitions from terminal state', () => {
    for (const reg of registrations) {
      const [, , , transitions, options] = reg;
      for (const terminal of options.terminalStates) {
        expect(transitions[terminal]).toEqual([]);
      }
    }
  });
});
