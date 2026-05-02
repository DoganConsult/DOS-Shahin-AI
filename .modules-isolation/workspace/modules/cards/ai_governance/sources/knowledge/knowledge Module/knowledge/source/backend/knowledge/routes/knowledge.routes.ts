import { Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// @ts-nocheck
import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { lifecycleGate, validate, asyncHandler } from '../ports/middleware.port';
import { CreateArticleSchema, UpdateArticleSchema, TransitionArticleSchema } from '../schemas/knowledge.schemas';
import * as knowledgeService from '../services/knowledge.service';
import { getAiRecommendations as knowledgeAiRecommendations } from '../services/knowledge-ai.service';
const genericRouteSchema = z.any();

const router = Router();

router.get('/', authenticate, requirePermission('knowledge.article.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const articles = await knowledgeService.listArticles(req.tenantId);
  res.json({ data: articles });
}));

router.get('/:id', authenticate, requirePermission('knowledge.article.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const article = await knowledgeService.getArticleById(req.tenantId, req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json({ data: article });
}));

router.post('/', authenticate, requirePermission('knowledge.article.write'), validate({ body: CreateArticleSchema }), asyncHandler(async (req: any, res: any) => {
  const article = await knowledgeService.createArticle(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'knowledge_article', entityId: (article as any).id || (article as any).articleId, afterState: article });
  res.status(201).json({ data: article });
}));

router.patch('/:id', authenticate, requirePermission('knowledge.article.write'), lifecycleGate('knowledge'), validate({ body: UpdateArticleSchema }), asyncHandler(async (req: any, res: any) => {
  const article = await knowledgeService.updateArticle(req.tenantId, req.params.id, { userId: req.user.id }, req.body);
  setAuditData(res, { action: 'update', entityType: 'knowledge_article', entityId: req.params.id, afterState: article });
  res.json({ data: article });
}));

router.post('/:id/transition', authenticate, requirePermission('knowledge.article.publish'), lifecycleGate('knowledge'), validate({ body: TransitionArticleSchema }), asyncHandler(async (req: any, res: any) => {
  const article = await knowledgeService.transitionStatus(req.tenantId, req.params.id, req.body.toStatus, { userId: req.user.id });
  setAuditData(res, { action: 'update', entityType: 'knowledge_article', entityId: req.params.id, afterState: article });
  res.json({ data: article });
}));

router.delete('/:id', authenticate, requirePermission('knowledge.article.archive'), lifecycleGate('knowledge'), validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  setAuditData(res, { action: 'delete', entityType: 'knowledge_article', entityId: req.params.id });
  await knowledgeService.deleteArticle(req.tenantId, req.params.id, { userId: req.user.id });
  res.status(204).send();
}));

// W5: /insights — serves <app-ai-insight-panel> module='knowledge'
router.get('/insights', authenticate, requirePermission('knowledge.article.read'), asyncHandler(async (req: any, res: any) => {
  const recommendations = await knowledgeAiRecommendations(req.tenantId, (req.query ?? {}) as Record<string, unknown>);
  res.json({ recommendations, module: 'knowledge', generatedAt: new Date().toISOString() });
}));

export default router;

