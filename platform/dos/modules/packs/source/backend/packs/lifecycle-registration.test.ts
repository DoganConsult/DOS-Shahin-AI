/**
 * Packs Lifecycle -- Registration Tests
 *
 * MP-36 Section 12: DAuth authority / lifecycle authorization tests.
 * Verifies lifecycle states and transitions are correctly registered
 * for all packs entity types: pack_installations, pack_record.
 *
 * @owner DOS
 * @module packs
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const registrations: unknown[] = [];
vi.mock('../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => registrations.push(args),
}));

// Import once -- the module registers on load via side-effect
beforeAll(async () => {
  await import('./lifecycle-registration');
});

describe('Packs Lifecycle Registration', () => {
  it('registers 2 entity lifecycles', () => {
    expect(registrations.length).toBe(2);
  });

  // ── Pack Installation Lifecycle ───────────────────────────────────

  it('registers pack_installations lifecycle with pack-specific states', () => {
    const reg = registrations.find(r => r[1] === 'pack_installations');
    expect(reg).toBeDefined();

    const [moduleCode, entityType, states, transitions, options] = reg;
    expect(moduleCode).toBe('packs');
    expect(entityType).toBe('pack_installations');

    expect(states).toContain('available');
    expect(states).toContain('installing');
    expect(states).toContain('installed');
    expect(states).toContain('updating');
    expect(states).toContain('uninstalling');
    expect(states).toContain('uninstalled');
    expect(states).toContain('failed');
    expect(states).toContain('archived');

    expect(options.initialState).toBe('available');
    expect(options.terminalStates).toContain('archived');

    // Install flow
    expect(transitions.available).toContain('installing');
    expect(transitions.installing).toContain('installed');
    expect(transitions.installing).toContain('failed');

    // Update flow
    expect(transitions.installed).toContain('updating');
    expect(transitions.updating).toContain('installed');
    expect(transitions.updating).toContain('failed');

    // Uninstall flow
    expect(transitions.installed).toContain('uninstalling');
    expect(transitions.uninstalling).toContain('uninstalled');

    // Re-install after uninstall
    expect(transitions.uninstalled).toContain('installing');

    // Retry after failure
    expect(transitions.failed).toContain('installing');

    // Archived is terminal
    expect(transitions.archived).toEqual([]);
  });

  it('declares transition permissions for pack_installations lifecycle', () => {
    const reg = registrations.find(r => r[1] === 'pack_installations');
    const options = reg[4];

    expect(options.transitionPermissions).toBeDefined();
    expect(options.transitionPermissions['available->installing']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['installed->updating']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['installed->uninstalling']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['installed->archived']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['uninstalled->archived']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['failed->installing']).toBe('packs.pack.manage');
  });

  // ── Pack Record Lifecycle ─────────────────────────────────────────

  it('registers pack_record lifecycle with CRUD states', () => {
    const reg = registrations.find(r => r[1] === 'pack_record');
    expect(reg).toBeDefined();

    const [moduleCode, entityType, states, transitions, options] = reg;
    expect(moduleCode).toBe('packs');
    expect(entityType).toBe('pack_record');

    expect(states).toContain('draft');
    expect(states).toContain('in_review');
    expect(states).toContain('approved');
    expect(states).toContain('active');
    expect(states).toContain('suspended');
    expect(states).toContain('archived');

    expect(options.initialState).toBe('draft');
    expect(options.terminalStates).toContain('archived');
    expect(transitions.archived).toEqual([]);
    expect(transitions.draft).toContain('in_review');
    expect(transitions.in_review).toContain('approved');
    expect(transitions.in_review).toContain('draft');
  });

  it('declares transition permissions for pack_record lifecycle', () => {
    const reg = registrations.find(r => r[1] === 'pack_record');
    const options = reg[4];

    expect(options.transitionPermissions).toBeDefined();
    expect(options.transitionPermissions['in_review->approved']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['active->suspended']).toBe('packs.pack.manage');
    expect(options.transitionPermissions['active->archived']).toBe('packs.pack.manage');
  });
});
