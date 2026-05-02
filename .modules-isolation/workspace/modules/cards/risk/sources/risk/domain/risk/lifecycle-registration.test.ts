import { describe, it, expect, vi, beforeAll } from 'vitest';

// lifecycle-registration.ts imports registerLifecycleDefinition and
// EntityStateMachine from './ports/lifecycle.port' (canonical post-
// refactor path); the earlier mock targeted the pre-refactor location
// at ../../platform/dos/lifecycle/lifecycle-registry which no longer
// exists. Mock the current path so the capture array is populated.
const registrations: unknown[][] = [];
vi.mock('./ports/lifecycle.port', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => { registrations.push(args); },
  EntityStateMachine: class { constructor(_opts: unknown) { /* no-op */ } },
}));

describe('Risk Lifecycle Registration', () => {
  beforeAll(async () => {
    await import('./lifecycle-registration');
  });

  it('registers at least one lifecycle entity', () => {
    expect(registrations.length).toBeGreaterThan(0);
  });

  it('uses correct module code', () => {
    expect(registrations[0][0]).toBe('risk');
  });

  it('defines states and transitions', () => {
    const [, , states, transitions, options] = registrations[0];
    expect(states.length).toBeGreaterThan(2);
    expect(Object.keys(transitions).length).toBeGreaterThan(0);
    expect(options.initialState).toBeTruthy();
    expect(options.terminalStates.length).toBeGreaterThan(0);
  });
});
