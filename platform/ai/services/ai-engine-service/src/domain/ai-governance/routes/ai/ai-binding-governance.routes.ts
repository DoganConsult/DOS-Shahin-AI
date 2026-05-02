// @ts-nocheck
import { Request, Response as _Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage } from '@dos/module-sdk';

import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import {
  createAgentToolBinding,
  getAgentToolBindingById,
  updateAgentToolBinding,
  deleteAgentToolBinding,
  setAgentToolBindingEnabled,
  listAgentToolBindings,
  createTenantAllowlistEntry,
  getTenantAllowlistEntryById,
  updateTenantAllowlistEntry,
  deleteTenantAllowlistEntry,
  setTenantAllowlistEnabled,
  listTenantAllowlistEntries,
  backfillTenantAllowlistAssetRefs,
  getEnabledToolAssetIdsForAgent,
  getEnabledAllowlistForTenant,
  isAssetAllowlistedForTenant,
} from '../../services/ai/compliance/ai-binding-governance.service';
import { agentToolsPostBody as _agentToolsPostBody, agentToolsBindingIdPatchBody as _agentToolsBindingIdPatchBody, agentToolsBindingIdEnablePostBody as _agentToolsBindingIdEnablePostBody, agentToolsBindingIdDisablePostBody as _agentToolsBindingIdDisablePostBody, allowlistPostBody as _allowlistPostBody, allowlistAllowlistIdPatchBody as _allowlistAllowlistIdPatchBody, allowlistAllowlistIdEnablePostBody as _allowlistAllowlistIdEnablePostBody, allowlistAllowlistIdDisablePostBody as _allowlistAllowlistIdDisablePostBody, allowlistBackfillPostBody as _allowlistBackfillPostBody, createAgentToolsBody, updateAgentToolsBody, createEnableBody, createDisableBody, createAllowlistBody, updateAllowlistBody, createBackfillBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";

// ── Zod Schemas ──────────────────────────────────────────────────────────
import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));

const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;

function parsePagination(req: Request) {
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  return { limit, offset };
}

router.get(
  "/agent-tools",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { limit, offset } = parsePagination(req);

    const q: Record<string, unknown> = { limit, offset };
    if (req.query.agent_asset_id) q.agent_asset_id = req.query.agent_asset_id;
    if (req.query.tool_asset_id) q.tool_asset_id = req.query.tool_asset_id;
    if (req.query.is_enabled !== undefined) q.is_enabled = req.query.is_enabled === 'true';

    const result = await listAgentToolBindings(tenantId, q);
    res.json({ bindings: result.bindings, total: result.total, limit, offset, hasMore: offset + limit < result.total });
  }),
);

router.get(
  "/agent-tools/:bindingId",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const binding = await getAgentToolBindingById(tenantId, req.params.bindingId);
    if (!binding) { res.status(404).json({ error: "Agent tool binding not found" }); return; }
    res.json(binding);
  }),
);

router.post(
  "/agent-tools",
  authenticate,
  requirePermission("ai.governance.write"),
  validate({ body: createAgentToolsBody }),
  asyncHandler(async (req, res) => {
    try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { agent_asset_id, tool_asset_id, is_enabled, notes } = req.body;

    if (!agent_asset_id || !tool_asset_id) {
    res.status(422).json({ error: "agent_asset_id and tool_asset_id are required" }); return;
    }

    const binding = await createAgentToolBinding(tenantId, {
    agent_asset_id,
    tool_asset_id,
    is_enabled,
    notes,
    created_by: userId,
    });

    setAuditData(res as any, { action: "create", entityType: "agent_tool_binding", entityId: binding.binding_id, afterState: binding });
    res.status(201).json(binding);
    } catch (err: unknown) {
    if (toErrorMessage(err).includes('not found') || toErrorMessage(err).includes('asset_type=')) {
    res.status(422).json({ error: toErrorMessage(err) }); return;
    }
    if (((err as Record<string,any>)['code'] as string | undefined) === '23505') {
    res.status(422).json({ error: "Duplicate agent-tool binding already exists" }); return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
    }
  }),
);

router.patch(
  "/agent-tools/:bindingId",
  authenticate,
  requirePermission("ai.governance.write"),
  validate({ body: updateAgentToolsBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { is_enabled, notes } = req.body;

    const updated = await updateAgentToolBinding(tenantId, req.params.bindingId, {
    is_enabled,
    notes,
    updated_by: userId,
    });

    if (!updated) { res.status(404).json({ error: "Agent tool binding not found" }); return; }
    setAuditData(res as any, { action: "update", entityType: "agent_tool_binding", entityId: req.params.bindingId, afterState: updated });
    res.json(updated);
  }),
);

router.post(
  "/agent-tools/:bindingId/enable",
  authenticate,
  requirePermission("ai_governance.manage"),
  validate({ body: createEnableBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const result = await setAgentToolBindingEnabled(tenantId, req.params.bindingId, true, userId);
    if (!result) { res.status(404).json({ error: "Agent tool binding not found" }); return; }
    setAuditData(res as any, { action: "activate", entityType: "agent_tool_binding", entityId: req.params.bindingId, afterState: result });
    res.json(result);
  }),
);

router.post(
  "/agent-tools/:bindingId/disable",
  authenticate,
  requirePermission("ai_governance.manage"),
  validate({ body: createDisableBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const result = await setAgentToolBindingEnabled(tenantId, req.params.bindingId, false, userId);
    if (!result) { res.status(404).json({ error: "Agent tool binding not found" }); return; }
    setAuditData(res as any, { action: "update", entityType: "agent_tool_binding", entityId: req.params.bindingId, afterState: result });
    res.json(result);
  }),
);

router.delete(
  "/agent-tools/:bindingId",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const deleted = await deleteAgentToolBinding(tenantId, req.params.bindingId, userId);
    if (!deleted) { res.status(404).json({ error: "Agent tool binding not found" }); return; }
    setAuditData(res as any, { action: "delete", entityType: "agent_tool_binding", entityId: req.params.bindingId });
    res.json({ deleted: true });
  }),
);

router.get(
  "/allowlist",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { limit, offset } = parsePagination(req);

    const q: Record<string, unknown> = { limit, offset };
    if (req.query.asset_type) {
    if (!['provider', 'model'].includes(req.query.asset_type as string)) {
    res.status(422).json({ error: "Invalid asset_type. Allowed: provider, model" }); return;
    }
    q.asset_type = req.query.asset_type;
    }
    if (req.query.asset_id) q.asset_id = req.query.asset_id;
    if (req.query.is_enabled !== undefined) q.is_enabled = req.query.is_enabled === 'true';

    const result = await listTenantAllowlistEntries(tenantId, q);
    res.json({ entries: result.entries, total: result.total, limit, offset, hasMore: offset + limit < result.total });
  }),
);

router.get(
  "/allowlist/check/:assetId",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const allowed = await isAssetAllowlistedForTenant(tenantId, req.params.assetId);
    res.json({ asset_id: req.params.assetId, allowlisted: allowed });
  }),
);

router.get(
  "/allowlist/:allowlistId",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const entry = await getTenantAllowlistEntryById(tenantId, req.params.allowlistId);
    if (!entry) { res.status(404).json({ error: "Allowlist entry not found" }); return; }
    res.json(entry);
  }),
);

router.post(
  "/allowlist",
  authenticate,
  requirePermission("ai.governance.write"),
  validate({ body: createAllowlistBody }),
  asyncHandler(async (req, res) => {
    try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { asset_id, asset_type, is_enabled, notes, max_tokens_limit, temperature_limit } = req.body;

    if (!asset_id || !asset_type) {
    res.status(422).json({ error: "asset_id and asset_type are required" }); return;
    }

    const entry = await createTenantAllowlistEntry(tenantId, {
    asset_id,
    asset_type,
    is_enabled,
    notes,
    max_tokens_limit,
    temperature_limit,
    created_by: userId,
    });

    setAuditData(res as any, { action: "create", entityType: "tenant_allowlist", entityId: entry.allowlist_id, afterState: entry });
    res.status(201).json(entry);
    } catch (err: unknown) {
    if (toErrorMessage(err).includes('Invalid asset_type') || toErrorMessage(err).includes('not found') || toErrorMessage(err).includes('asset_type=')) {
    res.status(422).json({ error: toErrorMessage(err) }); return;
    }
    if (((err as Record<string,any>)['code'] as string | undefined) === '23505') {
    res.status(422).json({ error: "Duplicate allowlist entry already exists" }); return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
    }
  }),
);

router.patch(
  "/allowlist/:allowlistId",
  authenticate,
  requirePermission("ai.governance.write"),
  validate({ body: updateAllowlistBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { is_enabled, notes, max_tokens_limit, temperature_limit } = req.body;

    const updated = await updateTenantAllowlistEntry(tenantId, req.params.allowlistId, {
    is_enabled,
    notes,
    max_tokens_limit,
    temperature_limit,
    updated_by: userId,
    });

    if (!updated) { res.status(404).json({ error: "Allowlist entry not found" }); return; }
    setAuditData(res as any, { action: "update", entityType: "tenant_allowlist", entityId: req.params.allowlistId, afterState: updated });
    res.json(updated);
  }),
);

router.post(
  "/allowlist/:allowlistId/enable",
  authenticate,
  requirePermission("ai_governance.manage"),
  validate({ body: createEnableBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const result = await setTenantAllowlistEnabled(tenantId, req.params.allowlistId, true, userId);
    if (!result) { res.status(404).json({ error: "Allowlist entry not found" }); return; }
    setAuditData(res as any, { action: "activate", entityType: "tenant_allowlist", entityId: req.params.allowlistId, afterState: result });
    res.json(result);
  }),
);

router.post(
  "/allowlist/:allowlistId/disable",
  authenticate,
  requirePermission("ai_governance.manage"),
  validate({ body: createDisableBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const result = await setTenantAllowlistEnabled(tenantId, req.params.allowlistId, false, userId);
    if (!result) { res.status(404).json({ error: "Allowlist entry not found" }); return; }
    setAuditData(res as any, { action: "update", entityType: "tenant_allowlist", entityId: req.params.allowlistId, afterState: result });
    res.json(result);
  }),
);

router.delete(
  "/allowlist/:allowlistId",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const deleted = await deleteTenantAllowlistEntry(tenantId, req.params.allowlistId, userId);
    if (!deleted) { res.status(404).json({ error: "Allowlist entry not found" }); return; }
    setAuditData(res as any, { action: "delete", entityType: "tenant_allowlist", entityId: req.params.allowlistId });
    res.json({ deleted: true });
  }),
);

router.post(
  "/allowlist/backfill",
  authenticate,
  requirePermission("ai_governance.manage"),
  validate({ body: createBackfillBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    const result = await backfillTenantAllowlistAssetRefs(tenantId, userId);
    setAuditData(res as any, { action: "update", entityType: "tenant_allowlist_backfill", entityId: tenantId });
    res.json(result);
  }),
);

router.get(
  "/runtime/agent-tools/:agentAssetId",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const toolIds = await getEnabledToolAssetIdsForAgent(tenantId, req.params.agentAssetId);
    res.json({ agent_asset_id: req.params.agentAssetId, enabled_tool_asset_ids: toolIds });
  }),
);

router.get(
  "/runtime/allowlist",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const assetType = req.query.asset_type as 'provider' | 'model' | undefined;
    if (assetType && !['provider', 'model'].includes(assetType)) {
    res.status(422).json({ error: "Invalid asset_type. Allowed: provider, model" }); return;
    }
    const entries = await getEnabledAllowlistForTenant(tenantId, assetType);
    res.json({ entries, total: entries.length });
  }),
);

export default router;

let genericPayloadSchema = z.record(z.unknown());
