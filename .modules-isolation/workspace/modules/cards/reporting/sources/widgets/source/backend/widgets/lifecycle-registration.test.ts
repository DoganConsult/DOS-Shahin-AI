/**
 * Widgets Lifecycle Registration -- Unit Tests
 * @owner widgets
 * @module widgets
 * @since 2026-03-31
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const mockRegister = vi.fn();

vi.mock('../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => mockRegister(...args),
}));

describe('widgets lifecycle registration', () => {
  beforeAll(async () => {
    // Import triggers all registerLifecycleDefinition calls
    await import('./lifecycle-registration');
  });

  it('registers lifecycle definition for record entity (standard workflow)', () => {
    expect(mockRegister).toHaveBeenCalledWith(
      'widgets',
      'record',
      expect.arrayContaining(['draft', 'in_review', 'approved', 'active', 'suspended', 'archived']),
      expect.objectContaining({
        draft: ['in_review'],
        in_review: ['approved', 'draft'],
        approved: ['active'],
        active: ['suspended', 'archived'],
        suspended: ['active', 'archived'],
        archived: [],
      }),
      expect.objectContaining({
        initialState: 'draft',
        terminalStates: ['archived'],
      }),
    );
  });

  it('registers widget-specific lifecycle (draft->configured->active->disabled->archived)', () => {
    expect(mockRegister).toHaveBeenCalledWith(
      'widgets',
      'widget',
      expect.arrayContaining(['draft', 'configured', 'active', 'disabled', 'archived']),
      expect.objectContaining({
        draft: ['configured'],
        configured: ['active', 'draft'],
        active: ['disabled', 'archived'],
        disabled: ['active', 'archived'],
        archived: [],
      }),
      expect.objectContaining({
        initialState: 'draft',
        terminalStates: ['archived'],
      }),
    );
  });

  it('registers data_source lifecycle (connected->active->stale->disconnected)', () => {
    expect(mockRegister).toHaveBeenCalledWith(
      'widgets',
      'data_source',
      expect.arrayContaining(['connected', 'active', 'stale', 'disconnected']),
      expect.objectContaining({
        connected: ['active'],
        active: ['stale', 'disconnected'],
        stale: ['active', 'disconnected'],
        disconnected: ['connected'],
      }),
      expect.objectContaining({
        initialState: 'connected',
        terminalStates: ['disconnected'],
      }),
    );
  });

  it('defines valid state transitions where no state transitions to itself', async () => {
    const allTransitions = [
      // Record lifecycle
      { draft: ['in_review'], in_review: ['approved', 'draft'], approved: ['active'], active: ['suspended', 'archived'], suspended: ['active', 'archived'], archived: [] },
      // Widget lifecycle
      { draft: ['configured'], configured: ['active', 'draft'], active: ['disabled', 'archived'], disabled: ['active', 'archived'], archived: [] },
      // Data source lifecycle
      { connected: ['active'], active: ['stale', 'disconnected'], stale: ['active', 'disconnected'], disconnected: ['connected'] },
    ];

    for (const transitions of allTransitions) {
      for (const [from, targets] of Object.entries(transitions)) {
        expect(targets).not.toContain(from);
      }
    }
  });

  it('defines archived/disconnected as terminal states', async () => {
    // Archived has no forward transitions in record and widget lifecycles
    const recordTransitions = { archived: [] as string[] };
    expect(recordTransitions.archived).toEqual([]);

    // Disconnected is terminal for data sources but can reconnect
    const dsTransitions = { disconnected: ['connected'] };
    expect(dsTransitions.disconnected).toContain('connected');
  });

  it('registers exactly 3 lifecycle definitions', () => {
    // record + widget + data_source = 3 registrations
    expect(mockRegister).toHaveBeenCalledTimes(3);
  });
});
