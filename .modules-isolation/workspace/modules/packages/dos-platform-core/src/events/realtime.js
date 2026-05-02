"use strict";
/**
 * Platform Realtime Port — provider-agnostic interface for pushing
 * server-side events to connected user sessions over WebSocket / SSE.
 *
 * Architecture:
 *   - Producers (any service) call pushToUser(tenantId, userId, event).
 *   - notification-service hosts the WebSocketServer and registers an
 *     in-process provider via setRealtimeProvider() that delivers
 *     directly to connected sockets.
 *   - Other services don't have the WS server. The default behavior
 *     publishes a `realtime.push.user` event onto the platform event
 *     bus, which notification-service consumes and forwards to WS.
 *   - Test / no-runtime environments without an event bus simply drop
 *     events (fire-and-forget — realtime is best-effort by contract).
 *
 * Pattern mirrors PlatformNotifications: the runtime registers a real
 * provider; all callers go through the thin wrapper functions below.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REALTIME_BROADCAST_BUS_EVENT = exports.REALTIME_BUS_EVENT = void 0;
exports.setRealtimeProvider = setRealtimeProvider;
exports.clearRealtimeProvider = clearRealtimeProvider;
exports.buildWSEvent = buildWSEvent;
exports.pushToUser = pushToUser;
exports.broadcastToTenant = broadcastToTenant;
exports.getActiveSessionCount = getActiveSessionCount;
const events_1 = require("./events");
/**
 * Internal event types the realtime port emits onto the platform event
 * bus when no in-process WS provider is registered. notification-service
 * subscribes to these and forwards the payload to the WS server.
 */
exports.REALTIME_BUS_EVENT = 'realtime.push.user';
exports.REALTIME_BROADCAST_BUS_EVENT = 'realtime.broadcast.tenant';
let _realtime = null;
function setRealtimeProvider(impl) {
    _realtime = impl;
}
function clearRealtimeProvider() {
    _realtime = null;
}
function getRealtime() {
    return _realtime;
}
/**
 * Construct a canonical RealtimeEvent envelope.
 * Centralizes the wire format so producers don't drift.
 */
function buildWSEvent(type, payload, opts) {
    return {
        type,
        payload,
        emittedAt: new Date().toISOString(),
        correlationId: opts?.correlationId,
    };
}
function normalizeEvent(event) {
    if (event &&
        typeof event === 'object' &&
        'type' in event &&
        'emittedAt' in event) {
        return event;
    }
    return buildWSEvent('unknown', event);
}
/**
 * Push an event to a user session.
 * - If an in-process provider is registered (notification-service), deliver immediately.
 * - Otherwise, publish onto the event bus for notification-service to consume.
 * - If neither path is available, the call drops silently (realtime is best-effort).
 */
function pushToUser(tenantId, userId, event) {
    const envelope = normalizeEvent(event);
    const impl = getRealtime();
    if (impl) {
        try {
            impl.pushToUser(tenantId, userId, envelope);
        }
        catch {
            // Best-effort: do not throw to caller.
        }
        return;
    }
    // Fanout via event bus. publish() returns a promise; we fire-and-forget.
    void (0, events_1.publish)(exports.REALTIME_BUS_EVENT, tenantId, {
        userId,
        event: envelope,
    }).catch(() => {
        // Best-effort: bus may not be available in tests/local CLIs.
    });
}
function broadcastToTenant(tenantId, event) {
    const envelope = normalizeEvent(event);
    const impl = getRealtime();
    if (impl?.broadcastToTenant) {
        try {
            impl.broadcastToTenant(tenantId, envelope);
        }
        catch {
            // Best-effort.
        }
        return;
    }
    void (0, events_1.publish)(exports.REALTIME_BROADCAST_BUS_EVENT, tenantId, {
        event: envelope,
    }).catch(() => {
        // Best-effort.
    });
}
function getActiveSessionCount() {
    return getRealtime()?.getActiveSessionCount?.() ?? 0;
}
//# sourceMappingURL=realtime.js.map