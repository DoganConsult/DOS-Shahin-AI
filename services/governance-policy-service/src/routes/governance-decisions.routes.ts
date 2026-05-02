import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler } from '@dos/platform-core/http';
import { query } from '@dos/db';

// F1.19 — canonical handler for /api/governance/decisions backed by
// dos.governance_decisions (board/committee decision register).
const router = Router();
router.use(authenticate);
router.use(requireTenantId);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const status = String(req.query.status || '').trim();
    const params: unknown[] = [(req as any).tenantId];
    let where = 'tenant_id = $1 AND deleted_at IS NULL';
    if (status) { params.push(status); where += ` AND status = $${params.length}`; }
    params.push(limit, offset);
    const result = await query(
      `SELECT decision_id, title, summary, decision_type, status, committee_id,
              decided_at, decided_by, rationale, linked_entity_type, linked_entity_id,
              metadata, created_at, updated_at
         FROM dos.governance_decisions
        WHERE ${where}
        ORDER BY decided_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ decisions: result.rows, total: result.rows.length });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `SELECT * FROM dos.governance_decisions
        WHERE decision_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, (req as any).tenantId],
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'decision not found' }); return; }
    res.json({ decision: result.rows[0] });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { title, summary, decision_type, status, committee_id, decided_by,
            rationale, linked_entity_type, linked_entity_id, metadata } = req.body || {};
    if (!title) { res.status(400).json({ error: 'title required' }); return; }
    const result = await query(
      `INSERT INTO dos.governance_decisions
         (tenant_id, title, summary, decision_type, status, committee_id,
          decided_by, rationale, linked_entity_type, linked_entity_id, metadata)
       VALUES ($1,$2,$3,COALESCE($4,'board'),COALESCE($5,'recorded'),$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [(req as any).tenantId, title, summary || null, decision_type || null,
       status || null, committee_id || null, decided_by || (req as any).user?.userId || null,
       rationale || null, linked_entity_type || null, linked_entity_id || null,
       metadata ? JSON.stringify(metadata) : null],
    );
    res.status(201).json({ decision: result.rows[0] });
  }),
);

export { router as governanceDecisionsRouter };
