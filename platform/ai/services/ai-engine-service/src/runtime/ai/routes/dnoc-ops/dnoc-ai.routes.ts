/**
 * DNOC AI Operations — HTTP routes.
 *
 * Mounted on ai-engine-service at /api/ai-engine/dnoc-ai/* (gateway can
 * later reverse-proxy /api/dnoc/ai/* → here once dnoc-service grows the
 * AI subdomain natively).
 *
 * Read-only endpoints. RBAC: requirePermission('platform.dnoc.read').
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery } from '@dos/db';
import { getUnifiedTimeline } from '../../services/dnoc-ops/unified-timeline.service';
import { getAgentHealth } from '../../services/dnoc-ops/agent-health.service';
import { getCostRollup } from '../../services/dnoc-ops/cost-rollup.service';

const router: ExpressRouter = Router();

// Adapter: ai-engine uses safeQuery (returns {rows,rowCount}); aggregator wants {rows}.
const platformQuery = async (text: string, params: unknown[] = []) => {
  const r = await safeQuery(text, params as any);
  return { rows: r.rows };
};

// Langfuse runs in its own DB. We allow opt-out via env in case the operator
// wants to run DNOC without Langfuse correlation (everything else still works).
async function langfuseQuery(text: string, params: unknown[] = []): Promise<{ rows: any[] }> {
  if (process.env.LANGFUSE_DB_URL) {
    try {
      const { Pool } = await import('pg');
      const pool = (langfuseQuery as any)._pool || new Pool({ connectionString: process.env.LANGFUSE_DB_URL });
      (langfuseQuery as any)._pool = pool;
      const r = await pool.query(text, params as any[]);
      return { rows: r.rows };
    } catch {
      return { rows: [] };
    }
  }
  return { rows: [] };
}

/** GET /api/ai-engine/dnoc-ai/health — module health probe (public, before authenticate). */
router.get('/health', (_req, res) => {
  res.json({ ok: true, module: 'dnoc-ai', service: 'ai-engine-service' });
});

router.use(authenticate);

/** GET /api/ai-engine/dnoc-ai/timeline — joined OpsEvent stream. */
router.get('/timeline', requirePermission('platform.dnoc.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenant as string) || (req.query.tenantId as string) || undefined;
    const agentId = (req.query.agent as string) || (req.query.agentId as string) || undefined;
    const surface = (req.query.surface as string) || undefined;
    const sinceParam = req.query.since ? new Date(req.query.since as string) : undefined;
    const untilParam = req.query.until ? new Date(req.query.until as string) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const kindPrefix = (req.query.kind as string) || undefined;

    const events = await getUnifiedTimeline(platformQuery, langfuseQuery, {
      tenantId, agentId, surface, since: sinceParam, until: untilParam, limit, kindPrefix,
    });
    res.json({ count: events.length, events });
  } catch (err: any) {
    res.status(500).json({ error: 'timeline failed', details: err?.message });
  }
});

/** GET /api/ai-engine/dnoc-ai/agent-health — per-agent rollup. */
router.get('/agent-health', requirePermission('platform.dnoc.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenant as string) || undefined;
    const windowHours = req.query.window ? Number(req.query.window) : undefined;
    const rows = await getAgentHealth(platformQuery, langfuseQuery, { tenantId, windowHours });
    res.json({ count: rows.length, rows });
  } catch (err: any) {
    res.status(500).json({ error: 'agent-health failed', details: err?.message });
  }
});

/** GET /api/ai-engine/dnoc-ai/cost-rollup — per-tenant USD vs cap. */
router.get('/cost-rollup', requirePermission('platform.dnoc.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenant as string) || undefined;
    const rows = await getCostRollup(platformQuery, { tenantId });
    res.json({ count: rows.length, rows });
  } catch (err: any) {
    res.status(500).json({ error: 'cost-rollup failed', details: err?.message });
  }
});

/**
 * GET /api/ai-engine/dnoc-ai/langfuse-counts — last-24h trace count per surface tag.
 *
 * Powers the DNOC AI Trace Surfaces dashboard cards. Reads from the
 * Langfuse Postgres directly (LANGFUSE_DB_URL) since Langfuse v2 has no
 * tag-aggregation endpoint in its public REST API. Falls back to an
 * empty object when LANGFUSE_DB_URL is unset (dashboard renders without counts).
 */
router.get('/langfuse-counts', requirePermission('platform.dnoc.read'), async (_req: Request, res: Response) => {
  try {
    if (!process.env.LANGFUSE_DB_URL) {
      res.json({ counts: {} });
      return;
    }
    const r = await langfuseQuery(
      `SELECT tag, COUNT(*)::int AS n
         FROM (
           SELECT UNNEST(tags) AS tag, id
             FROM traces
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
         ) t
        WHERE tag LIKE 'surface:%'
        GROUP BY tag`,
      [],
    );
    const counts: Record<string, number> = {};
    for (const row of r.rows) counts[row.tag] = Number(row.n);
    res.json({ counts });
  } catch (err: any) {
    res.status(500).json({ error: 'langfuse-counts failed', details: err?.message, counts: {} });
  }
});

export default router;
