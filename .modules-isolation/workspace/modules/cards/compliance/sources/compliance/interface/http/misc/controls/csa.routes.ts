import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate } from '../../../../ports/auth.port';
import {
  createCSAQuestionnaire, listCSAQuestionnaires,
  submitCSAResponse, getCSAHeatmap, listCSAResponses,
} from '../../../services/misc/csa.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData as _setAuditData, asyncHandler, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { requirePermission } from "@dos/module-auth";
import { createQuestionnaireBody, submitResponseBody } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

/**
 * @openapi
 * /csa/questionnaires:
 *   post:
 *     tags: [CSA]
 *     summary: Create a Control Self-Assessment questionnaire
 *   get:
 *     tags: [CSA]
 *     summary: List CSA questionnaires
 */
router.post('/questionnaires', authenticate, requirePermission('compliance.program.manage'), validate({ body: createQuestionnaireBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { workspaceId, ...input } = req.body;
  const result = await createCSAQuestionnaire(tenantId, input, workspaceId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'csa', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:assessments.csa.created' });
  res.status(201).json(result);
}));

router.get('/questionnaires', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { controlId, workspaceId } = req.query as Record<string, string>;
  const data = await listCSAQuestionnaires(tenantId, controlId, workspaceId);
  res.json({ data });
}));

router.get('/questionnaires/:questionnaireId/responses', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await listCSAResponses(tenantId, req.params.questionnaireId);
  res.json({ data });
}));

/**
 * @openapi
 * /csa/responses:
 *   post:
 *     tags: [CSA]
 *     summary: Submit a CSA response
 */
router.post('/responses', authenticate, requirePermission('compliance.program.manage'), validate({ body: submitResponseBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { workspaceId, ...input } = req.body;
  if (!input.questionnaireId || !input.controlId || !input.respondentId || !input.period) {
  res.status(400).json({ error: 'questionnaireId, controlId, respondentId, period required' }); return;
  }
  const result = await submitCSAResponse(tenantId, input, workspaceId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'csa', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:assessments.csa.created' });
  res.json(result);
}));

/**
 * @openapi
 * /csa/heatmap:
 *   get:
 *     tags: [CSA]
 *     summary: Get CSA control heatmap (average scores per control)
 */
router.get('/heatmap', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { workspaceId } = req.query as Record<string, string>;
  const data = await getCSAHeatmap(tenantId, workspaceId);
  res.json({ data });
}));

export default router;

