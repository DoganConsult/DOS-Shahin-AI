import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Evidence Reuse & Linkage Routes
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { linkObjectBody, resolveDuplicateBody, createMarkReusableBody, evidenceLinkParams } from "../../schemas/evidence.schemas";

const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));
router.use(mutationEventHook('evidence'));

// GET /api/evidence/reuse/candidates — reusable evidence with link counts
router.get('/candidates', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getReusableEvidence } = await import('../../services/reporting/evidence-reuse.service.js');
    const items = await getReusableEvidence(req.user!.tenantId!);
    res.json({ items, count: items.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reuse/orphans — evidence with no links
router.get('/orphans', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { detectOrphans } = await import('../../services/reporting/evidence-reuse.service.js');
    const items = await detectOrphans(req.user!.tenantId!);
    res.json({ items, count: items.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reuse/duplicates — unresolved duplicate candidates
router.get('/duplicates', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getDuplicateCandidates } = await import('../../services/reporting/evidence-reuse.service.js');
    const items = await getDuplicateCandidates(req.user!.tenantId!);
    res.json({ items, count: items.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/reuse/duplicates/:id/resolve — resolve a duplicate
router.post('/duplicates/:id/resolve', authenticate, requirePermission('evidence.item.write'), validate({ body: resolveDuplicateBody }), async (req: Request, res: Response) => {
  try {
    const { resolveDuplicate } = await import('../../services/reporting/evidence-reuse.service.js');
    const result = await resolveDuplicate(req.user!.tenantId!, req.params.id, req.body.resolution, req.user!.userId!);
    setAuditData(res as any, { action: 'update', entityType: 'evidence_duplicate', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reuse/:id/links — get all links for evidence
router.get('/:id/links', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getEvidenceLinks } = await import('../../services/reporting/evidence-reuse.service.js');
    const links = await getEvidenceLinks(req.user!.tenantId!, req.params.id);
    res.json({ links, count: links.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/reuse/:id/link-object — link evidence to entity
router.post('/:id/link-object', authenticate, requirePermission('evidence.item.write'), validate({ body: linkObjectBody }), async (req: Request, res: Response) => {
  try {
    const { linkToObject } = await import('../../services/reporting/evidence-reuse.service.js');
    const result = await linkToObject(
      req.user!.tenantId!, req.params.id,
      req.body.objectType, req.body.objectId,
      req.body.linkType || 'supports', req.user!.userId!, req.body.notes
    );
    setAuditData(res as any, { action: 'create', entityType: 'evidence_link', entityId: req.params.id, afterState: result });
    res.status(201).json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// DELETE /api/evidence/reuse/:id/links/:linkId — remove link
router.delete('/:id/links/:linkId', authenticate, requirePermission('evidence.item.write'), validate({ params: evidenceLinkParams }), async (req: Request, res: Response) => {
  try {
    const { unlinkFromObject } = await import('../../services/reporting/evidence-reuse.service.js');
    await unlinkFromObject(req.user!.tenantId!, req.params.id, req.params.linkId);
    res.status(204).send();
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/reuse/:id/mark-reusable — set reusable flag
router.post('/:id/mark-reusable', authenticate, requirePermission('evidence.item.write'), validate({ body: createMarkReusableBody }), async (req: Request, res: Response) => {
  try {
    const { markAsReusable } = await import('../../services/reporting/evidence-reuse.service.js');
    const result = await markAsReusable(req.user!.tenantId!, req.params.id, req.user!.userId!);
    setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

