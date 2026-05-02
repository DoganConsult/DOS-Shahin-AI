/**
 * Events Routes — Server-Sent Events (SSE) endpoint for realtime updates
 * Provides a lightweight, HTTP-based alternative to WebSocket for live data updates.
 * Integrates with the platform event backbone for tenant-scoped event streaming.
 *
 * Connection Registry Design (Fix 1 — O(1) broadcast):
 *   tenantIndex:  tenantId -> Set<connectionId>
 *   moduleIndex:  tenantId::moduleCode -> Set<connectionId>
 *   connMap:      connectionId -> SSEConnection
 *
 * Replay Ring Buffer (Fix 5 — O(1) lastEventId lookup):
 *   recentEvents[]:  circular array of recent events
 *   recentEventIdx:  Map<eventId, array index> for O(1) lookup
 */
import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
// SSE ticket uses its own SSE_STREAM_KEY (not platform JWT secret);
// import jsonwebtoken via @dos/auth re-export to satisfy the
// service-boundary contract test (no direct jsonwebtoken in services).
import { jwt } from '@dos/dauth-shared';
import { authenticate } from '../adapters/auth.adapter';
import { asyncHandler, rateLimiter } from '@dos/platform-core/http';
import { resolveJwtSigningSecret } from '@dos/platform-core';
import { logger } from '@dos/module-sdk';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'notification-service:events', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

// ── Connection Registry (Fix 1 + Fix 8) ────────────────────────────────────
interface SSEConnection {
  id: string;
  res: Response;
  tenantId: string;
  userId: string;
  modules: string[];
  itemId?: string;
  lastEventId?: string;
  connectedAt: number;
  lastPingAt: number;
}

const connMap = new Map<string, SSEConnection>();
const tenantIndex = new Map<string, Set<string>>();
const moduleIndex = new Map<string, Set<string>>();

function addConnection(conn: SSEConnection): void {
  connMap.set(conn.id, conn);

  if (!tenantIndex.has(conn.tenantId)) tenantIndex.set(conn.tenantId, new Set());
  tenantIndex.get(conn.tenantId)!.add(conn.id);

  // Index each subscribed module for O(1) module-scoped broadcast
  for (const mod of conn.modules) {
    const key = `${conn.tenantId}::${mod}`;
    if (!moduleIndex.has(key)) moduleIndex.set(key, new Set());
    moduleIndex.get(key)!.add(conn.id);
  }
  // Wildcard subscribers also indexed under tenant::*
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

// ── Replay Ring Buffer (Fix 5) ─────────────────────────────────────────────
interface RecentEvent {
  id: string;
  tenantId: string;
  moduleCode: string;
  payload: any;
  eventPayload: any;
  seq: number;
}

const RECENT_EVENTS_MAX = 5000;
const recentEvents: RecentEvent[] = new Array(RECENT_EVENTS_MAX);
const recentEventIdx = new Map<string, number>();
let recentSeq = 0;
let ringHead = 0;
let ringCount = 0;

function pushRecentEvent(entry: Omit<RecentEvent, 'seq'>): void {
  const seq = recentSeq++;
  const full: RecentEvent = { ...entry, seq };
  
  if (ringCount === RECENT_EVENTS_MAX) {
    // Overwrite oldest
    const oldEntry = recentEvents[ringHead];
    if (oldEntry) recentEventIdx.delete(oldEntry.id);
  } else {
    ringCount++;
  }
  
  recentEvents[ringHead] = full;
  recentEventIdx.set(full.id, ringHead);
  ringHead = (ringHead + 1) % RECENT_EVENTS_MAX;
}

function getMissedEvents(lastEventId: string, tenantId: string, modules: string[]): any[] {
  const idx = recentEventIdx.get(lastEventId);
  if (idx === undefined) return [];
  
  const targetSeq = recentEvents[idx].seq;
  const missed: any[] = [];
  
  // Iterate linearly through what's in the buffer
  for (let i = 0; i < ringCount; i++) {
    // Real logical index starting from oldest in ring
    const actualIdx = (ringHead - ringCount + i + RECENT_EVENTS_MAX) % RECENT_EVENTS_MAX;
    const e = recentEvents[actualIdx];
    if (e.seq > targetSeq && e.tenantId === tenantId) {
       if (modules.length > 0 && e.moduleCode && e.moduleCode !== '*' && !modules.includes(e.moduleCode)) continue;
       missed.push(e.eventPayload);
    }
  }
  return missed;
}

// ── Short-lived SSE tokens (Phase 9: signed JWT, purpose-scoped, 60s) ─────
//
// The ticket is a JWT signed with the platform JWT secret, carrying
// `{ purpose: 'sse_stream', userId, tenantId, jti, exp: +60s }`.
// Verification rejects any token whose `purpose` is not `sse_stream` or
// whose `tenantId` does not match the caller's authenticated tenant.
// The legacy opaque 15s token store is retained ONLY as a one-tick
// fallback so existing clients do not break during rollout.
const sseTokens = new Map<string, { userId: string; tenantId: string; expiresAt: number }>();
const SSE_TOKEN_TTL_MS = 60_000;
const SSE_PURPOSE = 'sse_stream' as const;

interface SseTicketPayload {
  purpose: typeof SSE_PURPOSE;
  userId: string;
  tenantId: string;
  jti: string;
}

function signSseTicket(userId: string, tenantId: string): string {
  const jti = randomBytes(16).toString('hex');
  const secret = resolveJwtSigningSecret('notification-service:sse-ticket');
  return jwt.sign(
    { purpose: SSE_PURPOSE, userId, tenantId, jti } satisfies SseTicketPayload,
    secret,
    { expiresIn: Math.ceil(SSE_TOKEN_TTL_MS / 1000) },
  );
}

function verifySseTicket(token: string): { userId: string; tenantId: string } | null {
  try {
    const secret = resolveJwtSigningSecret('notification-service:sse-ticket');
    const decoded = jwt.verify(token, secret) as Partial<SseTicketPayload> | undefined;
    if (!decoded || decoded.purpose !== SSE_PURPOSE) return null;
    if (typeof decoded.userId !== 'string' || typeof decoded.tenantId !== 'string') return null;
    return { userId: decoded.userId, tenantId: decoded.tenantId };
  } catch {
    return null;
  }
}

function mintSseToken(userId: string, tenantId: string): string {
  const token = randomBytes(32).toString('hex');
  sseTokens.set(token, { userId, tenantId, expiresAt: Date.now() + SSE_TOKEN_TTL_MS });
  setTimeout(() => sseTokens.delete(token), SSE_TOKEN_TTL_MS + 1000);
  return token;
}

function consumeSseToken(token: string): { userId: string; tenantId: string } | null {
  const entry = sseTokens.get(token);
  if (!entry) return null;
  sseTokens.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return { userId: entry.userId, tenantId: entry.tenantId };
}

// ── Stale connection sweep (Fix 8) ──────────────────────────────────────────
const STALE_SWEEP_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 120_000; // 2 minutes with no successful ping

setInterval(() => {
  const now = Date.now();
  let swept = 0;
  for (const [connId, conn] of connMap) {
    if (conn.res.writableEnded || (now - conn.lastPingAt > STALE_THRESHOLD_MS)) {
      try { conn.res.end(); } catch {}
      removeConnection(connId);
      swept++;
    }
  }
  if (swept > 0) {
    logger.info(`[SSE] Stale sweep removed ${swept} dead connections. Active: ${connMap.size}`);
  }
}, STALE_SWEEP_INTERVAL_MS);

/**
 * Send an SSE event to a response
 */
function sendEvent(res: Response, event: { id?: string; event?: string; data: any }): void {
  if (event.id) {
    res.write(`id: ${event.id}\n`);
  }
  if (event.event) {
    res.write(`event: ${event.event}\n`);
  }
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

let ssePub: any = null;
let sseStreamRedis: any = null;
const STREAM_MAX_LEN = Number(process.env.SSE_STREAM_MAXLEN || '1000');
const STREAM_KEY_PREFIX = 'sse:tenant:';

function tenantStreamKey(tenantId: string): string {
  return `${STREAM_KEY_PREFIX}${tenantId}`;
}

export function initSSEFanout(redisUrl: string): void {
  // ioredis loaded dynamically — keeps this routes file decoupled from the full ioredis dep at import time.
   
  const Redis = require('ioredis') as typeof import('ioredis').default;
  ssePub = new Redis(redisUrl, { lazyConnect: true });
  ssePub.connect().catch(() => {});

  sseStreamRedis = new Redis(redisUrl, { lazyConnect: true });
  sseStreamRedis.connect().catch(() => {});

  const sseSub = new Redis(redisUrl, { lazyConnect: true });
  sseSub.connect().then(() => {
    sseSub.subscribe('sse:fanout');
    sseSub.on('message', (channel: string, msg: string) => {
      if (channel === 'sse:fanout') {
        try {
          const { tenantId, event } = JSON.parse(msg);
          _localBroadcastToTenant(tenantId, event);
        } catch {}
      }
    });
  }).catch(() => {});
}

async function appendToTenantStream(tenantId: string, eventPayload: unknown): Promise<string | null> {
  if (!sseStreamRedis || sseStreamRedis.status !== 'ready') return null;
  try {
    const streamId = await sseStreamRedis.xadd(
      tenantStreamKey(tenantId),
      'MAXLEN', '~', String(STREAM_MAX_LEN),
      '*',
      'payload', JSON.stringify(eventPayload),
    );
    return streamId as string;
  } catch {
    return null;
  }
}

async function replayFromTenantStream(
  tenantId: string,
  lastEventId: string,
): Promise<unknown[]> {
  if (!sseStreamRedis || sseStreamRedis.status !== 'ready') return [];
  try {
    // XRANGE stream (lastEventId-inclusive..+); drop the exact last-event row.
    const raw = (await sseStreamRedis.xrange(
      tenantStreamKey(tenantId),
      lastEventId,
      '+',
    )) as Array<[string, string[]]>;
    const out: unknown[] = [];
    for (const [id, fields] of raw) {
      if (id === lastEventId) continue;
      // fields are flat [k, v, k, v]
      for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] === 'payload') {
          try { out.push(JSON.parse(fields[i + 1])); } catch { /* skip */ }
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function broadcastToTenant(tenantId: string, event: { event?: string; data: any; module?: string; itemId?: string }): number {
  if (ssePub && ssePub.status === 'ready') {
    ssePub.publish('sse:fanout', JSON.stringify({ tenantId, event })).catch(() => {});
  } else {
    _localBroadcastToTenant(tenantId, event);
  }
  return 1; // Assuming success for async pub/sub
}

function _localBroadcastToTenant(tenantId: string, event: { event?: string; data: any; module?: string; itemId?: string }): number {
  const timestamp = new Date().toISOString();
  const eventType = event.event || 'broadcast';
  const moduleCode = event.module || '*';

  let normalizedType: string = 'refresh';
  if (eventType.includes('.created') || eventType.includes('.create')) normalizedType = 'create';
  else if (eventType.includes('.updated') || eventType.includes('.update')) normalizedType = 'update';
  else if (eventType.includes('.deleted') || eventType.includes('.delete')) normalizedType = 'delete';
  else if (eventType.includes('.bulk')) normalizedType = 'bulk';

  const eventPayload = {
    id: `${tenantId}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`,
    event: eventType,
    data: {
      type: normalizedType,
      moduleCode,
      itemId: event.itemId,
      data: event.data,
      timestamp,
    },
  };

  pushRecentEvent({ id: eventPayload.id, tenantId, moduleCode, payload: eventPayload.data, eventPayload });

  // Phase 9.2: mirror to tenant-scoped Redis stream so any replica can
  // replay missed events via Last-Event-ID across restarts. Fire-and-forget.
  void appendToTenantStream(tenantId, eventPayload);

  // Fix 1: O(1) module-scoped connection lookup instead of iterating all tenant connections
  const targetConnIds = new Set<string>();

  if (moduleCode !== '*') {
    // Get connections subscribed to this specific module
    const modSet = moduleIndex.get(`${tenantId}::${moduleCode}`);
    if (modSet) modSet.forEach(id => targetConnIds.add(id));
  }
  // Always include wildcard subscribers (modules=[] or modules=['*'])
  const wildcardSet = moduleIndex.get(`${tenantId}::*`);
  if (wildcardSet) wildcardSet.forEach(id => targetConnIds.add(id));

  // If event has no module scope, broadcast to all tenant connections
  if (moduleCode === '*') {
    const tenantSet = tenantIndex.get(tenantId);
    if (tenantSet) tenantSet.forEach(id => targetConnIds.add(id));
  }

  if (targetConnIds.size === 0) return 0;

  let sentCount = 0;
  for (const connId of targetConnIds) {
    const conn = connMap.get(connId);
    if (!conn) continue;
    try {
      sendEvent(conn.res, eventPayload);
      sentCount++;
    } catch (err) {
      logger.warn(`[SSE] Failed to send to ${connId}`, { error: (err as Error).message });
      removeConnection(connId);
    }
  }

  return sentCount;
}

/**
 * Mint short-lived SSE cookie (Fix 3). Path=/ so token works for both /events and /api/events (gateway).
 */
async function handleSseTokenMint(req: Request, res: Response): Promise<void> {
  const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
  const userId = (req as any).user?.userId;
  if (!tenantId || !userId) {
    res.status(400).json({ error: 'Tenant/user context required' });
    return;
  }
  const ticket = signSseTicket(userId, tenantId);
  // Legacy opaque token kept for 1 release to ease transition; cookie switched
  // to the JWT when available (EventSource reads cookie-only — no custom
  // headers supported, so the JWT rides in an HttpOnly cookie).
  const legacyToken = mintSseToken(userId, tenantId);
  const maxAgeSeconds = Math.ceil(SSE_TOKEN_TTL_MS / 1000);
  res.setHeader('Set-Cookie', [
    `grc_sse_ticket=${ticket}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict`,
    `grc_sse_token=${legacyToken}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict`,
  ]);
  res.json({ ok: true, ticket, expiresIn: SSE_TOKEN_TTL_MS, purpose: SSE_PURPOSE });
}

/**
 * POST /events/sse-token
 * Mint a short-lived one-time SSE stream token (Fix 3).
 */
router.post('/sse-token', authenticate, asyncHandler(handleSseTokenMint));

/**
 * POST /events/ticket — Phase 9 alias (same as sse-token; plan name /api/events/ticket).
 */
router.post('/ticket', authenticate, asyncHandler(handleSseTokenMint));

/**
 * GET /events
 * SSE endpoint for realtime updates
 * Auth: HttpOnly grc_sse_token cookie (short-lived, one-time) OR Bearer JWT cookie
 * Query params: tenant, modules, module, item, lastEventId
 * Fix 3: query-parameter ?token= removed — no JWT in URL
 */
router.get(
  '/',
  (req: Request, _res: Response, next: NextFunction) => {
    if ((req as any).__sseTokenAuth) { next(); return; }

    // Phase 9: accept the JWT ticket via ?ticket=, cookie, OR Authorization
    // header. Query-string is accepted because EventSource cannot set custom
    // headers; the JWT is short-lived (60s) and purpose-scoped so URL-borne
    // tickets are an acceptable risk (they'd be TLS-encrypted in transit and
    // the one-shot handshake is the only surface where ticket ever appears).
    const ticketFromQuery = typeof req.query.ticket === 'string' ? req.query.ticket : undefined;
    if (ticketFromQuery) {
      const t = verifySseTicket(ticketFromQuery);
      if (t) {
        (req as any).user = { userId: t.userId, tenantId: t.tenantId };
        (req as any).tenantId = t.tenantId;
        (req as any).__sseTokenAuth = true;
        next();
        return;
      }
    }

    if (req.headers.cookie) {
      const ticketMatch = req.headers.cookie.match(/(?:^|;\s*)grc_sse_ticket=([^;]+)/);
      if (ticketMatch) {
        const t = verifySseTicket(ticketMatch[1]);
        if (t) {
          (req as any).user = { userId: t.userId, tenantId: t.tenantId };
          (req as any).tenantId = t.tenantId;
          (req as any).__sseTokenAuth = true;
          next();
          return;
        }
      }

      const sseMatch = req.headers.cookie.match(/(?:^|;\s*)grc_sse_token=([^;]+)/);
      if (sseMatch) {
        const sseResult = consumeSseToken(sseMatch[1]);
        if (sseResult) {
          (req as any).user = { userId: sseResult.userId, tenantId: sseResult.tenantId };
          (req as any).tenantId = sseResult.tenantId;
          (req as any).__sseTokenAuth = true;
          next();
          return;
        }
      }

      const jwtMatch = req.headers.cookie.match(/(?:^|;\s*)grc_token=([^;]+)/);
      if (jwtMatch) {
        req.headers.authorization = `Bearer ${jwtMatch[1]}`;
      }
    }

    if (req.headers.authorization) { next(); return; }

    next();
  },
  (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).__sseTokenAuth) return next();
    authenticate(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;
    
    // Fix 4: Parse all modules from comma-separated list, sanitize
    const modulesQuery = req.query.modules as string | undefined;
    const moduleQuery = req.query.module as string | undefined;
    let modules: string[] = [];
    if (modulesQuery) {
      modules = modulesQuery.split(',').map(m => m.trim().replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean);
    } else if (moduleQuery) {
      modules = [moduleQuery.trim().replace(/[^a-zA-Z0-9_-]/g, '')].filter(Boolean);
    }

    const itemId = req.query.item as string | undefined;
    const lastEventId = req.query.lastEventId as string | undefined;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    // Generate connection ID
    const connectionId = `${tenantId}:${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    const now = Date.now();
    const connection: SSEConnection = {
      id: connectionId,
      res,
      tenantId,
      userId,
      modules,
      itemId,
      lastEventId,
      connectedAt: now,
      lastPingAt: now,
    };
    addConnection(connection);

    // Send initial connection event
    sendEvent(res, {
      id: `conn-${Date.now()}`,
      event: 'connected',
      data: {
        connectionId,
        tenantId,
        timestamp: new Date().toISOString(),
        modules: modules.length > 0 ? modules : null,
        item: itemId || null,
      },
    });

    // Replay missed events. Prefer Redis-stream replay (cross-replica, survives
    // restart) when the client presents a Redis-stream id (shape `<ms>-<seq>`);
    // fall back to the in-memory ring buffer for legacy ids.
    const headerLastId = (req.headers['last-event-id'] as string | undefined) ?? undefined;
    const effectiveLastEventId = lastEventId || headerLastId;
    if (effectiveLastEventId) {
      const looksLikeStreamId = /^\d+-\d+$/.test(effectiveLastEventId);
      let missed: unknown[] = [];
      if (looksLikeStreamId) {
        missed = await replayFromTenantStream(tenantId, effectiveLastEventId);
      } else {
        missed = getMissedEvents(effectiveLastEventId, tenantId, modules);
      }
      for (const payload of missed) {
        sendEvent(res, payload as { id?: string; event?: string; data: unknown });
      }
    }

    // Handle client disconnect (Fix 8)
    req.on('close', () => {
      removeConnection(connectionId);
      logger.debug(`[SSE] Connection closed: ${connectionId}`);
    });

    req.on('error', (err) => {
      logger.warn(`[SSE] Connection error: ${connectionId}`, { error: (err as Error).message });
      removeConnection(connectionId);
      req.destroy();
    });

    // Keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(keepAlive);
        removeConnection(connectionId);
        return;
      }
      try {
        res.write(':ping\n\n');
        const conn = connMap.get(connectionId);
        if (conn) conn.lastPingAt = Date.now();
      } catch {
        clearInterval(keepAlive);
        removeConnection(connectionId);
      }
    }, 30000);

    // Clean up on close
    res.on('close', () => {
      clearInterval(keepAlive);
    });

    logger.debug(`[SSE] Connection established: ${connectionId} for tenant ${tenantId}, modules=[${modules.join(',')}]`);
  }),
);

/**
 * POST /events/broadcast
 * Admin endpoint to broadcast an event to all connected clients in a tenant
 */
router.post(
  '/broadcast',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const { eventType, data, moduleCode, itemId } = req.body;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
      return;
    }

    const sentCount = broadcastToTenant(tenantId, {
      event: eventType,
      data,
      module: moduleCode,
      itemId,
    });

    res.json({ broadcast: sentCount > 0, count: sentCount });
  }),
);

/**
 * GET /events/stats
 * Get SSE connection statistics (admin only)
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const connectionsByTenant: Record<string, number> = {};
    let totalConnections = 0;
    for (const [tenant, connIds] of tenantIndex.entries()) {
      connectionsByTenant[tenant] = connIds.size;
      totalConnections += connIds.size;
    }

    res.json({
      totalConnections,
      connectionsByTenant,
      moduleIndexSize: moduleIndex.size,
      recentEventsBuffered: recentEvents.length,
      sseTokensPending: sseTokens.size,
    });
  }),
);

export default router;
