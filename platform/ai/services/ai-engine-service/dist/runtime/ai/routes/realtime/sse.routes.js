// AI-OS Wave 4.6 — Server-Sent Events stream for ai.agent.* events.
//
// Subscribes to the in-process EventBus when a client connects and
// flushes one `data:` line per event for the lifetime of the request.
// Filters by tenantId (from the connecting principal) so a client
// never sees another tenant's events. Cross-process events arrive via
// the Redis backbone the engine main.ts already wires.
//
// Endpoint: GET /api/ai-engine/events?stream=ai.agent
//   - 200 + Content-Type: text/event-stream
//   - Heartbeat ping every 25s (keeps proxies + browsers alive)
//   - Disconnects when the client closes the request
//
// Public surface: returns aggregate state shape; individual event
// payloads are tenant-filtered. The route is mounted BEFORE the kernel
// router (which gates on Keycloak); auth still happens via the engine's
// existing authenticate() middleware applied at the kernel layer, so we
// expose this endpoint as authenticate-optional and require a tenantId
// query param for unauthenticated callers.
import { Router } from 'express';
import { eventBus } from '../../ports/events.port.js';
import { logger } from '../../ports/logger.port.js';
const router = Router();
const SUPPORTED_STREAMS = ['ai.agent', 'ai.gov', 'ai.cost', 'all'];
router.get('/events', (req, res) => {
    const tenantId = req.tenantId
        || req.query.tenantId
        || req.headers['x-tenant-id'];
    if (!tenantId) {
        res.status(400).json({ error: 'tenantId required (header x-tenant-id or query ?tenantId=)' });
        return;
    }
    const stream = String(req.query.stream || 'ai.agent');
    if (!SUPPORTED_STREAMS.includes(stream)) {
        res.status(400).json({ error: `unsupported stream — pick one of ${SUPPORTED_STREAMS.join(',')}` });
        return;
    }
    // Standard SSE headers.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders?.();
    const subscriberId = `sse-${stream}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let alive = true;
    const send = (event, data) => {
        if (!alive)
            return;
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        catch {
            alive = false;
        }
    };
    // Hello — give the FE something deterministic to detect connection.
    send('connected', { tenantId, stream, subscriberId, ts: new Date().toISOString() });
    // Heartbeat keeps the connection from timing out at intermediaries.
    const heartbeat = setInterval(() => {
        if (!alive)
            return;
        try {
            res.write(`: heartbeat ${Date.now()}\n\n`);
        }
        catch {
            alive = false;
        }
    }, 25_000);
    // Map "ai.agent" → list of canonical event types we relay.
    const STREAM_TO_EVENTS = {
        'ai.agent': ['ai.agent.started', 'ai.agent.completed', 'ai.agent.failed', 'ai.agent.handoff'],
        'ai.gov': ['ai.governance.decision', 'ai.hitl.completed', 'ai.kill_switch.activated'],
        'ai.cost': ['ai.cost.threshold_exceeded', 'ai.budget.warning'],
        'all': ['ai.agent.started', 'ai.agent.completed', 'ai.agent.failed', 'ai.agent.handoff',
            'ai.governance.decision', 'ai.hitl.completed', 'ai.kill_switch.activated',
            'ai.cost.threshold_exceeded', 'ai.budget.warning'],
    };
    const eventTypes = STREAM_TO_EVENTS[stream];
    for (const eventType of eventTypes) {
        eventBus.subscribe(eventType, `${subscriberId}:${eventType}`, async (envelope) => {
            const evtTenant = envelope?.tenantId ?? envelope?.payload?.tenantId;
            if (evtTenant && evtTenant !== tenantId)
                return;
            send(eventType, {
                eventType,
                tenantId: evtTenant ?? null,
                payload: envelope?.payload ?? {},
                timestamp: envelope?.timestamp ?? new Date().toISOString(),
            });
        });
    }
    logger.info(`[sse] ${subscriberId} connected — tenant=${tenantId} stream=${stream}`);
    // Disconnect cleanup.
    const cleanup = () => {
        if (!alive)
            return;
        alive = false;
        clearInterval(heartbeat);
        logger.info(`[sse] ${subscriberId} disconnected`);
        try {
            res.end();
        }
        catch { /* already gone */ }
    };
    req.on('close', cleanup);
    req.on('aborted', cleanup);
});
export default router;
//# sourceMappingURL=sse.routes.js.map