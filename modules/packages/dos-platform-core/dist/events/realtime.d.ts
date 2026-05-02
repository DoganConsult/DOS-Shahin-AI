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
export interface RealtimeEvent {
    /** Event type identifier (e.g. 'provisioning_completed', 'report_generated'). */
    type: string;
    /** Event payload (must be JSON-serializable). */
    payload: unknown;
    /** Server-assigned wall-clock time (ISO-8601). */
    emittedAt: string;
    /** Optional correlation id, useful for client-side dedup. */
    correlationId?: string;
}
export interface PlatformRealtime {
    /**
     * Deliver an event to every active session of (tenantId, userId).
     * Implementations MUST be best-effort: a delivery failure must not throw —
     * the event is fire-and-forget. Implementations should log + drop on failure.
     */
    pushToUser(tenantId: string, userId: string, event: RealtimeEvent): void;
    /**
     * Broadcast an event to every active session of a tenant. Optional —
     * not all transports support broadcast.
     */
    broadcastToTenant?(tenantId: string, event: RealtimeEvent): void;
    /** Number of currently connected sessions for diagnostics. */
    getActiveSessionCount?(): number;
}
/**
 * Internal event types the realtime port emits onto the platform event
 * bus when no in-process WS provider is registered. notification-service
 * subscribes to these and forwards the payload to the WS server.
 */
export declare const REALTIME_BUS_EVENT: "realtime.push.user";
export declare const REALTIME_BROADCAST_BUS_EVENT: "realtime.broadcast.tenant";
export declare function setRealtimeProvider(impl: PlatformRealtime): void;
export declare function clearRealtimeProvider(): void;
/**
 * Construct a canonical RealtimeEvent envelope.
 * Centralizes the wire format so producers don't drift.
 */
export declare function buildWSEvent(type: string, payload: unknown, opts?: {
    correlationId?: string;
}): RealtimeEvent;
/**
 * Push an event to a user session.
 * - If an in-process provider is registered (notification-service), deliver immediately.
 * - Otherwise, publish onto the event bus for notification-service to consume.
 * - If neither path is available, the call drops silently (realtime is best-effort).
 */
export declare function pushToUser(tenantId: string, userId: string, event: RealtimeEvent | unknown): void;
export declare function broadcastToTenant(tenantId: string, event: RealtimeEvent | unknown): void;
export declare function getActiveSessionCount(): number;
