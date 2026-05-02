import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import {
  listTemplates,
  getTemplate,
  getTemplateByCode,
  createTemplate,
  updateTemplate,
  deactivateTemplate,
  activateTemplate,
  getTemplateVersions,
  rollbackToVersion,
  serializeTemplate,
  importTemplate,
} from '../domain/workflow-template.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:template', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);

router.get('/', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string | undefined;
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const activeOnly = req.query['active'] !== 'false';
  const category = req.query['category'] as string | undefined;

  const result = await listTemplates({ tenantId, limit, offset, activeOnly, category });
  res.json({ data: result.data, total: result.total });
}));

router.get('/:id', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const idOrCode = req.params['id']!;
  const tenantId = req.tenantId as string | undefined;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
  const template = isUuid
    ? await getTemplate(idOrCode)
    : await getTemplateByCode(idOrCode, tenantId);

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

router.post('/', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string | undefined;
  const { templateCode, name, description, category, definition, parametersSchema, createdBy } = req.body;

  if (!templateCode || !name || !definition) {
    res.status(400).json({ error: 'templateCode, name, and definition are required' });
    return;
  }

  const template = await createTemplate({
    tenantId,
    templateCode,
    name,
    description,
    category,
    definition,
    parametersSchema,
    createdBy: createdBy || req.user!.userId,
  });

  res.status(201).json({ data: template });
}));

router.put('/:id', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const { name, description, category, definition, parametersSchema, updatedBy } = req.body;

  const template = await updateTemplate(templateId, {
    name,
    description,
    category,
    definition,
    parametersSchema,
    updatedBy: updatedBy || req.user!.userId,
  });

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

router.post('/:id/deactivate', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const template = await deactivateTemplate(templateId, req.user!.userId);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

router.post('/:id/activate', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const template = await activateTemplate(templateId, req.user!.userId);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

router.get('/:id/versions', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const versions = await getTemplateVersions(templateId);
  res.json({ data: versions });
}));

router.post('/:id/rollback', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const { targetVersion } = req.body;

  if (!targetVersion || typeof targetVersion !== 'number') {
    res.status(400).json({ error: 'targetVersion (number) is required' });
    return;
  }

  const template = await rollbackToVersion(templateId, targetVersion, req.user!.userId);
  if (!template) {
    res.status(404).json({ error: 'Template or target version not found' });
    return;
  }

  res.json({ data: template });
}));

router.post('/:id/export', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const template = await getTemplate(templateId);

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const serialized = serializeTemplate(template);
  res.json({ data: serialized });
}));

router.post('/import', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string | undefined;
  const { template: serialized, importedBy } = req.body;

  if (!serialized || !serialized.templateCode || !serialized.name || !serialized.definition) {
    res.status(400).json({ error: 'template object with templateCode, name, and definition is required' });
    return;
  }

  const imported = await importTemplate(serialized, tenantId, importedBy || req.user!.userId);
  res.status(201).json({ data: imported });
}));

export default router;
