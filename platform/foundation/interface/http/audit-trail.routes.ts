import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, auditMiddleware } from '../../ports/middleware.port';
import { query } from '../../ports/database.port';

export const auditTrailRouter = Router();
auditTrailRouter.use(authenticate);
auditTrailRouter.use(requireTenantId);
auditTrailRouter.use(auditMiddleware('audit_trail'));

function buildAuditWhere(tenantId: string, q: Record<string, unknown>): { where: string; params: unknown[] } {
  const params: unknown[] = [tenantId];
  const conds = ['tenant_id = $1'];
  const push = (col: string, raw: unknown) => {
    const v = String(raw ?? '').trim();
    if (!v) return;
    params.push(v);
    conds.push(`${col} = $${params.length}`);
  };
  push('module', q.module);
  push('actor_id', q.actor_id);
  push('action', q.action);
  push('entity_type', q.entity_type);
  push('entity_id', q.entity_id);
  const from = String(q.from ?? '').trim();
  const to = String(q.to ?? '').trim();
  if (from) { params.push(from); conds.push(`created_at >= $${params.length}`); }
  if (to)   { params.push(to);   conds.push(`created_at <= $${params.length}`); }
  return { where: conds.join(' AND '), params };
}

auditTrailRouter.get('/',
  requirePermission('audit_trail.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { where, params } = buildAuditWhere(req.tenantId!, req.query as Record<string, unknown>);
    const countRes = await query(`SELECT COUNT(*)::int AS count FROM dos.audit_trail WHERE ${where}`, params);
    const listParams = [...params, limit, offset];
    const result = await query(
      `SELECT entry_id, actor_id, action, entity_type, entity_id, module, payload, created_at
         FROM dos.audit_trail
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    res.json({ entries: result.rows, total: countRes.rows[0]?.count ?? 0, limit, offset });
  }),
);

// W5.F5.3 — CSV export of filtered audit rows. Hard cap at 50k rows so a
// stray query cannot DOS the service or generate a multi-GB stream.
auditTrailRouter.get('/export',
  requirePermission('audit_trail.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { where, params } = buildAuditWhere(req.tenantId!, req.query as Record<string, unknown>);
    const result = await query(
      `SELECT entry_id, actor_id, action, entity_type, entity_id, module, payload, created_at
         FROM dos.audit_trail
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT 50000`,
      params,
    );
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'entry_id,actor_id,action,entity_type,entity_id,module,payload,created_at\n';
    const body = result.rows
      .map((r: any) => [r.entry_id, r.actor_id, r.action, r.entity_type, r.entity_id, r.module, r.payload, r.created_at].map(escape).join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${Date.now()}.csv"`);
    res.send(header + body + '\n');
  }),
);
