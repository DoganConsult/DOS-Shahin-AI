/**
 * Foundation — SoD review cycle + attestation routes (Wave 1 backend
 * completion).
 *
 * Exposes:
 *   GET    /sod/reviews                          List review cycles.
 *   POST   /sod/reviews                          Create a review cycle.
 *   GET    /sod/reviews/:cycleId                 Get one review cycle.
 *   POST   /sod/reviews/:cycleId/close           Close a review cycle.
 *   GET    /sod/reviews/:cycleId/attestations    List attestations in a cycle.
 *   POST   /sod/reviews/:cycleId/attestations    Add an attestation row.
 *   POST   /sod/reviews/:cycleId/attestations/:attId/decide
 *                                                Record reviewer decision.
 *
 * Backed by dos.foundation_sod_review_cycle +
 * dos.foundation_sod_review_attestation (RLS-scoped, see migration
 * 20260512_1000_foundation_sod_exception_review.sql).
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { query } from '../../ports/database.port';
import { writeRateLimiter } from './middleware/rate-limiter';

const READ  = ['admin','foundation_admin','compliance_admin','sod_admin','auditor','foundation.record.read'] as const;
const WRITE = ['admin','foundation_admin','compliance_admin','sod_admin'] as const;

const createCycleBody = z.object({
  cycle_code: z.string().min(1).max(64),
  name_en:    z.string().min(1).max(255),
  name_ar:    z.string().max(255).optional(),
  cadence:    z.enum(['monthly','quarterly','annual','adhoc']).optional(),
  due_at:     z.string().datetime(),
  scope:      z.record(z.unknown()).optional(),
});

const addAttestationBody = z.object({
  rule_code: z.string().min(1).max(64),
  user_id:   z.string().min(1).max(255),
  reviewer_id: z.string().max(255).optional(),
  context:     z.record(z.unknown()).optional(),
});

const decideAttestationBody = z.object({
  decision:  z.enum(['accept_risk','remediate','revoke','escalate','no_change']),
  rationale: z.string().max(2000).optional(),
  evidence_uri: z.string().max(500).optional(),
});

const router = Router();
router.use(authenticate, requireTenantId, auditMiddleware('foundation_sod_review'));

router.get('/',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const params: unknown[] = [tenantId];
    const where: string[] = [`tenant_id = $1`];
    if (typeof req.query.status === 'string') {
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    const result = await query(
      `SELECT cycle_id, tenant_id, cycle_code, name_en, name_ar, cadence,
              starts_at, due_at, closed_at, status, scope,
              created_by, created_at, updated_at
         FROM dos.foundation_sod_review_cycle
        WHERE ${where.join(' AND ')}
        ORDER BY due_at DESC, created_at DESC
        LIMIT 200`,
      params,
    );
    res.json({ success: true, data: result.rows });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: createCycleBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const body = req.body as z.infer<typeof createCycleBody>;
    const result = await query(
      `INSERT INTO dos.foundation_sod_review_cycle
         (tenant_id, cycle_code, name_en, name_ar, cadence, due_at, scope, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'open')
       ON CONFLICT (tenant_id, cycle_code) DO UPDATE SET
         name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
         cadence = EXCLUDED.cadence, due_at = EXCLUDED.due_at,
         scope = EXCLUDED.scope, updated_at = now()
       RETURNING *`,
      [
        tenantId, body.cycle_code, body.name_en, body.name_ar ?? null,
        body.cadence ?? 'quarterly', body.due_at,
        JSON.stringify(body.scope ?? {}),
        req.user!.userId,
      ],
    );
    setAuditData(res, {
      entityId: result.rows[0].cycle_id,
      entityType: 'sod_review_cycle',
      action: 'create',
    });
    res.status(201).json({ success: true, data: result.rows[0] });
  }),
);

router.get('/:cycleId',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `SELECT * FROM dos.foundation_sod_review_cycle
        WHERE cycle_id = $1 AND tenant_id = $2`,
      [req.params.cycleId, req.tenantId!],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  }),
);

router.post('/:cycleId/close',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `UPDATE dos.foundation_sod_review_cycle
          SET status='closed', closed_at=now(), updated_at=now()
        WHERE cycle_id=$1 AND tenant_id=$2 AND status IN ('open','in_review','draft')
        RETURNING *`,
      [req.params.cycleId, req.tenantId!],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found_or_already_closed' });
      return;
    }
    setAuditData(res, {
      entityId: req.params.cycleId,
      entityType: 'sod_review_cycle',
      action: 'close',
    });
    res.json({ success: true, data: result.rows[0] });
  }),
);

router.get('/:cycleId/attestations',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const params: unknown[] = [tenantId, req.params.cycleId];
    const where: string[] = [`tenant_id = $1`, `cycle_id = $2`];
    if (typeof req.query.decision === 'string') {
      params.push(req.query.decision);
      where.push(`decision = $${params.length}`);
    }
    const result = await query(
      `SELECT attestation_id, tenant_id, cycle_id, rule_code, user_id,
              reviewer_id, decision, rationale, evidence_uri,
              decided_at, context, created_at, updated_at
         FROM dos.foundation_sod_review_attestation
        WHERE ${where.join(' AND ')}
        ORDER BY decision = 'pending' DESC, decided_at DESC NULLS FIRST, created_at DESC
        LIMIT 500`,
      params,
    );
    res.json({ success: true, data: result.rows });
  }),
);

router.post('/:cycleId/attestations',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: addAttestationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const body = req.body as z.infer<typeof addAttestationBody>;
    const result = await query(
      `INSERT INTO dos.foundation_sod_review_attestation
         (tenant_id, cycle_id, rule_code, user_id, reviewer_id, context, decision)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,'pending')
       ON CONFLICT (cycle_id, rule_code, user_id) DO UPDATE SET
         reviewer_id = EXCLUDED.reviewer_id,
         context = EXCLUDED.context,
         updated_at = now()
       RETURNING *`,
      [
        tenantId, req.params.cycleId, body.rule_code, body.user_id,
        body.reviewer_id ?? null, JSON.stringify(body.context ?? {}),
      ],
    );
    setAuditData(res, {
      entityId: result.rows[0].attestation_id,
      entityType: 'sod_review_attestation',
      action: 'enqueue',
    });
    res.status(201).json({ success: true, data: result.rows[0] });
  }),
);

router.post('/:cycleId/attestations/:attId/decide',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: decideAttestationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof decideAttestationBody>;
    const result = await query(
      `UPDATE dos.foundation_sod_review_attestation
          SET decision=$1, rationale=$2, evidence_uri=$3,
              reviewer_id=$4, decided_at=now(), updated_at=now()
        WHERE attestation_id=$5 AND cycle_id=$6 AND tenant_id=$7
          AND decision='pending'
        RETURNING *`,
      [
        body.decision, body.rationale ?? null, body.evidence_uri ?? null,
        req.user!.userId, req.params.attId, req.params.cycleId, req.tenantId!,
      ],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found_or_already_decided' });
      return;
    }
    setAuditData(res, {
      entityId: req.params.attId,
      entityType: 'sod_review_attestation',
      action: `decide:${body.decision}`,
    });
    res.json({ success: true, data: result.rows[0] });
  }),
);

export { router as sodReviewRouter };
