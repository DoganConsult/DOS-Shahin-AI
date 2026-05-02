import { describe, it, expect, vi, beforeAll } from 'vitest';

const registrations: any[][] = [];
vi.mock('../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => registrations.push(args as any[]),
}));

describe('Action Lifecycle Registration', () => {
  beforeAll(async () => {
    await import('./lifecycle-registration.js');
  });

  it('registers at least one lifecycle entity', () => {
    expect(registrations.length).toBeGreaterThan(0);
  });

  it('uses correct module code', () => {
    expect(registrations[0][0]).toBe('action');
  });

  it('defines states and transitions', () => {
    const [, , states, transitions, options] = registrations[0] as [unknown, unknown, unknown[], Record<string, unknown>, { initialState: string; terminalStates: unknown[] }];
    expect(states.length).toBeGreaterThan(2);
    expect(Object.keys(transitions).length).toBeGreaterThan(0);
    expect(options.initialState).toBeTruthy();
    expect(options.terminalStates.length).toBeGreaterThan(0);
  });
});
