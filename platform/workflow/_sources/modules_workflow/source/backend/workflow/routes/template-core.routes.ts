import { Router, Request, Response } from 'express';
import { z } from "zod";
import { asyncHandler } from '@dos/module-sdk';
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

const genericPayloadSchema = z.record(z.unknown());
import { validate } from "../ports/middleware.port";
const router = Router();

// ---------------------------------------------------------------------------
// GET /templates — list workflow templates
// ---------------------------------------------------------------------------
router.get('/', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const activeOnly = req.query['active'] !== 'false';
  const category = req.query['category'] as string | undefined;

  const result = await listTemplates({ tenantId, limit, offset, activeOnly, category });
  res.json({ data: result.data, total: result.total });
}));

// ---------------------------------------------------------------------------
// GET /templates/:id — get template by ID or code
// ---------------------------------------------------------------------------
router.get('/:id', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const idOrCode = req.params['id']!;
  const tenantId = req.headers['x-tenant-id'] as string | undefined;

  // Try UUID lookup first, fall back to template_code
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

// ---------------------------------------------------------------------------
// POST /templates — create template (from seed or manual)
// ---------------------------------------------------------------------------
router.post('/', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
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
    createdBy,
  });

  res.status(201).json({ data: template });
}));

// ---------------------------------------------------------------------------
// PUT /templates/:id — update template
// ---------------------------------------------------------------------------
router.put('/:id', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const { name, description, category, definition, parametersSchema, updatedBy } = req.body;

  const template = await updateTemplate(templateId, {
    name,
    description,
    category,
    definition,
    parametersSchema,
    updatedBy,
  });

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

// ---------------------------------------------------------------------------
// POST /templates/:id/deactivate — soft-delete template
// ---------------------------------------------------------------------------
router.post('/:id/deactivate', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const { updatedBy } = req.body;

  const template = await deactivateTemplate(templateId, updatedBy);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

// ---------------------------------------------------------------------------
// POST /templates/:id/activate — reactivate template
// ---------------------------------------------------------------------------
router.post('/:id/activate', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const { updatedBy } = req.body;

  const template = await activateTemplate(templateId, updatedBy);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ data: template });
}));

// ---------------------------------------------------------------------------
// GET /templates/:id/versions — list template versions
// ---------------------------------------------------------------------------
router.get('/:id/versions', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const versions = await getTemplateVersions(templateId);
  res.json({ data: versions });
}));

// ---------------------------------------------------------------------------
// POST /templates/:id/rollback — rollback to a previous version
// ---------------------------------------------------------------------------
router.post('/:id/rollback', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const { targetVersion, rolledBackBy } = req.body;

  if (!targetVersion || typeof targetVersion !== 'number') {
    res.status(400).json({ error: 'targetVersion (number) is required' });
    return;
  }

  const template = await rollbackToVersion(templateId, targetVersion, rolledBackBy);
  if (!template) {
    res.status(404).json({ error: 'Template or target version not found' });
    return;
  }

  res.json({ data: template });
}));

// ---------------------------------------------------------------------------
// POST /templates/:id/export — export template as portable JSON
// ---------------------------------------------------------------------------
router.post('/:id/export', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params['id']!;
  const template = await getTemplate(templateId);

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const serialized = serializeTemplate(template);
  res.json({ data: serialized });
}));

// ---------------------------------------------------------------------------
// POST /templates/import — import a serialized template
// ---------------------------------------------------------------------------
router.post('/import', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const { template: serialized, importedBy } = req.body;

  if (!serialized || !serialized.templateCode || !serialized.name || !serialized.definition) {
    res.status(400).json({ error: 'template object with templateCode, name, and definition is required' });
    return;
  }

  const imported = await importTemplate(serialized, tenantId, importedBy);
  res.status(201).json({ data: imported });
}));

export default router;

