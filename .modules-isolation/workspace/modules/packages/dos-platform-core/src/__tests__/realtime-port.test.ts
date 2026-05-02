/**
 * Contract tests for the PlatformRealtime port.
 *
 * Verifies:
 *   - buildWSEvent always produces a well-formed envelope
 *   - pushToUser delegates to a registered provider when one exists
 *   - pushToUser drops silently when no provider AND no event-bus is wired
 *   - broadcastToTenant routes to the optional broadcast method
 *   - clearRealtimeProvider isolates state across tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setRealtimeProvider,
  clearRealtimeProvider,
  pushToUser,
  broadcastToTenant,
  buildWSEvent,
  getActiveSessionCount,
  REALTIME_BUS_EVENT,
  REALTIME_BROADCAST_BUS_EVENT,
  type PlatformRealtime,
  type RealtimeEvent,
} from '../events/realtime';

describe('PlatformRealtime port — contract', () => {
  beforeEach(() => {
    clearRealtimeProvider();
  });

  it('buildWSEvent returns canonical envelope with ISO timestamp', () => {
    const env = buildWSEvent('test_event', { foo: 'bar' });
    expect(env.type).toBe('test_event');
    expect(env.payload).toEqual({ foo: 'bar' });
    expect(env.emittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(env.correlationId).toBeUndefined();
  });

  it('buildWSEvent preserves provided correlationId', () => {
    const env = buildWSEvent('x', null, { correlationId: 'corr-123' });
    expect(env.correlationId).toBe('corr-123');
  });

  it('pushToUser delegates to registered provider', () => {
    const calls: Array<[string, string, RealtimeEvent]> = [];
    const provider: PlatformRealtime = {
      pushToUser: (t, u, e) => calls.push([t, u, e]),
    };
    setRealtimeProvider(provider);

    const event = buildWSEvent('alpha', { n: 1 });
    pushToUser('tenant-1', 'user-1', event);

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('tenant-1');
    expect(calls[0][1]).toBe('user-1');
    expect(calls[0][2]).toBe(event);
  });

  it('pushToUser normalizes a raw object into a RealtimeEvent envelope', () => {
    const calls: Array<RealtimeEvent> = [];
    setRealtimeProvider({ pushToUser: (_t, _u, e) => calls.push(e) });

    pushToUser('t', 'u', { something: 'raw' });

    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe('unknown');
    expect(calls[0].payload).toEqual({ something: 'raw' });
    expect(typeof calls[0].emittedAt).toBe('string');
  });

  it('pushToUser swallows provider errors (best-effort contract)', () => {
    setRealtimeProvider({
      pushToUser: () => { throw new Error('boom'); },
    });
    expect(() => pushToUser('t', 'u', buildWSEvent('x', {}))).not.toThrow();
  });

  it('pushToUser without provider falls back without throwing', async () => {
    // No provider registered. With no event bus wired in tests,
    // the fanback publish() rejects internally and is caught.
    expect(() => pushToUser('t', 'u', buildWSEvent('y', {}))).not.toThrow();
    // Allow the swallowed promise rejection to settle.
    await Promise.resolve();
  });

  it('broadcastToTenant uses provider.broadcastToTenant when available', () => {
    const broadcasts: Array<[string, RealtimeEvent]> = [];
    setRealtimeProvider({
      pushToUser: vi.fn(),
      broadcastToTenant: (t, e) => broadcasts.push([t, e]),
    });

    broadcastToTenant('tenant-x', buildWSEvent('beta', { i: 9 }));

    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0][0]).toBe('tenant-x');
    expect(broadcasts[0][1].type).toBe('beta');
  });

  it('broadcastToTenant is a no-op when provider lacks broadcast support', () => {
    // Provider only implements pushToUser
    setRealtimeProvider({ pushToUser: vi.fn() });
    expect(() => broadcastToTenant('t', buildWSEvent('z', {}))).not.toThrow();
  });

  it('getActiveSessionCount returns 0 when no provider exposes the metric', () => {
    expect(getActiveSessionCount()).toBe(0);
    setRealtimeProvider({
      pushToUser: vi.fn(),
      getActiveSessionCount: () => 42,
    });
    expect(getActiveSessionCount()).toBe(42);
  });

  it('exports stable bus event channel constants', () => {
    expect(REALTIME_BUS_EVENT).toBe('realtime.push.user');
    expect(REALTIME_BROADCAST_BUS_EVENT).toBe('realtime.broadcast.tenant');
  });
});
