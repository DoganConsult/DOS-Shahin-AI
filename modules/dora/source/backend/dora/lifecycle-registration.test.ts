/**
 * DORA Lifecycle — Registration Tests
 *
 * MP-25 §12: DAuth authority / lifecycle authorization tests.
 * Verifies lifecycle states and transitions are correctly registered.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const registrations: unknown[] = [];
vi.mock('../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => registrations.push(args),
}));

describe('DORA Lifecycle Registration', () => {
  beforeAll(async () => {
    await import('./lifecycle-registration');
  });

  it('registers all four entity lifecycles', () => {
    expect(registrations.length).toBe(4);
  });

  it('registers dora_ict_assets lifecycle with domain-specific states', () => {
    const assetReg = registrations.find(r => r[1] === 'dora_ict_assets');
    expect(assetReg).toBeDefined();

    const [moduleCode, entityType, states, transitions, options] = assetReg;
    expect(moduleCode).toBe('dora');
    expect(entityType).toBe('dora_ict_assets');

    // Domain-specific states per MP-25: draft -> classified -> active -> decommissioning -> decommissioned
    expect(states).toContain('draft');
    expect(states).toContain('classified');
    expect(states).toContain('active');
    expect(states).toContain('decommissioning');
    expect(states).toContain('decommissioned');

    // Initial state
    expect(options.initialState).toBe('draft');

    // Terminal states
    expect(options.terminalStates).toContain('decommissioned');
    expect(options.terminalStates).toContain('archived');

    // draft -> classified transition must be valid
    expect(transitions.draft).toContain('classified');

    // active -> decommissioning must be valid
    expect(transitions.active).toContain('decommissioning');

    // decommissioned is terminal
    expect(transitions.decommissioned).toEqual([]);
  });

  it('registers dora_resilience_tests lifecycle with domain-specific states', () => {
    const testReg = registrations.find(r => r[1] === 'dora_resilience_tests');
    expect(testReg).toBeDefined();

    const [, , states, transitions, options] = testReg;

    // Domain-specific states: planned -> in_progress -> completed -> failed -> archived
    expect(states).toContain('planned');
    expect(states).toContain('in_progress');
    expect(states).toContain('completed');
    expect(states).toContain('failed');
    expect(states).toContain('archived');

    expect(options.initialState).toBe('planned');
    expect(options.terminalStates).toContain('archived');

    // planned -> in_progress must be valid
    expect(transitions.planned).toContain('in_progress');

    // in_progress -> completed must be valid
    expect(transitions.in_progress).toContain('completed');

    // in_progress -> failed must be valid
    expect(transitions.in_progress).toContain('failed');
  });

  it('registers dora_obligations lifecycle with domain-specific states', () => {
    const oblReg = registrations.find(r => r[1] === 'dora_obligations');
    expect(oblReg).toBeDefined();

    const [, , states, transitions, options] = oblReg;

    // Domain-specific states: draft -> under_review -> approved -> active -> expired -> archived
    expect(states).toContain('draft');
    expect(states).toContain('under_review');
    expect(states).toContain('approved');
    expect(states).toContain('active');
    expect(states).toContain('expired');
    expect(states).toContain('archived');

    expect(options.initialState).toBe('draft');
    expect(options.terminalStates).toContain('archived');

    // draft -> under_review
    expect(transitions.draft).toContain('under_review');

    // under_review -> approved
    expect(transitions.under_review).toContain('approved');

    // active -> expired
    expect(transitions.active).toContain('expired');
  });

  it('declares transition permissions for protected operations', () => {
    // Check ICT assets transition permissions
    const assetReg = registrations.find(r => r[1] === 'dora_ict_assets');
    const assetOptions = assetReg[4];
    expect(assetOptions.transitionPermissions).toBeDefined();
    expect(assetOptions.transitionPermissions?.['active->decommissioning']).toBe('dora.record.approve');

    // Check obligations transition permissions
    const oblReg = registrations.find(r => r[1] === 'dora_obligations');
    const oblOptions = oblReg[4];
    expect(oblOptions.transitionPermissions).toBeDefined();
    expect(oblOptions.transitionPermissions?.['under_review->approved']).toBe('dora.record.approve');
  });
});
