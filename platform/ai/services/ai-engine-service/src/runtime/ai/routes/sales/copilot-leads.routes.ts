/**
 * Sales: Copilot Leads — view + workflow over public.copilot_leads.
 *
 * Mounted at /api/sales/copilot-leads. RBAC: ai.copilot.read for list/get,
 * ai.copilot.write for state transitions (route / contact / convert / reject).
 *
 * Every read AND write writes a row into dos.audit_trail under the
 * `sales.lead.*` action prefix so compliance has a complete record of who
 * looked at which lead and what they did with it.
 */
import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery } from '@dos/db';
import { logger } from '../../ports/logger.port';

const router: ExpressRouter = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, module: 'sales-copilot-leads', service: 'ai-engine-service' });
});

router.use(authenticate);

const ALLOWED_STATUSES = ['new', 'routed', 'contacted', 'converted', 'rejected'] as const;
type LeadStatus = typeof ALLOWED_STATUSES[number];

async function writeSalesAudit(actorId: string, action: string, leadId: string, payload: Record<string, unknown>): Promise<void> {
  await safeQuery(
    `INSERT INTO dos.audit_trail (tenant_id, actor_id, action, entity_type, entity_id, module, payload)
     VALUES ('platform', $1, $2, 'copilot_lead', $3, 'ai', $4::jsonb)`,
    [actorId, action, leadId, JSON.stringify(payload)],
  ).catch((err: any) => logger.warn('[sales-leads] audit insert failed', { error: err?.message, leadId }));
}

/**
 * GET /api/sales/copilot-leads — paginated list filtered by status / intent.
 *
 * Query params:
 *   status   = new | routed | contacted | converted | rejected | all  (default: new + routed)
 *   intent   = demo | pricing | contact | docs | general | all       (default: all non-general)
 *   limit    = 1..200 (default 50)
 *   offset   = 0..N
 *   search   = free-text matched against email / company / message
 */
router.get('/', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? 'open');
    const intent = String(req.query.intent ?? 'qualified');
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status === 'open') {
      where.push(`status IN ('new','routed')`);
    } else if (status !== 'all' && (ALLOWED_STATUSES as readonly string[]).includes(status)) {
      where.push(`status = $${p++}`);
      params.push(status);
    }
    if (intent === 'qualified') {
      where.push(`intent IN ('demo','pricing','contact','docs')`);
    } else if (intent !== 'all') {
      where.push(`intent = $${p++}`);
      params.push(intent);
    }
    if (search.length > 0 && search.length <= 100) {
      where.push(`(email ILIKE $${p} OR company ILIKE $${p} OR message ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRow = await safeQuery(`SELECT count(*)::int AS n FROM public.copilot_leads ${whereSql}`, params).catch(() => ({ rows: [{ n: 0 }] }));
    params.push(limit); const limitIdx = p++;
    params.push(offset); const offsetIdx = p++;
    const r = await safeQuery(
      `SELECT lead_id, intent, email, company, role_title, message, source,
              status, routed_to, routed_at, captured_at,
              metadata
         FROM public.copilot_leads ${whereSql}
        ORDER BY
          CASE intent WHEN 'demo' THEN 1 WHEN 'pricing' THEN 2 WHEN 'contact' THEN 3 WHEN 'docs' THEN 4 ELSE 5 END,
          captured_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    ).catch(() => ({ rows: [] as any[] }));

    const user = (req as any).user || {};
    void writeSalesAudit(user?.sub ?? user?.email ?? 'unknown', 'sales.lead.list.viewed',
      'list', { count: r.rows.length, status, intent, search: search.slice(0, 50) });

    res.json({
      total: totalRow.rows[0]?.n ?? 0,
      count: r.rows.length,
      limit, offset,
      leads: r.rows.map((row: any) => ({
        leadId: row.lead_id,
        intent: row.intent,
        email: row.email,
        company: row.company,
        roleTitle: row.role_title,
        message: row.message,
        source: row.source,
        status: row.status,
        routedTo: row.routed_to,
        routedAt: row.routed_at,
        capturedAt: row.captured_at,
        history: Array.isArray(row.metadata?.history) ? row.metadata.history : [],
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'leads list failed', details: err?.message });
  }
});

router.get('/:id', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const r = await safeQuery(
      `SELECT lead_id, intent, email, company, role_title, message, source,
              status, routed_to, routed_at, captured_at, visitor_ip, user_agent,
              session_id, metadata
         FROM public.copilot_leads WHERE lead_id = $1`,
      [req.params.id],
    );
    if (r.rows.length === 0) { res.status(404).json({ error: 'lead not found' }); return; }
    const row = r.rows[0];
    const user = (req as any).user || {};
    void writeSalesAudit(user?.sub ?? user?.email ?? 'unknown', 'sales.lead.viewed',
      row.lead_id, { intent: row.intent, status: row.status });
    res.json({
      leadId: row.lead_id,
      intent: row.intent, email: row.email, company: row.company, roleTitle: row.role_title,
      message: row.message, source: row.source, status: row.status,
      routedTo: row.routed_to, routedAt: row.routed_at, capturedAt: row.captured_at,
      sessionId: row.session_id,
      // Visitor IP + UA are operator-only PII; expose to ai.copilot.read but
      // never to anonymous surfaces.
      visitorIp: row.visitor_ip, userAgent: row.user_agent,
      history: Array.isArray(row.metadata?.history) ? row.metadata.history : [],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'lead fetch failed', details: err?.message });
  }
});

/**
 * POST /api/sales/copilot-leads/:id/transition
 *   { to: 'routed'|'contacted'|'converted'|'rejected', routedTo?: string, note?: string }
 *
 * State machine: new → routed → contacted → converted | rejected.
 * Each transition writes a sales.lead.<status> audit-trail entry.
 */
router.post('/:id/transition', requirePermission('ai.copilot.write'), async (req: Request, res: Response) => {
  try {
    const to = String(req.body?.to ?? '');
    if (!(ALLOWED_STATUSES as readonly string[]).includes(to)) {
      res.status(400).json({ error: 'invalid status', allowed: ALLOWED_STATUSES });
      return;
    }
    const routedTo = typeof req.body?.routedTo === 'string' ? req.body.routedTo.slice(0, 120) : null;
    const note     = typeof req.body?.note === 'string' ? req.body.note.slice(0, 1000) : null;
    const user = (req as any).user || {};
    const actor = user?.sub ?? user?.email ?? 'unknown';

    const r = await safeQuery(
      `UPDATE public.copilot_leads
          SET status = $2,
              routed_to = COALESCE($3, routed_to),
              routed_at = CASE WHEN $2 IN ('routed','contacted','converted') AND routed_at IS NULL THEN NOW() ELSE routed_at END,
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{transitions}',
                COALESCE(metadata -> 'transitions', '[]'::jsonb) || jsonb_build_array(
                  jsonb_build_object('to', $2, 'by', $4, 'at', NOW(), 'note', $5)
                )
              )
        WHERE lead_id = $1
        RETURNING status`,
      [req.params.id, to, routedTo, actor, note],
    );
    if (r.rows.length === 0) { res.status(404).json({ error: 'lead not found' }); return; }
    await writeSalesAudit(actor, `sales.lead.${to}` as string, req.params.id, { routedTo, note });
    res.json({ ok: true, status: r.rows[0].status });
  } catch (err: any) {
    res.status(500).json({ error: 'transition failed', details: err?.message });
  }
});

export default router;
