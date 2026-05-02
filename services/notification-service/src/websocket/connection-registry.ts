import type WebSocket from 'ws';
import type { WsConnectionInfo, WsAuthContext } from './types';

export interface TrackedConnection {
  ws: WebSocket;
  info: WsConnectionInfo;
}

const DEFAULT_MAX_CONNECTIONS_PER_TENANT = 200;
const DEFAULT_MAX_CONNECTIONS_PER_USER = 10;

export class ConnectionRegistry {
  private byConnectionId = new Map<string, TrackedConnection>();
  private byUserId = new Map<string, Set<string>>();
  private byTenantId = new Map<string, Set<string>>();
  private maxPerTenant: number;
  private maxPerUser: number;

  constructor(maxPerTenant?: number, maxPerUser?: number) {
    this.maxPerTenant = maxPerTenant ?? DEFAULT_MAX_CONNECTIONS_PER_TENANT;
    this.maxPerUser = maxPerUser ?? DEFAULT_MAX_CONNECTIONS_PER_USER;
  }

  tenantConnectionCount(tenantId: string): number {
    return this.byTenantId.get(tenantId)?.size ?? 0;
  }

  userConnectionCount(userId: string): number {
    return this.byUserId.get(userId)?.size ?? 0;
  }

  isTenantAtLimit(tenantId: string): boolean {
    return this.tenantConnectionCount(tenantId) >= this.maxPerTenant;
  }

  isUserAtLimit(userId: string): boolean {
    return this.userConnectionCount(userId) >= this.maxPerUser;
  }

  add(connectionId: string, ws: WebSocket, auth: WsAuthContext): void {
    const info: WsConnectionInfo = {
      connectionId,
      auth,
      connectedAt: new Date().toISOString(),
      lastPongAt: Date.now(),
      messagesSent: 0,
      queuedBytes: 0,
      tokenExpiresAt: auth.tokenExpiresAt,
    };
    this.byConnectionId.set(connectionId, { ws, info });

    if (!this.byUserId.has(auth.userId)) this.byUserId.set(auth.userId, new Set());
    this.byUserId.get(auth.userId)!.add(connectionId);

    if (!this.byTenantId.has(auth.tenantId)) this.byTenantId.set(auth.tenantId, new Set());
    this.byTenantId.get(auth.tenantId)!.add(connectionId);
  }

  remove(connectionId: string): void {
    const tracked = this.byConnectionId.get(connectionId);
    if (!tracked) return;
    const { auth } = tracked.info;

    this.byConnectionId.delete(connectionId);

    const userSet = this.byUserId.get(auth.userId);
    if (userSet) {
      userSet.delete(connectionId);
      if (userSet.size === 0) this.byUserId.delete(auth.userId);
    }

    const tenantSet = this.byTenantId.get(auth.tenantId);
    if (tenantSet) {
      tenantSet.delete(connectionId);
      if (tenantSet.size === 0) this.byTenantId.delete(auth.tenantId);
    }
  }

  get(connectionId: string): TrackedConnection | undefined {
    return this.byConnectionId.get(connectionId);
  }

  getByUserId(userId: string): TrackedConnection[] {
    const ids = this.byUserId.get(userId);
    if (!ids) return [];
    const result: TrackedConnection[] = [];
    for (const id of ids) {
      const conn = this.byConnectionId.get(id);
      if (conn) result.push(conn);
    }
    return result;
  }

  getByTenantId(tenantId: string): TrackedConnection[] {
    const ids = this.byTenantId.get(tenantId);
    if (!ids) return [];
    const result: TrackedConnection[] = [];
    for (const id of ids) {
      const conn = this.byConnectionId.get(id);
      if (conn) result.push(conn);
    }
    return result;
  }

  getExpiredTokenConnections(now: number): TrackedConnection[] {
    const expired: TrackedConnection[] = [];
    for (const conn of this.byConnectionId.values()) {
      if (conn.info.tokenExpiresAt && conn.info.tokenExpiresAt <= now) {
        expired.push(conn);
      }
    }
    return expired;
  }

  updatePong(connectionId: string): void {
    const tracked = this.byConnectionId.get(connectionId);
    if (tracked) tracked.info.lastPongAt = Date.now();
  }

  totalConnections(): number {
    return this.byConnectionId.size;
  }

  totalUsers(): number {
    return this.byUserId.size;
  }

  totalTenants(): number {
    return this.byTenantId.size;
  }

  staleConnectionCount(staleThresholdMs: number): number {
    const now = Date.now();
    let count = 0;
    for (const conn of this.byConnectionId.values()) {
      if (now - conn.info.lastPongAt > staleThresholdMs) count++;
    }
    return count;
  }

  allConnections(): TrackedConnection[] {
    return [...this.byConnectionId.values()];
  }
}
