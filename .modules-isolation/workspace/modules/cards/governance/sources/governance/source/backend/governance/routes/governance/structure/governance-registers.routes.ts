import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Governance Registers Routes
// CRUD for governance registers (risk, control,
// policy, compliance, incident, asset, vendor,
// obligation, issue register types).
// Serves /api/governance/registers
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listRegisters, getRegisterById, createRegister,
  updateRegister, softDeleteRegister,
} from '../../../services/governance/governance-registers.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createRegisterBody = z.object({
  register_type: z.string().min(1),
  name_en: z.string().min(1),
}).passthrough();

const updateRegisterBody = z.object({}).passthrough();

import { asyncHandler, validate, requireOwnership, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

// GET / — List registers with optional filters
router.get("/", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const filters = {
  register_type: req.query.register_type as string | undefined,
  status: req.query.status as string | undefined,
  };
  const user = req.user!;
  const registers = await listRegisters(req.tenantId, filters, user ? { userId: user.userId, role: user.role } : undefined);
  res.json({ registers, count: registers.length });
}));

// GET /:id — Get register by ID
router.get("/:id", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const register = await getRegisterById(req.tenantId, req.params.id);
  res.json(register);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Register not found" ? 404 : 500).json({ error: toErrorMessage(err) });
  }
}));

// POST / — Create register
router.post("/", authenticate, requirePermission("governance.record.write"), validate({ body: createRegisterBody }), asyncHandler(async (req, res) => {
  const { register_type, name_en } = req.body;
  if (!register_type || !name_en) { res.status(400).json({ error: "register_type and name_en are required" }); return; }
  const register = await createRegister(req.tenantId, {
  ...req.body, created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: "create", entityType: "register", entityId: register.register_id, afterState: register });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_registers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_registers.created' });
  res.status(201).json(register);
}));

// PUT /:id — Update register
router.put("/:id", authenticate, requirePermission("governance.record.write"), validate({ body: updateRegisterBody }), requireOwnership("governance_register"), asyncHandler(async (req, res) => {
  try {
  const register = await updateRegister(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "register", entityId: req.params.id, afterState: register });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_registers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_registers.updated' });
  res.json(register);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Register not found" ? 404 : 500).json({ error: toErrorMessage(err) });
  }
}));

// DELETE /:id — Soft delete register
router.delete("/:id", authenticate, requirePermission("governance.record.delete"), requireOwnership("governance_register"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await softDeleteRegister(req.tenantId, req.params.id);
  if (!deleted) { res.status(404).json({ error: "Register not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "register", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_registers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_registers.deleted' });
  res.json({ deleted: true });
}));

export default router;

