import { describe, it, expect, vi, beforeAll } from 'vitest';

const registrations: unknown[] = [];
vi.mock('@dos/module-sdk', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@dos/module-sdk')>();
  return { ...orig, registerLifecycleDefinition: (...args: unknown[]) => registrations.push(args) };
});

describe('config-center lifecycle registration', () => {
  beforeAll(async () => { await import('./lifecycle-registration'); });

  it('registers at least one lifecycle entity', () => {
    expect(registrations.length).toBeGreaterThan(0);
  });

  it('uses correct module code', () => {
    expect(registrations[0]![0]).toBe('config-center');
  });

  it('defines states with initial and terminal', () => {
    const [, , states, transitions, options] = registrations[0]! as any[];
    expect(states.length).toBeGreaterThan(1);
    expect(Object.keys(transitions).length).toBeGreaterThan(0);
    expect(options.initialState).toBeTruthy();
    expect(options.terminalStates.length).toBeGreaterThan(0);
  });
});
