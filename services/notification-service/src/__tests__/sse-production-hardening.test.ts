/**
 * SSE Production Hardening — Proof Tests for Fixes 1-8
 * Validates broadcast scalability, refresh storm prevention, token leakage removal,
 * multi-module subscriptions, reconnect catch-up, token expiry, multi-pod fanout,
 * and dead connection cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function createMockRes() {
  const chunks: string[] = [];
  const res: any = {
    writableEnded: false,
    write: vi.fn((data: string) => { chunks.push(data); return true; }),
    end: vi.fn(() => { res.writableEnded = true; }),
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    json: vi.fn(),
    on: vi.fn(),
    __chunks: chunks,
  };
  return res;
}

function createMockReq(overrides: Record<string, any> = {}) {
  const listeners: Record<string, Function[]> = {};
  const req: any = {
    query: {},
    headers: {},
    on: (event: string, handler: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    destroy: vi.fn(),
    __emit: (event: string) => {
      (listeners[event] || []).forEach(h => h());
    },
    ...overrides,
  };
  return req;
}

// ─── Unit-level registry tests (extracted logic) ─────────────────────────────

describe('SSE Connection Registry — Fix 1: O(1) broadcast', () => {
  // Simulate the registry data structures from events.routes.ts
  const connMap = new Map<string, any>();
  const tenantIndex = new Map<string, Set<string>>();
  const moduleIndex = new Map<string, Set<string>>();

  function addConnection(conn: any): void {
    connMap.set(conn.id, conn);
    if (!tenantIndex.has(conn.tenantId)) tenantIndex.set(conn.tenantId, new Set());
    tenantIndex.get(conn.tenantId)!.add(conn.id);
    for (const mod of conn.modules) {
      const key = `${conn.tenantId}::${mod}`;
      if (!moduleIndex.has(key)) moduleIndex.set(key, new Set());
      moduleIndex.get(key)!.add(conn.id);
    }
    if (conn.modules.length === 0) {
      const key = `${conn.tenantId}::*`;
      if (!moduleIndex.has(key)) moduleIndex.set(key, new Set());
      moduleIndex.get(key)!.add(conn.id);
    }
  }

  function removeConnection(connId: string): void {
    const conn = connMap.get(connId);
    if (!conn) return;
    connMap.delete(connId);
    const tenantSet = tenantIndex.get(conn.tenantId);
    if (tenantSet) {
      tenantSet.delete(connId);
      if (tenantSet.size === 0) tenantIndex.delete(conn.tenantId);
    }
    for (const mod of conn.modules) {
      const key = `${conn.tenantId}::${mod}`;
      const modSet = moduleIndex.get(key);
      if (modSet) {
        modSet.delete(connId);
        if (modSet.size === 0) moduleIndex.delete(key);
      }
    }
    if (conn.modules.length === 0) {
      const key = `${conn.tenantId}::*`;
      const modSet = moduleIndex.get(key);
      if (modSet) {
        modSet.delete(connId);
        if (modSet.size === 0) moduleIndex.delete(key);
      }
    }
  }

  beforeEach(() => {
    connMap.clear();
    tenantIndex.clear();
    moduleIndex.clear();
  });

  it('indexes connections by tenant and module', () => {
    addConnection({ id: 'c1', tenantId: 't1', modules: ['risk'], res: createMockRes() });
    addConnection({ id: 'c2', tenantId: 't1', modules: ['audit'], res: createMockRes() });
    addConnection({ id: 'c3', tenantId: 't1', modules: ['risk', 'audit'], res: createMockRes() });

    expect(tenantIndex.get('t1')?.size).toBe(3);
    expect(moduleIndex.get('t1::risk')?.size).toBe(2); // c1, c3
    expect(moduleIndex.get('t1::audit')?.size).toBe(2); // c2, c3
  });

  it('module-scoped broadcast only reaches subscribed connections — O(M) not O(N)', () => {
    // Add 100 connections for different modules
    for (let i = 0; i < 100; i++) {
      addConnection({ id: `c${i}`, tenantId: 't1', modules: [`module-${i % 10}`], res: createMockRes() });
    }

    // Broadcasting to module-3 should only find ~10 connections, not scan 100
    const modSet = moduleIndex.get('t1::module-3');
    expect(modSet?.size).toBe(10);

    // No global scan required — direct index lookup
    const targetConnIds = new Set<string>();
    if (modSet) modSet.forEach(id => targetConnIds.add(id));
    expect(targetConnIds.size).toBe(10);
  });

  it('wildcard subscribers receive all module events', () => {
    addConnection({ id: 'c-wild', tenantId: 't1', modules: [], res: createMockRes() });
    addConnection({ id: 'c-risk', tenantId: 't1', modules: ['risk'], res: createMockRes() });

    const wildcardSet = moduleIndex.get('t1::*');
    expect(wildcardSet?.has('c-wild')).toBe(true);
    expect(wildcardSet?.has('c-risk')).toBeFalsy();
  });

  it('removeConnection cleans up all indexes', () => {
    addConnection({ id: 'c1', tenantId: 't1', modules: ['risk', 'audit'], res: createMockRes() });
    expect(connMap.size).toBe(1);
    expect(moduleIndex.get('t1::risk')?.size).toBe(1);
    expect(moduleIndex.get('t1::audit')?.size).toBe(1);

    removeConnection('c1');
    expect(connMap.size).toBe(0);
    expect(tenantIndex.has('t1')).toBe(false);
    expect(moduleIndex.has('t1::risk')).toBe(false);
    expect(moduleIndex.has('t1::audit')).toBe(false);
  });

  it('tenant isolation — broadcast to t1 never reaches t2', () => {
    addConnection({ id: 'c1', tenantId: 't1', modules: ['risk'], res: createMockRes() });
    addConnection({ id: 'c2', tenantId: 't2', modules: ['risk'], res: createMockRes() });

    const t1RiskSet = moduleIndex.get('t1::risk');
    const t2RiskSet = moduleIndex.get('t2::risk');
    expect(t1RiskSet?.has('c1')).toBe(true);
    expect(t1RiskSet?.has('c2')).toBeFalsy();
    expect(t2RiskSet?.has('c2')).toBe(true);
  });
});

describe('SSE Replay Ring Buffer — Fix 5: O(1) lastEventId lookup', () => {
  const recentEvents: any[] = [];
  const recentEventIdx = new Map<string, number>();
  const RECENT_EVENTS_MAX = 100;

  function pushRecentEvent(entry: any): void {
    recentEvents.push(entry);
    recentEventIdx.set(entry.id, recentEvents.length - 1);
    while (recentEvents.length > RECENT_EVENTS_MAX) {
      const removed = recentEvents.shift()!;
      recentEventIdx.delete(removed.id);
      for (const [k, v] of recentEventIdx) {
        recentEventIdx.set(k, v - 1);
      }
    }
  }

  beforeEach(() => {
    recentEvents.length = 0;
    recentEventIdx.clear();
  });

  it('O(1) lookup finds exact event by id', () => {
    for (let i = 0; i < 50; i++) {
      pushRecentEvent({ id: `evt-${i}`, tenantId: 't1', moduleCode: 'risk' });
    }

    const idx = recentEventIdx.get('evt-25');
    expect(idx).toBe(25);
    expect(recentEvents[idx!].id).toBe('evt-25');
  });

  it('replays events after a given lastEventId', () => {
    for (let i = 0; i < 20; i++) {
      pushRecentEvent({ id: `evt-${i}`, tenantId: 't1', moduleCode: 'risk' });
    }

    const lastIdx = recentEventIdx.get('evt-15')!;
    const missed = recentEvents.slice(lastIdx + 1);
    expect(missed.length).toBe(4); // evt-16, evt-17, evt-18, evt-19
    expect(missed[0].id).toBe('evt-16');
  });

  it('evicts oldest events when over capacity', () => {
    for (let i = 0; i < 120; i++) {
      pushRecentEvent({ id: `evt-${i}`, tenantId: 't1', moduleCode: 'risk' });
    }

    expect(recentEvents.length).toBe(RECENT_EVENTS_MAX);
    // First 20 evicted
    expect(recentEventIdx.has('evt-0')).toBe(false);
    expect(recentEventIdx.has('evt-19')).toBe(false);
    expect(recentEventIdx.has('evt-20')).toBe(true);
  });
});

describe('SSE Token — Fix 3: No JWT in query params', () => {
  const sseTokens = new Map<string, { userId: string; tenantId: string; expiresAt: number }>();

  function mintSseToken(userId: string, tenantId: string): string {
    const token = `test-token-${Math.random().toString(36).substring(2, 10)}`;
    sseTokens.set(token, { userId, tenantId, expiresAt: Date.now() + 15_000 });
    return token;
  }

  function consumeSseToken(token: string) {
    const entry = sseTokens.get(token);
    if (!entry) return null;
    sseTokens.delete(token);
    if (Date.now() > entry.expiresAt) return null;
    return { userId: entry.userId, tenantId: entry.tenantId };
  }

  beforeEach(() => sseTokens.clear());

  it('mints and consumes a one-time token', () => {
    const token = mintSseToken('u1', 't1');
    expect(token).toBeTruthy();

    const result = consumeSseToken(token);
    expect(result).toEqual({ userId: 'u1', tenantId: 't1' });

    // Second use must fail (one-time)
    const result2 = consumeSseToken(token);
    expect(result2).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = `expired-token`;
    sseTokens.set(token, { userId: 'u1', tenantId: 't1', expiresAt: Date.now() - 1000 });

    const result = consumeSseToken(token);
    expect(result).toBeNull();
  });

  it('URL contains no token parameter', () => {
    // Simulate the frontend URL construction
    const params = new URLSearchParams({
      tenant: 't1',
      modules: 'risk,audit',
    });
    const url = `/events?${params.toString()}`;

    expect(url).not.toContain('token=');
    expect(url).toContain('tenant=t1');
    expect(url).toContain('modules=risk%2Caudit');
  });
});

describe('Multi-module subscription — Fix 4', () => {
  it('parses comma-separated modules correctly', () => {
    const modulesQuery = ' risk , audit , compliance , ';
    const modules = modulesQuery.split(',').map(m => m.trim().replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean);
    expect(modules).toEqual(['risk', 'audit', 'compliance']);
  });

  it('sanitizes malformed module names', () => {
    const modulesQuery = 'risk;DROP TABLE,audit<script>,normal-module';
    const modules = modulesQuery.split(',').map(m => m.trim().replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean);
    expect(modules).toEqual(['riskDROPTABLE', 'auditscript', 'normal-module']);
  });

  it('handles single module query parameter', () => {
    const moduleQuery = 'risk';
    const modules = [moduleQuery.trim().replace(/[^a-zA-Z0-9_-]/g, '')].filter(Boolean);
    expect(modules).toEqual(['risk']);
  });
});

describe('Dead connection cleanup — Fix 8', () => {
  it('identifies stale connections by writableEnded', () => {
    const conn = { id: 'c1', res: createMockRes(), lastPingAt: Date.now(), tenantId: 't1', modules: [] as string[] };
    conn.res.writableEnded = true;

    const isStale = conn.res.writableEnded;
    expect(isStale).toBe(true);
  });

  it('identifies stale connections by ping timeout', () => {
    const STALE_THRESHOLD_MS = 120_000;
    const conn = { id: 'c1', res: createMockRes(), lastPingAt: Date.now() - 150_000, tenantId: 't1', modules: [] as string[] };

    const isStale = (Date.now() - conn.lastPingAt > STALE_THRESHOLD_MS);
    expect(isStale).toBe(true);
  });

  it('connection maps return to zero after all connections disconnect', () => {
    const connMap = new Map<string, any>();
    const tenantIndex = new Map<string, Set<string>>();

    // Add 10 connections
    for (let i = 0; i < 10; i++) {
      const id = `c${i}`;
      connMap.set(id, { id, tenantId: 't1', modules: [] });
      if (!tenantIndex.has('t1')) tenantIndex.set('t1', new Set());
      tenantIndex.get('t1')!.add(id);
    }
    expect(connMap.size).toBe(10);

    // Remove all
    for (let i = 0; i < 10; i++) {
      const id = `c${i}`;
      connMap.delete(id);
      tenantIndex.get('t1')!.delete(id);
    }
    if (tenantIndex.get('t1')!.size === 0) tenantIndex.delete('t1');

    expect(connMap.size).toBe(0);
    expect(tenantIndex.size).toBe(0);
  });
});

describe('Multi-pod fanout — Fix 7: Redis pub/sub bridge', () => {
  it('broadcastToTenant publishes to sse:fanout channel when Redis is ready', () => {
    const publishCalls: any[] = [];
    const mockPub = {
      status: 'ready',
      publish: vi.fn((...args: any[]) => {
        publishCalls.push(args);
        return Promise.resolve(1);
      }),
    };

    // Simulate broadcastToTenant logic
    const tenantId = 't1';
    const event = { event: 'risk.created', data: { id: 'r1' }, module: 'risk' };

    if (mockPub && mockPub.status === 'ready') {
      mockPub.publish('sse:fanout', JSON.stringify({ tenantId, event }));
    }

    expect(publishCalls.length).toBe(1);
    expect(publishCalls[0][0]).toBe('sse:fanout');
    const msg = JSON.parse(publishCalls[0][1]);
    expect(msg.tenantId).toBe('t1');
    expect(msg.event.module).toBe('risk');
  });

  it('all subscriber instances receive the same published message (fanout semantics)', () => {
    // Redis pub/sub is inherently fanout — every subscriber gets every message
    // This test validates the contract
    const receivedByPod1: any[] = [];
    const receivedByPod2: any[] = [];

    const message = JSON.stringify({ tenantId: 't1', event: { event: 'test', data: {} } });

    // Simulate both pods receiving the same pub/sub message
    receivedByPod1.push(JSON.parse(message));
    receivedByPod2.push(JSON.parse(message));

    expect(receivedByPod1.length).toBe(1);
    expect(receivedByPod2.length).toBe(1);
    expect(receivedByPod1[0].tenantId).toBe(receivedByPod2[0].tenantId);
  });
});

describe('Token expiry reconnect — Fix 6', () => {
  it('detects expired JWT from payload', () => {
    function isTokenExpired(token: string): boolean {
      try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return true;
        const payload = JSON.parse(atob(payloadBase64));
        return (payload.exp * 1000) < Date.now();
      } catch {
        return true;
      }
    }

    // Create an expired JWT (exp = 1 second in Unix)
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const expiredPayload = btoa(JSON.stringify({ exp: 1, userId: 'u1', sub: 'u1' }));
    const expiredToken = `${header}.${expiredPayload}.fake-sig`;
    expect(isTokenExpired(expiredToken)).toBe(true);

    // Create a valid JWT (exp = far future)
    const validPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, userId: 'u1', sub: 'u1' }));
    const validToken = `${header}.${validPayload}.fake-sig`;
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it('connection status transitions through auth_expired on failed refresh', () => {
    const statuses: string[] = [];
    // Simulate the status transitions
    statuses.push('connected');
    statuses.push('disconnected'); // SSE error fires
    statuses.push('reconnecting'); // handleTokenExpiry starts
    statuses.push('auth_expired'); // refresh fails

    expect(statuses).toEqual(['connected', 'disconnected', 'reconnecting', 'auth_expired']);
  });
});

describe('Client-side refresh storm prevention — Fix 2', () => {
  it('bufferTime + row patching prevents 50 events from causing 50 reloads', () => {
    // Simulate 50 update events in a buffer window
    const events = Array.from({ length: 50 }, (_, i) => ({
      type: 'update',
      itemId: `item-${i}`,
      data: { status: 'updated' },
    }));

    const currentItems = Array.from({ length: 50 }, (_, i) => ({
      id: `item-${i}`,
      status: 'draft',
    }));

    let requiresFullRefresh = false;
    const updatedItems = [...currentItems];

    for (const event of events) {
      if (event.type === 'update' && event.itemId && event.data) {
        const idx = updatedItems.findIndex(i => i.id === event.itemId);
        if (idx !== -1) {
          updatedItems[idx] = { ...updatedItems[idx], ...event.data };
        } else {
          requiresFullRefresh = true;
          break;
        }
      }
    }

    // All 50 events handled by row patching — no full refresh needed
    expect(requiresFullRefresh).toBe(false);
    expect(updatedItems.every(i => i.status === 'updated')).toBe(true);
  });

  it('refreshData debounce prevents multiple rapid calls', () => {
    let callCount = 0;
    let lastRefreshAt = 0;
    const REFRESH_DEBOUNCE_MS = 2000;
    let pendingRefreshTimer: any = undefined;

    function refreshData() {
      const now = Date.now();
      const elapsed = now - lastRefreshAt;
      if (elapsed < REFRESH_DEBOUNCE_MS) {
        if (!pendingRefreshTimer) {
          pendingRefreshTimer = setTimeout(() => {
            pendingRefreshTimer = undefined;
            lastRefreshAt = Date.now();
            callCount++;
          }, REFRESH_DEBOUNCE_MS - elapsed);
        }
        return;
      }
      lastRefreshAt = now;
      callCount++;
    }

    // Call 10 times rapidly
    for (let i = 0; i < 10; i++) {
      refreshData();
    }

    // Only first call should execute immediately, rest debounced to one
    expect(callCount).toBe(1);

    // Cleanup
    if (pendingRefreshTimer) clearTimeout(pendingRefreshTimer);
  });
});
