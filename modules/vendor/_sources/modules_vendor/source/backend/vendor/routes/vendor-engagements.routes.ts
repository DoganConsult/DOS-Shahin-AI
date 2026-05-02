import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, setAuditData, moduleStack } from '../ports/middleware.port';

import { createVendorBody, updateVendorBody, createMilestonesBody, updateMilestonesBody } from '../schemas/vendor.schemas';

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendor_engagements"));

router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getEngagements } = await import("../services/vendor/vendor-engagements.service.js");
  const result = await getEngagements(req.tenantId!, {

    vendorId: req.query.vendor_id,

    status: req.query.status,
    page: req.query.page ? parseInt((req as any).query.page, 10) : undefined,
    pageSize: req.query.page_size ? parseInt((req as any).query.page_size, 10) : undefined,
  });
  res.json(result);
});

router.post("/", authenticate, requirePermission("vendor.record.write"), validate({ body: createVendorBody }), async (req: Request, res: Response) => {
  const { createEngagement } = await import("../services/vendor/vendor-engagements.service.js");
  const engagement = await createEngagement(req.tenantId!, { ...req.body, createdBy: req.userId! });
  setAuditData(res as any, { action: "create", entityType: "vendor_engagement", entityId: engagement?.engagement_id, afterState: engagement });
  res.status(201).json(engagement);
});

router.get("/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getEngagementById } = await import("../services/vendor/vendor-engagements.service.js");
  const engagement = await getEngagementById(req.tenantId!, req.params.id);
  if (!engagement) return res.status(404).json({ error: "Engagement not found" });
  res.json(engagement);
});

router.put("/:id", authenticate, requirePermission("vendor.record.write"), validate({ body: updateVendorBody }), async (req: Request, res: Response) => {
  const { updateEngagement } = await import("../services/vendor/vendor-engagements.service.js");
  const engagement = await updateEngagement(req.tenantId!, req.params.id, req.body);
  if (!engagement) return res.status(404).json({ error: "Engagement not found" });
  setAuditData(res as any, { action: "update", entityType: "vendor_engagement", entityId: req.params.id, afterState: engagement });
  res.json(engagement);
});

router.post("/:id/milestones", authenticate, requirePermission("vendor.record.write"), validate({ body: createMilestonesBody }), async (req: Request, res: Response) => {
  const { addMilestone } = await import("../services/vendor/vendor-engagements.service.js");
  const milestone = await addMilestone(req.tenantId!, req.params.id, { ...req.body, createdBy: req.userId! });
  setAuditData(res as any, { action: "create", entityType: "vendor_engagement_milestone", entityId: milestone?.milestone_id, afterState: milestone });
  res.status(201).json(milestone);
});

router.put("/milestones/:mid", authenticate, requirePermission("vendor.record.write"), validate({ body: updateMilestonesBody }), async (req: Request, res: Response) => {
  const { updateMilestone } = await import("../services/vendor/vendor-engagements.service.js");
  const milestone = await updateMilestone(req.tenantId!, req.params.mid, req.body);
  if (!milestone) return res.status(404).json({ error: "Milestone not found" });
  setAuditData(res as any, { action: "update", entityType: "vendor_engagement_milestone", entityId: req.params.mid, afterState: milestone });
  res.json(milestone);
});

export default router;

