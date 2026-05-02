import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { createTemplateskeyPreviewBody, createTemplateskeyGenerateBody, createBulkgenerateBody, createSeedBody, createProcesspolicyIdInitBody, createProcesspolicyIdAdvanceBody, createMomBody, createMommomIdApproveBody, createGuidanceBody } from "../schemas/policy.schemas";

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));
router.use(automationMiddleware("policy"));

router.get('/templates', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('policy.document.read'), async (_req: Request, res: Response) => {
  const { getTemplates } = await import('../services/policy/policy-template.service.js');
  const templates = getTemplates();
  res.json({
    templates: templates.map(t => ({
      template_key: t.template_key,
      title_en: t.title_en,
      title_ar: t.title_ar,
      category: t.category,
      description_en: t.description_en,
      description_ar: t.description_ar,
      frameworks: t.frameworks,
      sectors: t.sectors,
      review_frequency: t.review_frequency,
      tags: t.tags,
      sort_order: t.sort_order,
      variables: t.variables,
    })),
    count: templates.length,
  });
});

router.get('/templates/:key', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getTemplateByKey } = await import('../services/policy/policy-template.service.js');
  const template = getTemplateByKey(req.params.key);
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
  res.json(template);
}));

router.get('/templates/category/:category', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getTemplatesByCategory } = await import('../services/policy/policy-template.service.js');
  const templates = getTemplatesByCategory(req.params.category);
  res.json({ templates, count: templates.length });
}));

router.get('/templates/framework/:framework', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getTemplatesByFramework } = await import('../services/policy/policy-template.service.js');
  const templates = getTemplatesByFramework(req.params.framework);
  res.json({ templates, count: templates.length });
}));

router.get('/templates/sector/:sectorId', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getTemplatesBySector } = await import('../services/policy/policy-template.service.js');
  const templates = getTemplatesBySector(req.params.sectorId);
  res.json({ templates, count: templates.length });
}));

router.post('/templates/:key/preview', authenticate, requirePermission('policy.document.read'), validate({ body: createTemplateskeyPreviewBody }), asyncHandler(async (req, res) => {
  const { generatePolicyFromTemplate } = await import('../services/policy/policy-template.service.js');
  const result = await generatePolicyFromTemplate(req.tenantId!, req.params.key, req.body.overrides);
  if (!result) { res.status(404).json({ error: 'Template not found' }); return; }
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(result);
}));

router.post('/templates/:key/generate', authenticate, requirePermission('policy.document.write'), validate({ body: createTemplateskeyGenerateBody }), asyncHandler(async (req, res) => {
  const { bulkGeneratePolicies } = await import('../services/policy/policy-template.service.js');
  const userId = req.user!.userId!;
  const result = await bulkGeneratePolicies(
  req.tenantId!, [req.params.key], userId, req.body.overrides,
  );
  setAuditData(res as any, { action: 'create', entityType: 'policy', entityId: result.policyIds[0], afterState: result });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(result);
}));

router.post('/bulk-generate', authenticate, requirePermission('policy.document.write'), validate({ body: createBulkgenerateBody }), asyncHandler(async (req, res) => {
  const { bulkGeneratePolicies } = await import('../services/policy/policy-template.service.js');
  const userId = req.user!.userId!;
  const keys = req.body.templateKeys || [];
  if (!Array.isArray(keys) || keys.length === 0) {
  res.status(400).json({ error: 'templateKeys array required' }); return;
  }
  const result = await bulkGeneratePolicies(req.tenantId!, keys, userId, req.body.overrides);
  setAuditData(res as any, { action: 'create', entityType: 'policy', afterState: result });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(result);
}));

router.post('/seed', authenticate, requirePermission('policy.document.write'), validate({ body: createSeedBody }), asyncHandler(async (req, res) => {
  const { seedPolicyTemplates } = await import('../services/policy/policy-template.service.js');
  const count = await seedPolicyTemplates(req.tenantId!);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ seeded: count });
}));

router.get('/context', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getTenantContext } = await import('../services/policy/policy-template.service.js');
  const ctx = await getTenantContext(req.tenantId!);
  res.json(ctx);
}));

router.get('/workflow/:policyId', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getPolicyWorkflowHistory } = await import('../services/policy/policy-template.service.js');
  const history = await getPolicyWorkflowHistory(req.tenantId!, req.params.policyId);
  res.json({ history, count: history.length });
}));

router.get('/process/:policyId', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getPolicyProcessSteps } = await import('../services/policy/policy-template.service.js');
  const steps = await getPolicyProcessSteps(req.tenantId!, req.params.policyId);
  res.json({ steps, count: steps.length });
}));

router.post('/process/:policyId/init', authenticate, requirePermission('policy.document.write'), validate({ body: createProcesspolicyIdInitBody }), asyncHandler(async (req, res) => {
  const { createPolicyWorkflowSteps } = await import('../services/policy/policy-template.service.js');
  const count = await createPolicyWorkflowSteps(req.tenantId!, req.params.policyId);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ created: count });
}));

router.post('/process/:policyId/advance', authenticate, requirePermission('policy.document.write'), validate({ body: createProcesspolicyIdAdvanceBody }), asyncHandler(async (req, res) => {
  const { advancePolicyStep } = await import('../services/policy/policy-template.service.js');
  const userId = req.user!.userId!;
  const { stepKey, action, notes } = req.body;
  if (!stepKey || !action) { res.status(400).json({ error: 'stepKey and action required' }); return; }
  const ok = await advancePolicyStep(req.tenantId!, req.params.policyId, stepKey, userId, action, notes);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ success: ok });
}));

router.get('/mom', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getMOMRecords } = await import('../services/policy/policy-template.service.js');
  const records = await getMOMRecords(req.tenantId!, {
  policyId: req.query.policyId as string,
  momType: req.query.momType as string,
  limit: parseInt(req.query.limit as string) || 50,
  });
  res.json({ records, count: records.length });
}));

router.post('/mom', authenticate, requirePermission('policy.document.write'), validate({ body: createMomBody }), asyncHandler(async (req, res) => {
  const { createMOMRecord } = await import('../services/policy/policy-template.service.js');
  const userId = req.user!.userId!;
  const record = await createMOMRecord(req.tenantId!, { ...req.body, createdBy: userId });
  if (!record) { res.status(500).json({ error: 'Failed to create MOM record' }); return; }

  setAuditData(res as any, { action: 'create', entityType: 'mom', entityId: record.mom_id, afterState: record });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(record);
}));

router.post('/mom/:momId/approve', authenticate, requirePermission('policy.document.write'), validate({ body: createMommomIdApproveBody }), asyncHandler(async (req, res) => {
  const { approveMOM } = await import('../services/policy/policy-template.service.js');
  const userId = req.user!.userId!;
  const ok = await approveMOM(req.tenantId!, req.params.momId, userId);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ success: ok });
}));

router.get('/mom/formats', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  const { MOM_FORMATS } = await import('../services/policy/policy-template.service.js');
  res.json({ formats: MOM_FORMATS });
});

router.get('/guidance', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getPolicyGuidance } = await import('../services/policy/policy-template.service.js');
  const guidance = await getPolicyGuidance(
  req.tenantId!,
  req.query.policyId as string,
  req.query.templateKey as string,
  );
  res.json({ guidance, count: guidance.length });
}));

router.post('/guidance', authenticate, requirePermission('policy.document.write'), validate({ body: createGuidanceBody }), asyncHandler(async (req, res) => {
  const { addPolicyGuidance } = await import('../services/policy/policy-template.service.js');
  const userId = req.user!.userId!;
  const record = await addPolicyGuidance(req.tenantId!, { ...req.body, createdBy: userId });
  if (!record) { res.status(500).json({ error: 'Failed to add guidance' }); return; }
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_template', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(record);
}));

export default router;

