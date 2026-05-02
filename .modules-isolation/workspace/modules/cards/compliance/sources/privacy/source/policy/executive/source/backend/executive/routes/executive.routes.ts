// @ts-nocheck
import { Router } from 'express';
import { z } from "zod";
import { authenticate, requirePermission, validate, asyncHandler, setAuditData } from '../ports/executive.ports';
import * as service from '../services/executive.service';
import { getAiRecommendations as executiveAiRecommendations } from '../services/executive-ai.service';
import { CreateBriefSchema, ApproveBriefSchema, CreateObjectiveSchema, UpdateObjectiveSchema, CreateAppetiteSchema } from '../schemas/executive.schemas';
const genericPayloadSchema = z.record(z.unknown());
const genericRouteSchema = z.any();

const router = Router();

// §6: /api/executive/briefs
router.get('/briefs', authenticate, requirePermission('executive.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listBriefs(req.tenantId);
  res.json({ data });
}));

router.post('/briefs', authenticate, requirePermission('executive.brief.manage'), validate({ body: CreateBriefSchema }), asyncHandler(async (req: any, res: any) => {
  const brief = await service.createBrief(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'executive_brief', entityId: brief.id, afterState: brief });
  res.status(201).json({ data: brief });
}));

router.patch('/briefs/:id/approve', authenticate, requirePermission('executive.brief.approve'), validate({ body: ApproveBriefSchema }), asyncHandler(async (req: any, res: any) => {
  const brief = await service.approveBrief(req.tenantId, req.params.id, req.user.id, req.body.status);
  setAuditData(res, { action: 'update', entityType: 'executive_brief', entityId: req.params.id, afterState: brief });
  res.json({ data: brief });
}));

// §6: /api/executive/objectives
router.get('/objectives', authenticate, requirePermission('executive.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listObjectives(req.tenantId);
  res.json({ data });
}));

router.post('/objectives', authenticate, requirePermission('executive.objective.manage'), validate({ body: CreateObjectiveSchema }), asyncHandler(async (req: any, res: any) => {
  const obj = await service.createObjective(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'executive_objective', entityId: obj.id, afterState: obj });
  res.status(201).json({ data: obj });
}));

router.patch('/objectives/:id', authenticate, requirePermission('executive.objective.manage'), validate({ body: UpdateObjectiveSchema }), asyncHandler(async (req: any, res: any) => {
  const obj = await service.updateObjective(req.tenantId, req.params.id, req.user.id, req.body);
  setAuditData(res, { action: 'update', entityType: 'executive_objective', entityId: req.params.id, afterState: obj });
  res.json({ data: obj });
}));

// §6: /api/executive/appetite
router.get('/appetite', authenticate, requirePermission('executive.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listAppetites(req.tenantId);
  res.json({ data });
}));

router.post('/appetite', authenticate, requirePermission('executive.appetite.manage'), validate({ body: CreateAppetiteSchema }), asyncHandler(async (req: any, res: any) => {
  const appetite = await service.createAppetite(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'executive_appetite', entityId: appetite.id, afterState: appetite });
  res.status(201).json({ data: appetite });
}));

router.post('/appetite/evaluate', authenticate, requirePermission('executive.appetite.manage'), validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  const result = await service.evaluateAppetiteBreaches(req.tenantId);
  setAuditData(res, { action: 'create', entityType: 'executive_appetite_evaluation', afterState: result });
  res.json({ data: result });
}));

// §6: /api/executive/diagnostics
router.get('/diagnostics', authenticate, requirePermission('executive.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.runDiagnostics(req.tenantId);
  res.json({ data });
}));

// W5: /api/executive/insights — serves <app-ai-insight-panel> module='executive'
router.get('/insights', authenticate, requirePermission('executive.read'), asyncHandler(async (req: any, res: any) => {
  const recommendations = await executiveAiRecommendations(req.tenantId, (req.query ?? {}) as Record<string, unknown>);
  res.json({ recommendations, module: 'executive', generatedAt: new Date().toISOString() });
}));

export default router;

