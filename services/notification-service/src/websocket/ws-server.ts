import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import { verifyToken } from '@dos/dauth-shared';
import { logger, initWsMetrics, recordWsConnect, setWsActiveConnections, recordWsDisconnect, recordWsSendFailure, recordWsInbound, recordWsRateLimited } from '@dos/platform-core/observability';
import { corsAllowedOrigins } from '@dos/platform-core/auth-host-policy';
import { ConnectionRegistry } from './connection-registry';
import { LocalFanoutAdapter, RedisFanoutAdapter } from './fanout';
import type { FanoutAdapter } from './fanout';
import { createEventEnvelope, WS_EVENT_TYPES, isValidInboundMessage } from './types';
import type { WsEventEnvelope, WsAuthContext } from './types';
import { wsMetrics, getWsMetricsSnapshot } from './ws-metrics';

const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_TIMEOUT_MS = 90_000;
const TOKEN_REVALIDATION_INTERVAL_MS = 60_000;
const TOKEN_EXPIRY_WARNING_MS = 5 * 60_000;
const GRACEFUL_DRAIN_MS = 10_000;
const MAX_PAYLOAD_BYTES = 4 * 1024;
const MAX_INBOUND_PER_MINUTE = 30;

const ALLOWED_ORIGINS = new Set<string>([
  ...corsAllowedOrigins(),
  'http://localhost:4200',
  'http://localhost:3000',
]);

let _checkBlacklist: ((jti: string) => Promise<boolean>) | null = null;

async function isTokenBlacklisted(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  if (!_checkBlacklist) {
    try {
      const { safeQuery } = require('@dos/db');
      _checkBlacklist = async (j: string) => {
        try {
          const result = await safeQuery(
            'SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW() AND COALESCE(is_active, FALSE) = FALSE LIMIT 1',
            [j],
          );
          return result.rows.length > 0;
        } catch {
          return false;
        }
      };
    } catch {
      _checkBlacklist = async () => false;
    }
  }
  return _checkBlacklist(jti);
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface WsServerOptions {
  redisUrl?: string;
  allowedOrigins?: string[];
}

export class NotificationWsServer {
  private wss: WebSocketServer | null = null;
  private registry = new ConnectionRegistry();
  private fanout: FanoutAdapter;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private tokenRevalidationTimer: ReturnType<typeof setInterval> | null = null;
  private rateBuckets = new Map<string, RateBucket>();
  private draining = false;
  private allowedOrigins: Set<string>;

  constructor(opts?: WsServerOptions) {
    initWsMetrics();
    this.allowedOrigins = opts?.allowedOrigins
      ? new Set(opts.allowedOrigins)
      : ALLOWED_ORIGINS;

    if (opts?.redisUrl) {
      const adapter = new RedisFanoutAdapter(this.registry);
      adapter.init(opts.redisUrl).catch((err: Error) => {
        logger.warn('[ws] Redis fanout init failed, falling back to local', { error: err.message });
      });
      this.fanout = adapter;
    } else {
      this.fanout = new LocalFanoutAdapter(this.registry);
    }
  }

  attach(server: HttpServer): void {
    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: MAX_PAYLOAD_BYTES,
    });

    server.on('upgrade', (req: IncomingMessage, socket, head) => {
      const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
      if (pathname !== '/ws') {
        socket.destroy();
        return;
      }

      if (!this.validateOrigin(req)) {
        logger.warn('[ws] Origin rejected', { origin: req.headers.origin, ip: req.socket.remoteAddress });
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      if (this.draining) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss!.handleUpgrade(req, socket as any, head, (ws) => {
        this.wss!.emit('connection', ws, req);
      });
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.startHeartbeat();
    this.startMetricsLog();
    this.startTokenRevalidation();
    logger.info('[ws] WebSocket server attached');
  }

  private validateOrigin(req: IncomingMessage): boolean {
    const origin = req.headers.origin;
    if (!origin) return true;
    if (this.allowedOrigins.size === 0) return true;
    return this.allowedOrigins.has(origin);
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const connectionId = randomUUID();

    let auth: WsAuthContext;
    try {
      auth = await this.authenticateRequest(req);
    } catch (err: any) {
      wsMetrics.connectFailure++;
      recordWsConnect(false);
      logger.warn('[ws] Auth failed', { error: err?.message, ip: req.socket.remoteAddress });
      ws.close(4001, 'Authentication failed');
      return;
    }

    if (this.registry.isTenantAtLimit(auth.tenantId)) {
      wsMetrics.connectFailure++;
      recordWsConnect(false);
      logger.warn('[ws] Tenant connection limit reached', { tenantId: auth.tenantId, userId: auth.userId });
      ws.close(4003, 'Tenant connection limit reached');
      return;
    }

    if (this.registry.isUserAtLimit(auth.userId)) {
      wsMetrics.connectFailure++;
      recordWsConnect(false);
      logger.warn('[ws] User connection limit reached', { tenantId: auth.tenantId, userId: auth.userId, current: this.registry.userConnectionCount(auth.userId) });
      ws.close(4004, 'User connection limit reached');
      return;
    }

    this.registry.add(connectionId, ws, auth);
    wsMetrics.connectSuccess++;
    recordWsConnect(true);
    wsMetrics.activeConnections = this.registry.totalConnections();
    setWsActiveConnections(wsMetrics.activeConnections);

    logger.info('[ws] Client connected', {
      connectionId,
      tenantId: auth.tenantId,
      userId: auth.userId,
      ip: req.socket.remoteAddress,
      origin: req.headers.origin || 'none',
    });

    const connectedEvent = createEventEnvelope(WS_EVENT_TYPES.SYSTEM_CONNECTED, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      connectionId,
      serverTime: new Date().toISOString(),
    });
    this.safeSend(ws, connectedEvent);

    ws.on('pong', () => {
      this.registry.updatePong(connectionId);
    });

    ws.on('message', (raw: Buffer | string) => {
      this.handleInboundMessage(connectionId, raw);
    });

    ws.on('close', (code: number) => {
      this.registry.remove(connectionId);
      this.rateBuckets.delete(connectionId);
      wsMetrics.activeConnections = this.registry.totalConnections();
      setWsActiveConnections(wsMetrics.activeConnections);

      const reason = code === 4001 ? 'auth_failure'
        : code === 4004 ? 'user_limit'
        : code === 4005 ? 'token_expired'
        : code === 4008 ? 'slow_consumer'
        : code >= 4000 ? 'server_close'
        : 'normal';

      recordWsDisconnect(reason);
      if (reason === 'auth_failure') wsMetrics.disconnectAuthFailure++;
      else if (reason === 'normal' || reason === 'server_close') wsMetrics.disconnectNormal++;
      else wsMetrics.disconnectError++;

      logger.info('[ws] Client disconnected', { connectionId, code, reason, tenantId: auth.tenantId, userId: auth.userId });
    });

    ws.on('error', (err: Error) => {
      wsMetrics.disconnectError++;
      logger.debug('[ws] Socket error', { connectionId, error: err.message });
    });
  }

  private async authenticateRequest(req: IncomingMessage): Promise<WsAuthContext> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    // Auth precedence: explicit query/Bearer token (e.g. short-lived
    // ticket for cross-origin) → httpOnly `dos_access_token` cookie set
    // by the auth-service (canonical first-party path).
    const token =
      url.searchParams.get('token') ||
      this.extractBearerToken(req) ||
      this.extractCookieToken(req, 'dos_access_token');

    if (!token) {
      throw new Error('No token provided');
    }

    const payload = await verifyToken(token);

    if (await isTokenBlacklisted((payload as any).jti)) {
      throw new Error('Token revoked');
    }

    const tenantId = (payload as any).tenantId;
    const userId = (payload as any).userId || (payload as any).sub;

    if (!tenantId || !userId) {
      throw new Error('Token missing tenantId or userId');
    }

    const exp = (payload as any).exp;
    const tokenExpiresAt = typeof exp === 'number' ? exp * 1000 : undefined;

    return {
      tenantId,
      userId,
      sessionId: (payload as any).sessionId,
      email: (payload as any).email,
      role: (payload as any).role,
      tokenExpiresAt,
    };
  }

  private extractBearerToken(req: IncomingMessage): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1];
    return null;
  }

  /**
   * Extract a cookie value from the WebSocket upgrade request.
   *
   * Same-origin browser WS handshakes carry the auth-service's
   * httpOnly `dos_access_token` cookie automatically. Cookie parsing
   * is intentionally minimal (no `cookie` package dep) — splits on
   * `;` and trims, matching the simple `name=value` shape set by
   * setAccessTokenCookie. Values are NOT URL-decoded because the JWT
   * is already URL-safe base64.
   */
  private extractCookieToken(req: IncomingMessage, name: string): string | null {
    const header = req.headers.cookie;
    if (!header || typeof header !== 'string') return null;
    const parts = header.split(';');
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const k = part.slice(0, eq).trim();
      if (k === name) {
        const v = part.slice(eq + 1).trim();
        return v.length > 0 ? v : null;
      }
    }
    return null;
  }

  private handleInboundMessage(connectionId: string, raw: Buffer | string): void {
    wsMetrics.inboundMessages++;
    recordWsInbound();

    if (!this.checkRate(connectionId)) {
      wsMetrics.inboundRateLimited++;
      recordWsRateLimited();
      return;
    }

    const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
    if (str.length > MAX_PAYLOAD_BYTES) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(str);
    } catch {
      return;
    }

    if (!isValidInboundMessage(parsed)) return;

    if (parsed.type === 'pong' || parsed.type === 'ping') {
      this.registry.updatePong(connectionId);
    }
  }

  private checkRate(connectionId: string): boolean {
    const now = Date.now();
    let bucket = this.rateBuckets.get(connectionId);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 60_000 };
      this.rateBuckets.set(connectionId, bucket);
    }
    bucket.count++;
    return bucket.count <= MAX_INBOUND_PER_MINUTE;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const pingEvent = createEventEnvelope(WS_EVENT_TYPES.SYSTEM_PING, { serverTime: new Date().toISOString() });
      const pingPayload = JSON.stringify(pingEvent);

      for (const conn of this.registry.allConnections()) {
        if (now - conn.info.lastPongAt > STALE_TIMEOUT_MS) {
          wsMetrics.disconnectStale++;
          recordWsDisconnect('stale');
          logger.info('[ws] Closing stale connection', { connectionId: conn.info.connectionId, staleSec: Math.round((now - conn.info.lastPongAt) / 1000) });
          try { conn.ws.close(4002, 'Stale connection'); } catch {}
          this.registry.remove(conn.info.connectionId);
          continue;
        }

        try {
          conn.ws.ping();
          conn.ws.send(pingPayload);
        } catch {}
      }

      wsMetrics.activeConnections = this.registry.totalConnections();
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref();
  }

  private startTokenRevalidation(): void {
    this.tokenRevalidationTimer = setInterval(() => {
      const now = Date.now();
      const expired = this.registry.getExpiredTokenConnections(now);
      for (const conn of expired) {
        logger.info('[ws] Closing connection with expired token', {
          connectionId: conn.info.connectionId,
          userId: conn.info.auth.userId,
          tenantId: conn.info.auth.tenantId,
        });
        try { conn.ws.close(4005, 'Token expired'); } catch {}
        this.registry.remove(conn.info.connectionId);
      }

      const soonExpiring = this.registry.getExpiredTokenConnections(now + TOKEN_EXPIRY_WARNING_MS);
      for (const conn of soonExpiring) {
        if (conn.info.tokenExpiresAt && conn.info.tokenExpiresAt > now) {
          const warning = createEventEnvelope(WS_EVENT_TYPES.SYSTEM_TOKEN_EXPIRING, {
            expiresIn: conn.info.tokenExpiresAt - now,
            message: 'Token expiring soon. Refresh your authentication.',
          });
          this.safeSend(conn.ws, warning);
        }
      }

      if (expired.length > 0) {
        wsMetrics.activeConnections = this.registry.totalConnections();
        setWsActiveConnections(wsMetrics.activeConnections);
      }
    }, TOKEN_REVALIDATION_INTERVAL_MS);
    this.tokenRevalidationTimer.unref();
  }

  private startMetricsLog(): void {
    this.metricsTimer = setInterval(() => {
      const m = getWsMetricsSnapshot();
      if (m.activeConnections > 0 || m.connectSuccess > 0 || m.connectFailure > 0) {
        logger.info('[ws] Metrics', {
          connections: m.activeConnections,
          users: this.registry.totalUsers(),
          tenants: this.registry.totalTenants(),
          connectOk: m.connectSuccess,
          connectFail: m.connectFailure,
          sendFail: m.messageSendFailures,
          stale: m.disconnectStale,
          slowClosed: m.slowConsumersClosed,
          inbound: m.inboundMessages,
          rateLimited: m.inboundRateLimited,
          fanoutHealthy: this.fanout.healthy(),
        });
      }
    }, 60_000);
    this.metricsTimer.unref();
  }

  private safeSend(ws: WebSocket, envelope: WsEventEnvelope): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(envelope));
      }
    } catch {
      wsMetrics.messageSendFailures++;
      recordWsSendFailure();
    }
  }

  async sendToUser(userId: string, tenantId: string, envelope: WsEventEnvelope): Promise<void> {
    await this.fanout.publish({ userId, tenantId }, envelope);
  }

  async sendToTenant(tenantId: string, envelope: WsEventEnvelope): Promise<void> {
    await this.fanout.publish({ tenantId }, envelope);
  }

  fanoutHealthy(): boolean {
    return this.fanout.healthy();
  }

  getMetrics(): ReturnType<typeof getWsMetricsSnapshot> & {
    users: number;
    tenants: number;
    draining: boolean;
    fanoutHealthy: boolean;
    staleConnections: number;
  } {
    return {
      ...getWsMetricsSnapshot(),
      users: this.registry.totalUsers(),
      tenants: this.registry.totalTenants(),
      draining: this.draining,
      fanoutHealthy: this.fanout.healthy(),
      staleConnections: this.registry.staleConnectionCount(STALE_TIMEOUT_MS),
    };
  }

  isDraining(): boolean {
    return this.draining;
  }

  async shutdown(): Promise<void> {
    this.draining = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.tokenRevalidationTimer) clearInterval(this.tokenRevalidationTimer);

    const drainingEvent = createEventEnvelope(WS_EVENT_TYPES.SYSTEM_DRAINING, {
      message: 'Server shutting down. Please reconnect.',
      drainMs: GRACEFUL_DRAIN_MS,
    });
    for (const conn of this.registry.allConnections()) {
      this.safeSend(conn.ws, drainingEvent);
    }

    logger.info('[ws] Draining connections', { active: this.registry.totalConnections(), drainMs: GRACEFUL_DRAIN_MS });

    await new Promise<void>((resolve) => setTimeout(resolve, GRACEFUL_DRAIN_MS));

    for (const conn of this.registry.allConnections()) {
      try { conn.ws.close(1001, 'Server shutting down'); } catch {}
    }

    await this.fanout.shutdown();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('[ws] WebSocket server shut down');
  }
}
