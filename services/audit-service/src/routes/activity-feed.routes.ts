/**
 * Activity Feed — cursor-paginated, cross-module event stream over
 * dos.audit_trail. Consumed by the workspace-home dashboard
 * (frontend/.../pages/workspace-home/workspace-home.component.ts) as
 *   GET /api/activity-feed?cursor=<ts>&module=<code>
 *
 * Shape:
 *   { entries: Array<{ entry_id, timestamp, user_id, action,
 *                      entity_type, entity_id, module, payload }>,
 *     nextCursor: string | null }
 *
 * The cursor is the ISO timestamp of the last returned entry — simpler
 * than an offset and resilient to concurrent inserts (we page by
 * created_at DESC and accept the rare tie by using entry_id as a
 * tiebreaker so a cursor hit never re-emits the same row).
 */

import { Router, Request, Response } from 'express';
import { safeQuery } from '@dos/db';
import { authenticate, requirePermission } from '../adapters/auth.adapter';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('audit.trail.read'), async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      ((req as unknown as { user?: { tenantId?: string } }).user?.tenantId) ||
      '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const module = (req.query.module as string | undefined) || undefined;
    const cursor = (req.query.cursor as string | undefined) || undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10) || 50, 200);

    const where: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (module && module.length > 0) {
      where.push(`module = $${params.length + 1}`);
      params.push(module);
    }
    if (cursor && /^\d{4}-\d{2}-\d{2}T/.test(cursor)) {
      where.push(`created_at < $${params.length + 1}`);
      params.push(cursor);
    }

    const sql = `SELECT entry_id, tenant_id, actor_id, action, entity_type, entity_id,
                        module, payload, created_at
                   FROM dos.audit_trail
                  WHERE ${where.join(' AND ')}
                  ORDER BY created_at DESC, entry_id DESC
                  LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await safeQuery(sql, params).catch(() => ({ rows: [] as Record<string, unknown>[] }));

    const entries = (rows as Record<string, unknown>[]).map((r) => ({
      entry_id: r['entry_id'] as string,
      timestamp: (r['created_at'] as string | undefined) ?? new Date().toISOString(),
      user_id: (r['actor_id'] as string) ?? '',
      action: (r['action'] as string) ?? '',
      entity_type: (r['entity_type'] as string) ?? '',
      entity_id: (r['entity_id'] as string) ?? '',
      module: (r['module'] as string) ?? '',
      payload: r['payload'] ?? null,
    }));

    const nextCursor = entries.length === limit
      ? (entries[entries.length - 1]?.timestamp ?? null)
      : null;

    res.json({ entries, nextCursor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
});

export default router;
