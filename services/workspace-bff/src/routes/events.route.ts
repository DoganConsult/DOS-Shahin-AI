import { Router, type Request, type Response } from 'express';
import { masterQuery } from '@dos/db/master';
import { refreshBootstrapMv } from '../lib/bootstrap-repo.js';

/**
 * GET /api/workspace/events  (SSE)
 *
 * Doctrine Article 2 + M5: emits `bootstrap-invalidate` events whenever a
 * row is appended to `dos.dos_master_invalidation_log`. Polling-based
 * tail (5s) — adequate for the current write rate; LISTEN/NOTIFY upgrade
 * is a follow-up after PG NOTIFY plumbing lands in @dos/db.
 *
 * Each event payload: `{ id, scope, scope_key, reason, cache_version,
 *  emitted_at }`. Clients tear down their cached bootstrap and re-fetch
 * `/api/workspace/bootstrap` when a matching scope arrives.
 */
export const eventsRouter = Router();

const TAIL_INTERVAL_MS = 5000;

eventsRouter.get('/events', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let lastId = Number(req.query.lastEventId ?? 0);
  let closed = false;

  const send = (id: number, event: string, data: unknown) => {
    if (closed) return;
    res.write(`id: ${id}\n`);
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send(0, 'hello', { service: 'workspace-bff', sse: 'bootstrap-invalidate' });

  const tick = async () => {
    if (closed) return;
    try {
      const r = await masterQuery(
        `SELECT id, scope, scope_key, reason, cache_version, emitted_at
           FROM dos.dos_master_invalidation_log
          WHERE id > $1
          ORDER BY id ASC
          LIMIT 100`,
        [lastId],
      );
      for (const row of r.rows as Record<string, unknown>[]) {
        const id = Number(row.id);
        send(id, 'bootstrap-invalidate', row);
        lastId = id;
      }
    } catch (err) {
      send(lastId, 'error', { detail: String((err as Error).message) });
    }
  };

  const handle = setInterval(tick, TAIL_INTERVAL_MS);
  tick();

  req.on('close', () => {
    closed = true;
    clearInterval(handle);
  });
});

/**
 * POST /api/workspace/refresh — internal hook that REFRESHes the MV
 * concurrently. Called by writers after permission/module/binding mutations.
 * In M11 this gets fronted by mTLS; for M5 it's gated by the BFF's own
 * dos-master role membership.
 */
eventsRouter.post('/refresh', async (_req: Request, res: Response) => {
  try {
    await refreshBootstrapMv();
    res.json({ ok: true, refreshed_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'refresh_failed', detail: String((err as Error).message) });
  }
});
