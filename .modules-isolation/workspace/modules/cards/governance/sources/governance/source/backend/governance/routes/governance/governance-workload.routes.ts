import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../../ports/auth.port';
import * as workloadService from '../../services/governance/governance-workload.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { auditMiddleware, asyncHandler, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

router.get("/", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await workloadService.getWorkloadDashboard(req.tenantId);
  res.json(result);
}));

router.get("/owner/:ownerId", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await workloadService.getOwnerWorkload(req.tenantId, req.params.ownerId);
  res.json(result);
}));

export default router;
