/**
 * Analytics Lifecycle -- Registration Tests
 *
 * MP-12 SS12: DAuth authority / lifecycle authorization tests.
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

describe('Analytics Lifecycle Registration', () => {
  it('registers all three aggregate root lifecycles', () => {
    expect(registrations.length).toBe(3);
  });

  it('registers analytics_dashboards lifecycle with correct states', () => {
    const reg = registrations.find(r => r[1] === 'analytics_dashboards');
    expect(reg).toBeDefined();

    const [moduleCode, entityType, states, transitions, options] = reg;
    expect(moduleCode).toBe('analytics');
    expect(entityType).toBe('analytics_dashboards');

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

    // in_review -> approved and in_review -> draft must be valid
    expect(transitions.in_review).toContain('approved');
    expect(transitions.in_review).toContain('draft');

    // archived is terminal -- no outgoing transitions
    expect(transitions.archived).toEqual([]);
  });

  it('registers analytics_datasets lifecycle with correct states', () => {
    const reg = registrations.find(r => r[1] === 'analytics_datasets');
    expect(reg).toBeDefined();

    const [moduleCode, , states, transitions, options] = reg;
    expect(moduleCode).toBe('analytics');

    expect(states).toContain('draft');
    expect(states).toContain('active');
    expect(states).toContain('archived');

    expect(options.initialState).toBe('draft');
    expect(options.terminalStates).toContain('archived');

    // Draft can transition to in_review
    expect(transitions.draft).toContain('in_review');

    // Active can transition to suspended or archived
    expect(transitions.active).toContain('suspended');
    expect(transitions.active).toContain('archived');
  });

  it('registers analytics_metrics lifecycle with correct states', () => {
    const reg = registrations.find(r => r[1] === 'analytics_metrics');
    expect(reg).toBeDefined();

    const [moduleCode, , states, transitions, options] = reg;
    expect(moduleCode).toBe('analytics');

    expect(states).toContain('draft');
    expect(states).toContain('in_review');
    expect(states).toContain('approved');
    expect(states).toContain('active');
    expect(states).toContain('suspended');
    expect(states).toContain('archived');

    expect(options.initialState).toBe('draft');
    expect(options.terminalStates).toContain('archived');

    // Suspended can be reactivated
    expect(transitions.suspended).toContain('active');
    expect(transitions.suspended).toContain('archived');
  });

  it('all lifecycles use the analytics module code', () => {
    for (const reg of registrations) {
      expect(reg[0]).toBe('analytics');
    }
  });

  it('all entity types start with analytics_ prefix', () => {
    for (const reg of registrations) {
      expect(reg[1]).toMatch(/^analytics_/);
    }
  });

  it('no lifecycle has more outgoing transitions from terminal state', () => {
    for (const reg of registrations) {
      const [, , , transitions, options] = reg;
      for (const terminal of options.terminalStates) {
        expect(transitions[terminal]).toEqual([]);
      }
    }
  });
});
