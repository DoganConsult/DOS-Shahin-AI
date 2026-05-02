import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionRegistry } from '../websocket/connection-registry';

function mockWs(readyState = 1): any {
  return { readyState, send: () => {}, close: () => {}, ping: () => {} };
}

function mockAuth(overrides: Record<string, unknown> = {}): any {
  return { tenantId: 't1', userId: 'u1', ...overrides };
}

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;

  beforeEach(() => {
    registry = new ConnectionRegistry(5, 3);
  });

  it('adds and retrieves connections', () => {
    registry.add('c1', mockWs(), mockAuth());
    expect(registry.totalConnections()).toBe(1);
    expect(registry.get('c1')).toBeDefined();
  });

  it('removes connections', () => {
    registry.add('c1', mockWs(), mockAuth());
    registry.remove('c1');
    expect(registry.totalConnections()).toBe(0);
    expect(registry.get('c1')).toBeUndefined();
  });

  it('tracks users and tenants', () => {
    registry.add('c1', mockWs(), mockAuth({ userId: 'u1', tenantId: 't1' }));
    registry.add('c2', mockWs(), mockAuth({ userId: 'u2', tenantId: 't1' }));
    registry.add('c3', mockWs(), mockAuth({ userId: 'u3', tenantId: 't2' }));
    expect(registry.totalUsers()).toBe(3);
    expect(registry.totalTenants()).toBe(2);
  });

  it('getByUserId returns correct connections', () => {
    registry.add('c1', mockWs(), mockAuth({ userId: 'u1' }));
    registry.add('c2', mockWs(), mockAuth({ userId: 'u1' }));
    registry.add('c3', mockWs(), mockAuth({ userId: 'u2' }));
    expect(registry.getByUserId('u1')).toHaveLength(2);
    expect(registry.getByUserId('u2')).toHaveLength(1);
    expect(registry.getByUserId('u999')).toHaveLength(0);
  });

  it('getByTenantId returns correct connections', () => {
    registry.add('c1', mockWs(), mockAuth({ tenantId: 't1' }));
    registry.add('c2', mockWs(), mockAuth({ tenantId: 't1' }));
    registry.add('c3', mockWs(), mockAuth({ tenantId: 't2' }));
    expect(registry.getByTenantId('t1')).toHaveLength(2);
    expect(registry.getByTenantId('t2')).toHaveLength(1);
  });

  it('enforces tenant connection limit', () => {
    for (let i = 0; i < 5; i++) {
      registry.add(`c${i}`, mockWs(), mockAuth({ userId: `u${i}`, tenantId: 't1' }));
    }
    expect(registry.isTenantAtLimit('t1')).toBe(true);
    expect(registry.isTenantAtLimit('t2')).toBe(false);
  });

  it('enforces per-user connection limit', () => {
    for (let i = 0; i < 3; i++) {
      registry.add(`c${i}`, mockWs(), mockAuth({ userId: 'u1' }));
    }
    expect(registry.isUserAtLimit('u1')).toBe(true);
    expect(registry.isUserAtLimit('u2')).toBe(false);
  });

  it('userConnectionCount returns correct count', () => {
    registry.add('c1', mockWs(), mockAuth({ userId: 'u1' }));
    registry.add('c2', mockWs(), mockAuth({ userId: 'u1' }));
    expect(registry.userConnectionCount('u1')).toBe(2);
    expect(registry.userConnectionCount('u999')).toBe(0);
  });

  it('updates pong timestamp', () => {
    registry.add('c1', mockWs(), mockAuth());
    const before = registry.get('c1')!.info.lastPongAt;
    registry.updatePong('c1');
    expect(registry.get('c1')!.info.lastPongAt).toBeGreaterThanOrEqual(before);
  });

  it('tracks token expiry', () => {
    const now = Date.now();
    registry.add('c1', mockWs(), mockAuth({ tokenExpiresAt: now - 1000 }));
    registry.add('c2', mockWs(), mockAuth({ tokenExpiresAt: now + 60_000 }));
    registry.add('c3', mockWs(), mockAuth());

    const expired = registry.getExpiredTokenConnections(now);
    expect(expired).toHaveLength(1);
    expect(expired[0].info.connectionId).toBe('c1');
  });

  it('staleConnectionCount identifies stale connections', () => {
    registry.add('c1', mockWs(), mockAuth());
    const conn = registry.get('c1')!;
    conn.info.lastPongAt = Date.now() - 100_000;
    expect(registry.staleConnectionCount(90_000)).toBe(1);
    expect(registry.staleConnectionCount(200_000)).toBe(0);
  });

  it('cleans up user/tenant indexes on remove', () => {
    registry.add('c1', mockWs(), mockAuth({ userId: 'u1', tenantId: 't1' }));
    registry.remove('c1');
    expect(registry.getByUserId('u1')).toHaveLength(0);
    expect(registry.getByTenantId('t1')).toHaveLength(0);
    expect(registry.totalUsers()).toBe(0);
    expect(registry.totalTenants()).toBe(0);
  });

  it('allConnections returns all tracked connections', () => {
    registry.add('c1', mockWs(), mockAuth({ userId: 'u1' }));
    registry.add('c2', mockWs(), mockAuth({ userId: 'u2' }));
    expect(registry.allConnections()).toHaveLength(2);
  });

  it('remove is idempotent', () => {
    registry.add('c1', mockWs(), mockAuth());
    registry.remove('c1');
    registry.remove('c1');
    expect(registry.totalConnections()).toBe(0);
  });
});
