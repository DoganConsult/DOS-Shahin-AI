import { describe, it, expect, vi, beforeAll } from 'vitest';

const registrations: unknown[] = [];
vi.mock('./ports/lifecycle.port', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => registrations.push(args),
}));

describe('AiGovernance Lifecycle Registration', () => {
  beforeAll(async () => {
    await import('./lifecycle-registration');
  });

  it('registers at least one lifecycle entity', () => {
    expect(registrations.length).toBeGreaterThan(0);
  });

  it('uses correct module code', () => {
    expect(registrations[0][0]).toBe('ai-governance');
  });

  it('defines states and transitions', () => {
    const [, , states, transitions, options] = registrations[0];
    expect(states.length).toBeGreaterThan(2);
    expect(Object.keys(transitions).length).toBeGreaterThan(0);
    expect(options.initialState).toBeTruthy();
    expect(options.terminalStates.length).toBeGreaterThan(0);
  });
});
