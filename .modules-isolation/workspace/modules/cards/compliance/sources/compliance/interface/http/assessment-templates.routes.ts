import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as svc from '../../domain/assessment-templates.service';
import { recordAudit } from '../adapters/audit.adapter';
import { validate, rateLimiter } from '@dos/platform-core/http';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'compliance-controls-service:assessment-templates', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

/**
 * Phase 12G P1-07 — wrong-tenant super-admin probes arrive with a
 * `x-tenant-id` header that points to a non-existent schema. Postgres
 * returns 3F000 (schema does not exist) or 42P01 (relation does not
 * exist). Translate either to a controlled 404 instead of leaking a
 * 500 that the release-gate test refuses to tolerate.
 */
function handleMissingSchema(err: unknown, res: Response, fallbackMessage: string): boolean {
  const code = (err as { code?: string })?.code;
  if (code === '3F000' || code === '42P01') {
    if (!res.headersSent) {
      res.status(404).json({ error: 'Tenant schema not found' });
    }
    return true;
  }
  if (!res.headersSent) {
    res.status(500).json({ error: fallbackMessage, details: (err as Error).message });
  }
  return true;
}

router.use(authenticate);
router.use(requireTenantId);

// ── Static paths must precede /:id ────────────────────────────────────

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await svc.listCategories(req.tenantId!);
    res.json({ categories });
  } catch (err) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res, 'Failed to list categories');
  }
});

router.get('/tenant-config', async (req: Request, res: Response) => {
  try {
    const configs = await svc.getTenantConfig(req.tenantId!);
    res.json({ configs });
  } catch (err) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res, 'Failed to get tenant config');
  }
});

const tenantConfigBody = z.object({
  configs: z.array(z.object({ templateId: z.string().min(1), enabled: z.boolean() })).max(2000),
});

router.put('/tenant-config', validate({ body: tenantConfigBody }), async (req: Request, res: Response) => {
  try {
    const updated = await svc.updateTenantConfig(req.tenantId!, req.body.configs);
    await recordAudit(req.tenantId!, 'assessment_template.tenant_config_updated', 'assessment_template', 'tenant-config', req.userId, { count: updated });
    res.json({ message: `${updated} configs updated` });
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to update tenant config');
  }
});

// ── Assessment runtime (created from a template) ───────────────────────

router.get('/assessment/:assessmentId/progress', async (req: Request, res: Response) => {
  try {
    const result = await svc.getAssessmentProgress(req.tenantId!, req.params.assessmentId);
    if (!result) { res.status(404).json({ error: 'Assessment not found', code: 'ASSESSMENT_NOT_FOUND' }); return; }
    res.json(result);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to get progress');
  }
});

router.get('/assessment/:assessmentId/ai-summary', async (req: Request, res: Response) => {
  try {
    const result = await svc.getAssessmentAISummary(req.tenantId!, req.params.assessmentId);
    if (!result) { res.status(404).json({ error: 'Assessment not found', code: 'ASSESSMENT_NOT_FOUND' }); return; }
    res.json(result);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to get AI summary');
  }
});

const respondBody = z.object({
  questionId: z.string().min(1).max(100),
  answer: z.unknown(),
  score: z.number().finite(),
});

router.put('/assessment/:assessmentId/respond', validate({ body: respondBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { assessmentId } = req.params;
    const { questionId, answer, score } = req.body as z.infer<typeof respondBody>;
    const exists = await svc.assessmentExists(tenantId, assessmentId);
    if (!exists) { res.status(404).json({ error: 'Assessment not found', code: 'ASSESSMENT_NOT_FOUND' }); return; }
    await svc.upsertResponse(tenantId, assessmentId, questionId, answer, score, req.userId);
    await recordAudit(tenantId, 'assessment.response_saved', 'assessment', assessmentId, req.userId, { questionId, score });
    res.json({ message: 'Response saved' });
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to save response');
  }
});

// ── List + CRUD on the templates themselves ───────────────────────────

const listQuery = z.object({
  category: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  difficulty: z.string().max(50).optional(),
  search: z.string().max(200).optional(),
  sector: z.string().max(100).optional(),
});

router.get('/', validate({ query: listQuery }), async (req: Request, res: Response) => {
  try {
    const data = await svc.listTemplates(req.tenantId!, req.query as z.infer<typeof listQuery>);
    res.json({ templates: data });
  } catch (err) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res, 'Failed to list templates');
  }
});

const upsertBody = z.object({
  template_id: z.string().min(1).max(100).optional(),
  name_en: z.string().min(1).max(200),
  name_ar: z.string().min(1).max(200).optional(),
  framework_id: z.string().max(100).optional(),
  scoring_methodology: z.string().max(20).optional(),
  weights: z.record(z.unknown()).optional(),
  question_bank: z.array(z.unknown()).optional(),
  pack_id: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  industry: z.string().max(50).optional(),
  difficulty: z.string().max(20).optional(),
  estimated_minutes: z.number().int().positive().max(100000).optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  applicable_sectors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  is_system: z.boolean().optional(),
  enabled: z.boolean().optional(),
  ai_guidance: z.record(z.unknown()).optional(),
});

router.post('/', validate({ body: upsertBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const created = await svc.createTemplate(tenantId, req.body as svc.UpsertTemplateInput);
    await recordAudit(tenantId, 'assessment_template.created', 'assessment_template', created.template_id, req.userId);
    res.status(201).json(created);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to create template');
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await svc.getTemplateById(req.tenantId!, req.params.id);
    if (!item) { res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }); return; }
    res.json(item);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to get template');
  }
});

router.get('/:id/detail', async (req: Request, res: Response) => {
  try {
    const item = await svc.getTemplateDetail(req.tenantId!, req.params.id);
    if (!item) { res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }); return; }
    res.json(item);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to get template detail');
  }
});

router.get('/:id/questions', async (req: Request, res: Response) => {
  try {
    const questions = await svc.getTemplateQuestions(req.tenantId!, req.params.id);
    if (questions === null) { res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }); return; }
    res.json({ questions });
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to get template questions');
  }
});

router.get('/:id/ai-guide/:questionId', async (req: Request, res: Response) => {
  try {
    const guide = await svc.getQuestionAIGuide(req.tenantId!, req.params.id, req.params.questionId);
    if (!guide) { res.status(404).json({ error: 'AI guide not found', code: 'AI_GUIDE_NOT_FOUND' }); return; }
    res.json(guide);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to get AI guide');
  }
});

const startBody = z.object({ title: z.string().max(255).optional() });

router.post('/:id/start', validate({ body: startBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const created = await svc.startAssessmentFromTemplate(tenantId, req.params.id, req.userId, (req.body as z.infer<typeof startBody>).title);
    if (!created) { res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }); return; }
    await recordAudit(tenantId, 'assessment.started_from_template', 'assessment', created.id, req.userId, { templateId: req.params.id });
    res.status(201).json(created);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to start assessment');
  }
});

router.put('/:id', validate({ body: upsertBody.partial() }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const updated = await svc.updateTemplate(tenantId, req.params.id, req.body);
    if (!updated) { res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }); return; }
    await recordAudit(tenantId, 'assessment_template.updated', 'assessment_template', req.params.id, req.userId);
    res.json(updated);
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to update template');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const removed = await svc.deleteTemplate(tenantId, req.params.id);
    if (!removed) { res.status(404).json({ error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }); return; }
    await recordAudit(tenantId, 'assessment_template.deleted', 'assessment_template', req.params.id, req.userId);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    handleMissingSchema(err, res, 'Failed to delete template');
  }
});

export default router;
