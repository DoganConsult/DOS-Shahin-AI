// @ts-nocheck
import { Request, Response, Router } from 'express';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, validate, setAuditData as _setAuditData } from '../../ports/middleware.port';
import {
  validateRiskAppetite,
  validateAuthorityMatrix,
  validateEscalationThresholds,
} from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { writeLimiter } from './shared';

import { createRiskAppetiteBody, createAuthorityMatrixBody, createEscalationThresholdsBody, createResolveApproverBody } from '../../schemas/agrc-engine.schemas';
import { validate } from '@dos/platform-core/http';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

router.get('/constitution', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('tenant.config.manage'), async (req: Request, res: Response) => {
  const { getConstitution } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await getConstitution(req.tenantId);
  res.json(result);
});

router.get('/risk-appetite', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('risk.record.read'), async (req: Request, res: Response) => {
  const { getRiskAppetite } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await getRiskAppetite(req.tenantId);
  res.json(result);
});

router.post('/risk-appetite', authenticate, requirePermission('tenant.config.manage'), writeLimiter, validateRiskAppetite, validate({ body: createRiskAppetiteBody }), async (req: Request, res: Response) => {
  const { upsertRiskAppetite } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await upsertRiskAppetite(req.tenantId, req.body);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.get('/authority-matrix', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('governance.record.read'), async (req: Request, res: Response) => {
  const { getAuthorityMatrix } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await getAuthorityMatrix(req.tenantId);
  res.json(result);
});

router.post('/authority-matrix', authenticate, requirePermission('tenant.config.manage'), writeLimiter, validateAuthorityMatrix, validate({ body: createAuthorityMatrixBody }), async (req: Request, res: Response) => {
  const { upsertAuthorityMatrix } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await upsertAuthorityMatrix(req.tenantId, req.body);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.get('/escalation-thresholds', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('governance.record.read'), async (req: Request, res: Response) => {
  const { getEscalationThresholds } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await getEscalationThresholds(req.tenantId);
  res.json(result);
});

router.post('/escalation-thresholds', authenticate, requirePermission('tenant.config.manage'), validateEscalationThresholds, validate({ body: createEscalationThresholdsBody }), async (req: Request, res: Response) => {
  const { upsertEscalationThresholds } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await upsertEscalationThresholds(req.tenantId, req.body);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.post('/resolve-approver', authenticate, requirePermission('risk.record.read'), validate({ body: createResolveApproverBody }), async (req: Request, res: Response) => {
  const { resolveApprover } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const { decisionType, criticality } = req.body;
  if (!decisionType || !criticality) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }
  const result = await resolveApprover(req.tenantId, decisionType, criticality);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result || { message: 'No authority rule found for this decision type and criticality' });
});

router.get('/constitution/validate', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.manage'), async (req: Request, res: Response) => {
  const { validateConstitution } = await import('../../../modules/governance/services/governance/governance-constitution.service');
  const result = await validateConstitution(req.tenantId);
  res.json(result);
});

export default router;

