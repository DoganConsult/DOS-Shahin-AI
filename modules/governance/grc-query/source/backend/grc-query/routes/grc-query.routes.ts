// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, validate, asyncHandler, setAuditData } from '../ports/grc-query.ports';
import * as service from '../services/grc-query.service';
import { getAiRecommendations as grcQueryAiRecommendations } from '../services/grc-query-ai.service';
import { UnifiedSearchSchema, FederatedSearchSchema, NlqSearchSchema, SaveQuerySchema } from '../schemas/grc-query.schemas';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
const genericRouteSchema = z.any();

const router = Router();

// §6: /api/grc-query/search
router.post('/search', authenticate, requirePermission('grc-query.read'), validate({ body: UnifiedSearchSchema }), asyncHandler(async (req: any, res: any) => {
  const result = await service.unifiedSearch(req.tenantId, req.user.id, req.body.query, req.body.limit, req.body.modules);
  res.json({ data: result });
}));

// §6: /api/grc-query/federated
router.post('/federated', authenticate, requirePermission('grc-query.read'), validate({ body: FederatedSearchSchema }), asyncHandler(async (req: any, res: any) => {
  const result = await service.federatedSearch(req.tenantId, req.user.id, req.body.queryDslJson, req.body.limit, req.body.modules);
  res.json({ data: result });
}));

// §6: /api/grc-query/nlq
router.post('/nlq', authenticate, requirePermission('grc-query.ai.use'), validate({ body: NlqSearchSchema }), asyncHandler(async (req: any, res: any) => {
  const result = await service.nlqSearch(req.tenantId, req.user.id, req.body.prompt, req.body.limit);
  res.json({ data: result });
}));

// §6: /api/grc-query/saved
router.get('/saved', authenticate, requirePermission('grc-query.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listSavedQueries(req.tenantId, req.user.id);
  res.json({ data });
}));

router.post('/saved', authenticate, requirePermission('grc-query.manage'), validate({ body: SaveQuerySchema }), asyncHandler(async (req: any, res: any) => {
  const query = await service.saveQuery(req.tenantId, req.user.id, req.body.name, req.body.queryDslJson, req.body.isPublic);
  setAuditData(res, { action: 'create', entityType: 'saved_query', entityId: query.id, afterState: query });
  res.status(201).json({ data: query });
}));

router.delete('/saved/:id', authenticate, requirePermission('grc-query.manage'), validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  setAuditData(res, { action: 'delete', entityType: 'saved_query', entityId: req.params.id });
  await service.deleteSavedQuery(req.tenantId, req.user.id, req.params.id);
  res.status(204).end();
}));

// W5: /insights — serves <app-ai-insight-panel> module='grc-query'
router.get('/insights', authenticate, requirePermission('grc-query.read'), asyncHandler(async (req: any, res: any) => {
  const recommendations = await grcQueryAiRecommendations(req.tenantId, (req.query ?? {}) as Record<string, unknown>);
  res.json({ recommendations, module: 'grc-query', generatedAt: new Date().toISOString() });
}));

export default router;

