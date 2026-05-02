/**
 * Realtime SSE router.
 *
 *   GET  /events/:scopeType         — server-sent stream (text/event-stream)
 *   POST /events/:scopeType/publish — host-to-host publish helper (auth required)
 *
 * Tenant scoping: every channel is keyed by (tenantId, scopeType). Two tenants
 * subscribed to /events/obligations get independent streams.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { subscribe, publishEvent } from '../../application/realtime/realtime.service';

export interface RealtimeRouterDeps {
  resolveContext: (req: Request) => { tenantId: string; userId: string } | Promise<{ tenantId: string; userId: string }>;
}

export function createRealtimeRouter(deps: RealtimeRouterDeps): ExpressRouter {
  const router = Router();

  router.get('/events/:scopeType', async (req: Request, res: Response) => {
    let c;
    try { c = await deps.resolveContext(req); }
    catch (err) { res.status(401).json({ error: { code: 'no_context', message: String((err as Error).message) } }); return; }

    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache, no-transform');
    res.setHeader('connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ scopeType: req.params.scopeType, ts: new Date().toISOString() })}\n\n`);

    const unsubscribe = subscribe(c.tenantId, req.params.scopeType, {
      write: (chunk) => res.write(chunk),
      end: () => res.end(),
      on: (event, cb) => req.on(event, cb),
    });

    req.on('close', () => { unsubscribe(); });
  });

  router.post('/events/:scopeType/publish', async (req: Request, res: Response) => {
    let c;
    try { c = await deps.resolveContext(req); }
    catch (err) { res.status(401).json({ error: { code: 'no_context', message: String((err as Error).message) } }); return; }
    const { type, payload } = req.body ?? {};
    if (typeof type !== 'string') return res.status(400).json({ error: { code: 'bad_type', message: 'body.type required' } });
    const r = publishEvent({
      tenantId: c.tenantId, scopeType: req.params.scopeType,
      type, payload, occurredAt: new Date().toISOString(),
    });
    res.json({ data: r });
  });

  return router;
}
