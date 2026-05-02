import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// AGRC-OS — Control Admin Routes
// Admin settings, taxonomy management, and
// test template CRUD for the controls module.
// ============================================


import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, automationMiddleware, fieldRbacFilter, validate } from '../ports/middleware.port';
import { ControlAdminService } from "../services/control-admin.service";
import { updateSettingsBody, createFamilyBody, updateFamilyBody, createTestTemplateBody } from "../schemas/controls.schemas";

const router = Router();

/**
 * GET /api/controls/admin/settings
 *
 * Get admin settings: taxonomy config, test templates config,
 * scoring rules, and certification settings.
 */
router.get(
  "/settings",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlAdminService();
    const result = await svc.getSettings(tenantId);
    res.json(result);
  })
);

/**
 * PATCH /api/controls/admin/settings
 *
 * Update admin settings (partial update).
 */
router.patch(
  "/settings",
  authenticate,
  requirePermission("controls.admin"),
  validate({ body: updateSettingsBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const updatedBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlAdminService();
    const result = await svc.updateSettings(tenantId, req.body);
    setAuditData(res as any, { action: 'update', entityType: 'control_settings', entityId: tenantId, afterState: result });
    res.json(result);
  })
);

/**
 * GET /api/controls/admin/taxonomy
 *
 * Get the full control taxonomy: families, categories, and types.
 */
router.get(
  "/taxonomy",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlAdminService();
    const result = await svc.getTaxonomy(tenantId);
    res.json(result);
  })
);

/**
 * POST /api/controls/admin/taxonomy/families
 *
 * Create a new control family in the taxonomy.
 */
router.post(
  "/taxonomy/families",
  authenticate,
  requirePermission("controls.admin"),
  validate({ body: createFamilyBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const createdBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlAdminService();
    const result = await svc.createFamily(tenantId, req.body);
    setAuditData(res as any, { action: 'create', entityType: 'control_family', entityId: (result as any)?.id || 'new', afterState: result });
    res.status(201).json(result);
  })
);

/**
 * PUT /api/controls/admin/taxonomy/families/:id
 *
 * Update an existing control family.
 */
router.put(
  "/taxonomy/families/:id",
  authenticate,
  requirePermission("controls.admin"),
  validate({ body: updateFamilyBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const svc = new ControlAdminService();
    const result = await svc.updateFamily(tenantId, id, req.body);
    setAuditData(res as any, { action: 'update', entityType: 'control_family', entityId: id, afterState: result });
    res.json(result);
  })
);

/**
 * GET /api/controls/admin/test-templates
 *
 * List all test templates.
 */
router.get(
  "/test-templates",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlAdminService();
    const result = await svc.getTestTemplates(tenantId);
    res.json(result);
  })
);

/**
 * POST /api/controls/admin/test-templates
 *
 * Create a new test template.
 */
router.post(
  "/test-templates",
  authenticate,
  requirePermission("controls.admin"),
  validate({ body: createTestTemplateBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const createdBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlAdminService();
    const result = await svc.createTestTemplate(tenantId, req.body);
    setAuditData(res as any, { action: 'create', entityType: 'control_test_template', entityId: (result as any)?.id || 'new', afterState: result });
    res.status(201).json(result);
  })
);

export default router;

