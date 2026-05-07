import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { setEventBus } from '@dos/module-sdk';
import { logger } from '@dos/platform-core/observability';
import { notificationRoutes } from './routes/index';
import eventsRouter, { initSSEFanout } from './routes/events.routes';
import publicDemoRequestRouter from './routes/public-demo-request.routes';
import { setNotificationBus } from './events/publisher';
import { registerConsumers } from './events/consumer';
import { NotificationWsServer } from './websocket/ws-server';
import { createEventEnvelope, WS_EVENT_TYPES } from './websocket/types';
import { setRealtimeProvider, REALTIME_BUS_EVENT, REALTIME_BROADCAST_BUS_EVENT, type RealtimeEvent } from '@dos/platform-core/events';
import { allAuthOrigins } from '@dos/platform-core/auth-host-policy';
import {
  NOTIFICATIONS_SEND_EMAIL_EVENT,
  NOTIFICATIONS_SEND_TEMPLATED_EVENT,
  sendEmail as platformSendEmail,
  sendTemplatedEmail as platformSendTemplatedEmail,
} from '@dos/platform-core/notifications';
import { registerNotificationsAdapter } from './adapters/notifications.adapter';
import { getInboxCount } from './domain/inbox.service';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('notification', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

const SERVICE_CODE = 'notification-service';

let wsServer: NotificationWsServer | null = null;

export function getWsServer(): NotificationWsServer | null {
  return wsServer;
}

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  // Wire the canonical PlatformNotifications port to this service's real
  // email delivery (Microsoft Graph API → SMTP fallback). Any code across
  // the platform calling sendEmail() from @dos/platform-core/notifications
  // lands here via in-process dispatch (for code co-located with this
  // service) or via the event bus (for cross-service callers — see the
  // 'notification.send-email' subscriber below).
  registerNotificationsAdapter();

  /**
   * createEventEnvelope expects Record<string, unknown>; the canonical
   * RealtimeEvent.payload is `unknown` so callers can pass primitives or
   * plain objects. Coerce non-object payloads into a `{ value }` wrapper
   * so the WS envelope shape stays uniform on the wire. When a
   * correlationId is set on the source RealtimeEvent we surface it inside
   * `data.__correlationId` so client code can dedupe — the WS envelope
   * shape (WsEventEnvelope) doesn't have a top-level correlationId field
   * and we don't want to fork the wire format for one optional hint.
   */
  function normalizePayload(payload: unknown, correlationId?: string): Record<string, unknown> {
    const base: Record<string, unknown> =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? { ...(payload as Record<string, unknown>) }
        : { value: payload };
    if (correlationId) base.__correlationId = correlationId;
    return base;
  }

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });
  setEventBus(eventBus as any);
  setNotificationBus(eventBus);

  registerConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    logger.error(`[${SERVICE_CODE}] Consumer error`, { error: err.message });
  });

  // Fix 7: Activate SSE Redis pub/sub fanout for multi-pod event delivery
  initSSEFanout(config.redis.url);

  // WS origin allowlist — derived from the SoT auth-host policy so the
  // per-brand split (auth.shahin-ai.com vs auth.dogan-ai.com) stays
  // consistent with CSP + CORS. Extra origins can be appended via
  // WS_EXTRA_ALLOWED_ORIGINS (comma-separated) for non-browser clients.
  const wsExtra = (process.env.WS_EXTRA_ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const wsAllowed = [...allAuthOrigins(['https', 'wss']), ...wsExtra];
  wsServer = new NotificationWsServer({
    redisUrl: config.redis.url,
    allowedOrigins: wsAllowed,
  });

  const { app, start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/notifications', router: notificationRoutes },
      { path: '/api/notification', router: notificationRoutes },
      { path: '/events', router: eventsRouter },
      { path: '/api/events', router: eventsRouter },
      // Phase-12E wire-closure: public lead capture from request-demo page.
      { path: '/api/public/demo-request', router: publicDemoRequestRouter },
    ],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
      websocket: async () => {
        if (!wsServer) return false;
        const m = wsServer.getMetrics();
        if (m.draining) return false;
        const staleRatio = m.activeConnections > 0 ? m.staleConnections / m.activeConnections : 0;
        if (staleRatio > 0.5) return false;
        return true;
      },
      ws_fanout: async () => {
        return wsServer?.fanoutHealthy() ?? false;
      },
    },
  });

  app.get('/api/notifications/ws-health', (_req, res) => {
    if (!wsServer) {
      res.status(503).json({ status: 'unavailable' });
      return;
    }
    const m = wsServer.getMetrics();
    const staleRatio = m.activeConnections > 0 ? +(m.staleConnections / m.activeConnections).toFixed(3) : 0;
    const totalDisconnects = m.disconnectNormal + m.disconnectError + m.disconnectStale + m.disconnectAuthFailure;
    const sendFailRate = (m.connectSuccess + m.connectFailure) > 0
      ? +(m.messageSendFailures / (m.connectSuccess + m.connectFailure)).toFixed(3) : 0;
    const degraded = staleRatio > 0.5 || !m.fanoutHealthy;
    res.json({
      status: m.draining ? 'draining' : degraded ? 'degraded' : 'healthy',
      connections: m.activeConnections,
      users: m.users,
      tenants: m.tenants,
      fanoutHealthy: m.fanoutHealthy,
      staleConnections: m.staleConnections,
      staleRatio,
      sendFailRate,
      draining: m.draining,
      counters: {
        connectSuccess: m.connectSuccess,
        connectFailure: m.connectFailure,
        disconnectNormal: m.disconnectNormal,
        disconnectError: m.disconnectError,
        disconnectStale: m.disconnectStale,
        disconnectAuthFailure: m.disconnectAuthFailure,
        totalDisconnects,
        messageSendFailures: m.messageSendFailures,
        slowConsumersClosed: m.slowConsumersClosed,
        inboundMessages: m.inboundMessages,
        inboundRateLimited: m.inboundRateLimited,
      },
    });
  });

  const wsShutdown = async () => {
    if (wsServer) await wsServer.shutdown();
  };
  process.on('SIGTERM', () => wsShutdown());
  process.on('SIGINT', () => wsShutdown());

  const httpServer = await start();
  wsServer.attach(httpServer);

  // Wire the canonical PlatformRealtime port to this WS server so any code
  // importing pushToUser/buildWSEvent from @dos/platform-core/events delivers
  // through this same connection registry + Redis fanout.
  const realtimeServer = wsServer;

  async function logDelivery(
    tenantId: string,
    userId: string | null,
    event: RealtimeEvent,
    deliveryPath: 'in_process' | 'event_bus',
    outcome: 'delivered' | 'no_session' | 'error',
    errorMessage?: string,
  ): Promise<void> {
    try {
      const { safeQuery } = await import('@dos/db');
      const payloadBytes = Buffer.byteLength(JSON.stringify(event.payload ?? {}));
      const activeSessions = realtimeServer.getMetrics().activeConnections;
      await safeQuery(
        `INSERT INTO public.realtime_delivery_log
          (tenant_id, user_id, event_type, correlation_id, delivery_path, outcome, active_sessions, error_message, payload_bytes, emitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [tenantId, userId, event.type, event.correlationId ?? null, deliveryPath, outcome, activeSessions, errorMessage ?? null, payloadBytes, event.emittedAt],
      );
    } catch {
      // Audit logging is best-effort. Failure must not break delivery.
    }
  }

  setRealtimeProvider({
    pushToUser(tenantId: string, userId: string, event: RealtimeEvent) {
      realtimeServer.sendToUser(userId, tenantId, createEventEnvelope(event.type, normalizePayload(event.payload, event.correlationId)))
        .then(() => logDelivery(tenantId, userId, event, 'in_process', 'delivered'))
        .catch((err: unknown) => logDelivery(tenantId, userId, event, 'in_process', 'error', err instanceof Error ? err.message : String(err)));
    },
    broadcastToTenant(tenantId: string, event: RealtimeEvent) {
      realtimeServer.sendToTenant(tenantId, createEventEnvelope(event.type, normalizePayload(event.payload, event.correlationId)))
        .then(() => logDelivery(tenantId, null, event, 'in_process', 'delivered'))
        .catch((err: unknown) => logDelivery(tenantId, null, event, 'in_process', 'error', err instanceof Error ? err.message : String(err)));
    },
    getActiveSessionCount() {
      return realtimeServer.getMetrics().activeConnections;
    },
  });

  // Consume realtime pushes produced by other services via the platform
  // event bus (canonical PlatformRealtime fanout path).
  eventBus.subscribe(REALTIME_BUS_EVENT, async (event) => {
    if (!wsServer) return;
    const payload = event.payload as { userId?: string; event?: RealtimeEvent } | undefined;
    const userId = payload?.userId ?? event.userId;
    const tenantId = event.tenantId;
    const rtEvent = payload?.event;
    if (!userId || !tenantId || !rtEvent) return;
    await wsServer.sendToUser(userId, tenantId, createEventEnvelope(rtEvent.type, normalizePayload(rtEvent.payload, rtEvent.correlationId)));
  });

  eventBus.subscribe(REALTIME_BROADCAST_BUS_EVENT, async (event) => {
    if (!wsServer) return;
    const payload = event.payload as { event?: RealtimeEvent } | undefined;
    const tenantId = event.tenantId;
    const rtEvent = payload?.event;
    if (!tenantId || !rtEvent) return;
    await wsServer.sendToTenant(tenantId, createEventEnvelope(rtEvent.type, normalizePayload(rtEvent.payload, rtEvent.correlationId)));
  });

  // Consume cross-service email send requests. Other services publish
  // these when they call sendEmail()/sendTemplatedEmail() from
  // @dos/platform-core/notifications without having a local adapter.
  eventBus.subscribe(NOTIFICATIONS_SEND_EMAIL_EVENT, async (event) => {
    const p = event.payload as {
      to?: string | string[];
      subject?: string;
      body?: string;
      opts?: { from?: string; html?: boolean };
    } | undefined;
    if (!p?.to || !p.subject || typeof p.body !== 'string') {
      logger.warn(`[${SERVICE_CODE}] Dropped malformed ${NOTIFICATIONS_SEND_EMAIL_EVENT}`, { payload: p });
      return;
    }
    try {
      await platformSendEmail(p.to, p.subject, p.body, p.opts);
    } catch (err) {
      logger.error(`[${SERVICE_CODE}] ${NOTIFICATIONS_SEND_EMAIL_EVENT} delivery failed`, {
        to: p.to,
        subject: p.subject,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  eventBus.subscribe(NOTIFICATIONS_SEND_TEMPLATED_EVENT, async (event) => {
    const p = event.payload as {
      to?: string | string[];
      templateId?: string;
      variables?: Record<string, unknown>;
    } | undefined;
    if (!p?.to || !p.templateId) {
      logger.warn(`[${SERVICE_CODE}] Dropped malformed ${NOTIFICATIONS_SEND_TEMPLATED_EVENT}`, { payload: p });
      return;
    }
    try {
      await platformSendTemplatedEmail(p.to, p.templateId, p.variables ?? {});
    } catch (err) {
      logger.error(`[${SERVICE_CODE}] ${NOTIFICATIONS_SEND_TEMPLATED_EVENT} delivery failed`, {
        to: p.to,
        templateId: p.templateId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  eventBus.subscribe('notification.created', async (event) => {
    if (!wsServer) return;
    const payload = event.payload as any;
    const userId = payload?.userId || event.userId;
    const tenantId = event.tenantId;
    if (!userId || !tenantId) return;

    logger.info('[audit] notification.created received', {
      tenantId,
      userId,
      notificationId: payload?.notificationId,
      type: payload?.type,
      module: payload?.module,
    });

    await wsServer.sendToUser(userId, tenantId, createEventEnvelope(
      WS_EVENT_TYPES.NOTIFICATION_CREATED,
      {
        notificationId: payload?.notificationId,
        title: payload?.title,
        body: payload?.body,
        type: payload?.type,
        module: payload?.module,
        entityType: payload?.entityType,
        entityId: payload?.entityId,
      },
    ));

    try {
      const counts = await getInboxCount(tenantId, userId);
      await wsServer.sendToUser(userId, tenantId, createEventEnvelope(
        WS_EVENT_TYPES.NOTIFICATION_UNREAD_COUNT_UPDATED,
        { unread: counts.unread, total: counts.total },
      ));
    } catch (err: any) {
      logger.warn('[audit] Failed to fetch inbox count after notification.created', {
        tenantId, userId, error: err?.message,
      });
    }
  });

  eventBus.subscribe('notification.read', async (event) => {
    if (!wsServer) return;
    const payload = event.payload as any;
    const userId = payload?.userId || event.userId;
    const tenantId = event.tenantId;
    if (!userId || !tenantId) return;

    logger.info('[audit] notification.read received', {
      tenantId,
      userId,
      notificationId: payload?.notificationId,
    });

    try {
      const counts = await getInboxCount(tenantId, userId);
      await wsServer.sendToUser(userId, tenantId, createEventEnvelope(
        WS_EVENT_TYPES.NOTIFICATION_UNREAD_COUNT_UPDATED,
        { unread: counts.unread, total: counts.total },
      ));
    } catch (err: any) {
      logger.warn('[audit] Failed to fetch inbox count after notification.read', {
        tenantId, userId, error: err?.message,
      });
    }
  });

  logger.info(`[${SERVICE_CODE}] Started successfully`);
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
