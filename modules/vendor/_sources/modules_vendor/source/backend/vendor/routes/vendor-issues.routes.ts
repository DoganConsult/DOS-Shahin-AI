import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, setAuditData, moduleStack } from '../ports/middleware.port';

import { createIssuesBody, updateIssuesBody, createEscalateBody, createExceptionsBody, updateApproveBody, updateRejectBody } from '../schemas/vendor.schemas';

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendor_issues"));

router.get("/issues", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getIssues } = await import("../services/vendor/vendor-issues.service.js");
  const result = await getIssues(req.tenantId!, {

    vendorId: req.query.vendor_id,

    status: req.query.status,

    severity: req.query.severity,

    sourceType: req.query.source_type,
    page: req.query.page ? parseInt((req as any).query.page, 10) : undefined,
    pageSize: req.query.page_size ? parseInt((req as any).query.page_size, 10) : undefined,
  });
  res.json(result);
});

router.post("/issues", authenticate, requirePermission("vendor.record.write"), validate({ body: createIssuesBody }), async (req: Request, res: Response) => {
  const { createIssue } = await import("../services/vendor/vendor-issues.service.js");
  const issue = await createIssue(req.tenantId!, { ...req.body, createdBy: req.userId! });
  setAuditData(res as any, { action: "create", entityType: "vendor_issue", entityId: issue?.issue_id, afterState: issue });
  res.status(201).json(issue);
});

router.put("/issues/:id", authenticate, requirePermission("vendor.record.write"), validate({ body: updateIssuesBody }), async (req: Request, res: Response) => {
  const { updateIssue } = await import("../services/vendor/vendor-issues.service.js");
  const issue = await updateIssue(req.tenantId!, req.params.id, req.body);
  if (!issue) return res.status(404).json({ error: "Issue not found" });
  setAuditData(res as any, { action: "update", entityType: "vendor_issue", entityId: req.params.id, afterState: issue });
  res.json(issue);
});

router.post("/issues/:id/escalate", authenticate, requirePermission("vendor.record.write"), validate({ body: createEscalateBody }), async (req: Request, res: Response) => {
  const { escalateIssue } = await import("../services/vendor/vendor-issues.service.js");
  const issue = await escalateIssue(req.tenantId!, req.params.id, req.body.escalate_to || req.userId!, req.userId!);
  if (!issue) return res.status(404).json({ error: "Issue not found" });
  setAuditData(res as any, { action: "update", entityType: "vendor_issue", entityId: req.params.id, afterState: { escalated: true } });
  res.json(issue);
});

router.get("/exceptions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getExceptions } = await import("../services/vendor/vendor-issues.service.js");
  const result = await getExceptions(req.tenantId!, {

    vendorId: req.query.vendor_id,

    status: req.query.status,

    type: req.query.type,
  });
  res.json(result);
});

router.post("/exceptions", authenticate, requirePermission("vendor.record.write"), validate({ body: createExceptionsBody }), async (req: Request, res: Response) => {
  const { createException } = await import("../services/vendor/vendor-issues.service.js");
  const exception = await createException(req.tenantId!, { ...req.body, requestedBy: req.userId! });
  setAuditData(res as any, { action: "create", entityType: "vendor_exception", entityId: exception?.exception_id, afterState: exception });
  res.status(201).json(exception);
});

router.put("/exceptions/:id/approve", authenticate, requirePermission("vendor.record.manage"), validate({ body: updateApproveBody }), async (req: Request, res: Response) => {
  const { approveException } = await import("../services/vendor/vendor-issues.service.js");
  const exception = await approveException(req.tenantId!, req.params.id, req.userId!);
  if (!exception) return res.status(404).json({ error: "Exception not found" });
  setAuditData(res as any, { action: "update", entityType: "vendor_exception", entityId: req.params.id, afterState: { approved: true } });
  res.json(exception);
});

router.put("/exceptions/:id/reject", authenticate, requirePermission("vendor.record.manage"), validate({ body: updateRejectBody }), async (req: Request, res: Response) => {
  const { rejectException } = await import("../services/vendor/vendor-issues.service.js");
  const exception = await rejectException(req.tenantId!, req.params.id, req.userId!);
  if (!exception) return res.status(404).json({ error: "Exception not found" });
  setAuditData(res as any, { action: "update", entityType: "vendor_exception", entityId: req.params.id, afterState: { rejected: true } });
  res.json(exception);
});

export default router;

