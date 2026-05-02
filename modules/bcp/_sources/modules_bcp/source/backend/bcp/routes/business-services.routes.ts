import { Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  createBusinessService, getBusinessServices, getServiceById, updateBusinessService,
  getServiceDependencyGraph, linkServiceToBIA, getServiceImpactSummary,
} from '../services/business-services.service';
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createServiceBody, updateServiceBody, linkBiaBody } from "../schemas/bcp.schemas";
import { safeQuery } from "@dos/db";

const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware("bcp"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event, entityType, entityId, data } as any)), { tenantId: req.tenantId!, operation: `grcEvent:bcp.${entityType}.${event}` });

router.get("/", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const services = await getBusinessServices(req.tenantId!, {
    category: req.query.category as string,
    criticality: req.query.criticality as string,
    status: req.query.status as string,
  });
  res.json({ services, count: services.length });
}));

router.get("/:serviceId", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const service = await getServiceById(req.tenantId!, req.params.serviceId);
  if (!service) { res.status(404).json({ error: "Business service not found" }); return; }
  res.json(service);
}));

router.post("/", authenticate, requirePermission("bcp.plan.write"), validate({ body: createServiceBody }), asyncHandler(async (req, res) => {
  const service = await createBusinessService(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "business_service", entityId: service.service_id, afterState: service });
  emit(req, "created", "business_service", service.service_id, req.body);
  res.status(201).json(service);
}));

router.put("/:serviceId", authenticate, requirePermission("bcp.plan.write"), validate({ body: updateServiceBody }), asyncHandler(async (req, res) => {
  const before = await getServiceById(req.tenantId!, req.params.serviceId);
  const service = await updateBusinessService(req.tenantId!, req.params.serviceId, req.body);
  if (!service) { res.status(404).json({ error: "Business service not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "business_service", entityId: req.params.serviceId, beforeState: before, afterState: service });
  emit(req, "updated", "business_service", req.params.serviceId, req.body);
  res.json(service);
}));

router.get("/:serviceId/dependencies", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const graph = await getServiceDependencyGraph(req.tenantId!, req.params.serviceId);
  if (!graph.service) { res.status(404).json({ error: "Business service not found" }); return; }
  res.json(graph);
}));

router.post("/:serviceId/link-bia", authenticate, requirePermission("bcp.plan.write"), validate({ body: linkBiaBody }), asyncHandler(async (req, res) => {
  const service = await linkServiceToBIA(req.tenantId!, req.params.serviceId, req.body.bia_id);
  if (!service) { res.status(404).json({ error: "Business service not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "business_service", entityId: req.params.serviceId, afterState: service });
  res.json(service);
}));

router.get("/:serviceId/impact-summary", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const summary = await getServiceImpactSummary(req.tenantId!, req.params.serviceId);
  if (!summary.service) { res.status(404).json({ error: "Business service not found" }); return; }
  res.json(summary);
}));

export default router;

