import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Policy Coverage Routes
// API endpoints for policy-entity linkage and
// coverage gap analysis (controls, risks, obligations).
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack, injectScopeContext } from '../ports/middleware.port';
import { errMsg } from '../../../i18n/error-messages';
import { safeQuery, tenantSchema } from '../ports/database.port';

import { createLinkBody } from '../schemas/policy.schemas';
import {
  getObligationCoverage,
  getCoverageAnalysis,
  getPolicyLinks,
  linkPolicyToControl,
  linkPolicyToRisk,
  linkPolicyToIssue,
  unlinkPolicyFromControl,
  unlinkPolicyFromRisk,
  unlinkPolicyFromIssue,
} from '../services/policy/policy-linkage.service';

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));
router.use(injectScopeContext);

/**
 * GET /obligations
 * Policy-obligation coverage analysis.
 * Returns obligations with their linked policy information.
 */
router.get('/obligations', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const coverage = await getObligationCoverage(tenantId);
  res.json({ obligations: coverage, count: coverage.length });
}));

/**
 * GET /controls
 * Policy-control coverage: policies with/without linked controls.
 */
router.get('/controls', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT gp.policy_id, gp.title, gp.status,
            COALESCE(pcl.link_count, 0)::int AS control_link_count,
            CASE WHEN pcl.link_count > 0 THEN true ELSE false END AS has_controls
     FROM "${schema}".policies gp
     LEFT JOIN (
       SELECT policy_id, COUNT(*)::int AS link_count
       FROM "${schema}".policy_control_links
       GROUP BY policy_id
     ) pcl ON pcl.policy_id = gp.policy_id
     WHERE gp.status NOT IN ('retired', 'archived')
     ORDER BY gp.title`,
    [],
  );

  res.json({ policies: result.rows, count: result.rows.length });
}));

/**
 * GET /risks
 * Policy-risk coverage: policies with/without linked risks.
 */
router.get('/risks', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT gp.policy_id, gp.title, gp.status,
            COALESCE(prl.link_count, 0)::int AS risk_link_count,
            CASE WHEN prl.link_count > 0 THEN true ELSE false END AS has_risks
     FROM "${schema}".policies gp
     LEFT JOIN (
       SELECT policy_id, COUNT(*)::int AS link_count
       FROM "${schema}".policy_risk_links
       GROUP BY policy_id
     ) prl ON prl.policy_id = gp.policy_id
     WHERE gp.status NOT IN ('retired', 'archived')
     ORDER BY gp.title`,
    [],
  );

  res.json({ policies: result.rows, count: result.rows.length });
}));

/**
 * GET /gaps
 * Coverage gaps analysis across all entity types.
 * Identifies policies without controls/risks and orphan controls/risks/obligations.
 */
router.get('/gaps', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const analysis = await getCoverageAnalysis(tenantId);
  res.json({ gaps: analysis });
}));

/**
 * POST /link
 * Create a link between a policy and another entity.
 * Body: { policyId, entityType: 'control'|'risk'|'issue', entityId,
 *         linkType?, relevanceScore?, notes? }
 */
router.post('/link', authenticate, requirePermission('policy.document.write'), validate({ body: createLinkBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }
  const { policyId, entityType, entityId, linkType, relevanceScore, notes } = req.body;

  if (!policyId || !entityType || !entityId) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  const linkData = { linkType, relevanceScore, notes, createdBy: userId };
  let result: Record<string, unknown>;

  switch (entityType) {
    case 'control':
      result = await linkPolicyToControl(tenantId, policyId, entityId, linkData);
      break;
    case 'risk':
      result = await linkPolicyToRisk(tenantId, policyId, entityId, linkData);
      break;
    case 'issue':
      result = await linkPolicyToIssue(tenantId, policyId, entityId, linkData);
      break;
    default:
      res.status(400).json({ error: `Invalid entityType: ${entityType}. Must be control, risk, or issue.` });
      return;
  }

  setAuditData(res as any, { action: 'create', entityType: `policy_${entityType}_link`, entityId: (result as Record<string, unknown>).link_id, afterState: result });
  res.status(201).json(result);
}));

/**
 * DELETE /link
 * Remove a link between a policy and another entity.
 * Body: { policyId, entityType, entityId }
 */
router.delete('/link', authenticate, requirePermission('policy.document.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const { policyId, entityType, entityId } = req.body;

  if (!policyId || !entityType || !entityId) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  const tenantId = req.tenantId!;
  let deleted = false;

  switch (entityType) {
    case 'control':
      deleted = await unlinkPolicyFromControl(tenantId, policyId, entityId);
      break;
    case 'risk':
      deleted = await unlinkPolicyFromRisk(tenantId, policyId, entityId);
      break;
    case 'issue':
      deleted = await unlinkPolicyFromIssue(tenantId, policyId, entityId);
      break;
    default:
      res.status(400).json({ error: `Invalid entityType: ${entityType}. Must be control, risk, or issue.` });
      return;
  }

  if (!deleted) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: 'delete', entityType: `policy_${entityType}_link`, entityId: `${policyId}:${entityId}` });
  res.json({ deleted: true });
}));

/**
 * GET /:policyId/links
 * Get all links for a specific policy across all entity types.
 */
router.get('/:policyId/links', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const links = await getPolicyLinks(tenantId, req.params.policyId);
  res.json({ links });
}));

export default router;

