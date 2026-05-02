// @ts-nocheck
import { Request as _Request, Response as _Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  createAsset,
  getAssetById,
  getAssetByKey,
  updateAsset,
  listAssets,
  deleteAsset,
  getLifecycleTransitions,
  type AssetType,
  type ScopeType,
  type LifecycleStatus,
  type AssetStatus,
  type SourceType,
} from '../../services/ai/registry/ai-asset-inventory.service';
import { discoverAndSeedAssets } from '../../runtime/ai/services/governance/compliance/ai-asset-discovery.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, requireOwnership, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { rootPostBody as _rootPostBody, idPatchBody as _idPatchBody, idTransitionPostBody as _idTransitionPostBody, discoverPostBody as _discoverPostBody, createAiGovernanceBody, updateAiGovernanceBody, createTransitionBody, createDiscoverBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));

const VALID_ASSET_TYPES: AssetType[] = ['agent', 'model', 'prompt', 'tool', 'provider', 'workflow', 'binding'];
const VALID_SCOPE_TYPES: ScopeType[] = ['global', 'tenant'];
const VALID_LIFECYCLE: LifecycleStatus[] = ['draft', 'review', 'approved', 'active', 'deprecated', 'archived'];
const VALID_STATUS: AssetStatus[] = ['enabled', 'disabled', 'suspended'];
const VALID_SOURCE: SourceType[] = ['seeded', 'discovered', 'manual', 'system'];
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;

function isSeededGlobal(asset: { scope_type: string; source_type: string }): boolean {
  return asset.scope_type === 'global' && asset.source_type === 'seeded';
}

router.get(
  "/",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const q: Record<string, unknown> = { limit, offset };
    if (req.query.asset_type) {
    if (!VALID_ASSET_TYPES.includes(req.query.asset_type as AssetType)) {
    res.status(400).json({ error: `Invalid asset_type. Allowed: ${VALID_ASSET_TYPES.join(', ')}` }); return;
    }
    q.asset_type = req.query.asset_type;
    }
    if (req.query.scope_type) {
    if (!VALID_SCOPE_TYPES.includes(req.query.scope_type as ScopeType)) {
    res.status(400).json({ error: `Invalid scope_type. Allowed: ${VALID_SCOPE_TYPES.join(', ')}` }); return;
    }
    q.scope_type = req.query.scope_type;
    }
    if (req.query.lifecycle_status) {
    if (!VALID_LIFECYCLE.includes(req.query.lifecycle_status as LifecycleStatus)) {
    res.status(400).json({ error: `Invalid lifecycle_status. Allowed: ${VALID_LIFECYCLE.join(', ')}` }); return;
    }
    q.lifecycle_status = req.query.lifecycle_status;
    }
    if (req.query.status) {
    if (!VALID_STATUS.includes(req.query.status as AssetStatus)) {
    res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUS.join(', ')}` }); return;
    }
    q.status = req.query.status;
    }
    if (req.query.source_type) {
    if (!VALID_SOURCE.includes(req.query.source_type as SourceType)) {
    res.status(400).json({ error: `Invalid source_type. Allowed: ${VALID_SOURCE.join(', ')}` }); return;
    }
    q.source_type = req.query.source_type;
    }
    if (req.query.tag) q.tag = req.query.tag;
    if (req.query.search) q.search = req.query.search;

    const result = await listAssets(tenantId, q);
    res.json({
    assets: result.assets,
    total: result.total,
    limit,
    offset,
    hasMore: offset + limit < result.total,
    });
  }),
);

router.get(
  "/lookup",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { asset_type, asset_key, scope_type } = req.query;
    if (!asset_type || !asset_key) {
    res.status(400).json({ error: "asset_type and asset_key are required query params" }); return;
    }
    if (!VALID_ASSET_TYPES.includes(asset_type as AssetType)) {
    res.status(400).json({ error: `Invalid asset_type. Allowed: ${VALID_ASSET_TYPES.join(', ')}` }); return;
    }
    const asset = await getAssetByKey(tenantId, asset_type as AssetType, asset_key as string, scope_type as ScopeType | undefined);
    if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json(asset);
  }),
);

router.get(
  "/:id",
  authenticate,
  requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const asset = await getAssetById(tenantId, req.params.id);
    if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
    const transitions = getLifecycleTransitions(asset.lifecycle_status as LifecycleStatus);
    res.json({ ...asset, allowed_transitions: transitions });
  }),
);

router.post(
  "/",
  authenticate,
  requirePermission("ai.governance.write"),
  validate({ body: createAiGovernanceBody }),
  asyncHandler(async (req, res) => {
    try {
    const tenantId = req.tenantId;
    const userId = req.user!.userId;
    const { asset_type, asset_key, display_name, description, scope_type, lifecycle_status, status, business_owner, technical_owner, governance_owner, source_type, source_ref, metadata, tags } = req.body;

    if (!asset_type || !asset_key || !display_name) {
    res.status(400).json({ error: "asset_type, asset_key, and display_name are required" }); return;
    }

    if (scope_type === 'global') {
    res.status(403).json({ error: "Tenant admins cannot create global-scoped assets. Global assets are platform-seeded only." }); return;
    }

    const asset = await createAsset(tenantId, {
    asset_type, asset_key, display_name, description,
    scope_type: 'tenant',
    lifecycle_status: lifecycle_status || 'draft',
    status: status || 'enabled',
    business_owner, technical_owner, governance_owner,
    source_type: source_type || 'manual',
    source_ref, metadata, tags,
    created_by: userId,
    });

    setAuditData(res as any, { action: "create", entityType: "ai_asset", entityId: asset.asset_id, afterState: asset });
    res.status(201).json(asset);
    } catch (err: unknown) {
    if (toErrorMessage(err).includes('uq_ai_asset_scope') || toErrorMessage(err).includes('duplicate key')) {
    res.status(409).json({ error: "Asset with this scope+type+key already exists" }); return;
    }
    res.status(400).json({ error: toErrorMessage(err) });
    }
  }),
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("ai.governance.write"),
  requireOwnership('ai_asset'),
  validate({ body: updateAiGovernanceBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user!.userId;

    const existing = await getAssetById(tenantId, req.params.id);
    if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

    if (isSeededGlobal(existing)) {
    res.status(403).json({ error: "Cannot modify seeded global assets. These are platform-managed." }); return;
    }

    const { lifecycle_status, ...rest } = req.body;
    if (lifecycle_status) {
    res.status(400).json({ error: "Use POST /:id/transition to change lifecycle status. Do not include lifecycle_status in PATCH." }); return;
    }

    const allowed = ['display_name', 'description', 'status', 'business_owner', 'technical_owner', 'governance_owner', 'source_ref', 'metadata', 'tags'];
    const updateInput: Record<string, unknown> = { updated_by: userId };
    for (const key of allowed) {
    if (rest[key] !== undefined) updateInput[key] = rest[key];
    }

    const updated = await updateAsset(tenantId, req.params.id, updateInput);
    if (!updated) { res.status(404).json({ error: "Asset not found" }); return; }

    setAuditData(res as any, { action: "update", entityType: "ai_asset", entityId: req.params.id, beforeState: existing, afterState: updated });
    res.json(updated);
  }),
);

router.post(
  "/:id/transition",
  authenticate,
  requirePermission("ai_governance.manage"),
  requireOwnership('ai_asset'),
  validate({ body: createTransitionBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user!.userId;

    const existing = await getAssetById(tenantId, req.params.id);
    if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

    if (isSeededGlobal(existing)) {
    res.status(403).json({ error: "Cannot transition seeded global assets. These are platform-managed." }); return;
    }

    const { target_status } = req.body;
    if (!target_status) {
    res.status(400).json({ error: "target_status is required" }); return;
    }
    if (!VALID_LIFECYCLE.includes(target_status as LifecycleStatus)) {
    res.status(400).json({ error: `Invalid target_status. Allowed: ${VALID_LIFECYCLE.join(', ')}` }); return;
    }

    const allowed = getLifecycleTransitions(existing.lifecycle_status as LifecycleStatus);
    if (!allowed.includes(target_status as LifecycleStatus)) {
    res.status(422).json({
    error: `Invalid lifecycle transition: '${existing.lifecycle_status}' → '${target_status}'`,
    current: existing.lifecycle_status,
    allowed_transitions: allowed,
    }); return;
    }

    const updated = await updateAsset(tenantId, req.params.id, {
    lifecycle_status: target_status as LifecycleStatus,
    updated_by: userId,
    });

    setAuditData(res as any, {
    action: "update",
    entityType: "ai_asset",
    entityId: req.params.id,
    beforeState: { lifecycle_status: existing.lifecycle_status },
    afterState: { lifecycle_status: target_status },
    });
    res.json({ ...updated, previous_status: existing.lifecycle_status, allowed_transitions: getLifecycleTransitions(target_status as LifecycleStatus) });
  }),
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("ai_governance.manage"),
  requireOwnership('ai_asset'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    try {
    const tenantId = req.tenantId;

    const existing = await getAssetById(tenantId, req.params.id);
    if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

    if (isSeededGlobal(existing)) {
    res.status(403).json({ error: "Cannot delete seeded global assets. These are platform-managed." }); return;
    }

    const deleted = await deleteAsset(tenantId, req.params.id);
    if (!deleted) { res.status(404).json({ error: "Asset not found" }); return; }

    setAuditData(res as any, { action: "delete", entityType: "ai_asset", entityId: req.params.id, beforeState: existing });
    res.json({ deleted: true, asset_id: req.params.id });
    } catch (err: unknown) {
    if (toErrorMessage(err).includes('active asset')) {
    res.status(422).json({ error: toErrorMessage(err) }); return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
    }
  }),
);

router.post(
  "/discover",
  authenticate,
  requirePermission("platform.system.admin"),
  validate({ body: createDiscoverBody }),
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const result = await discoverAndSeedAssets(tenantId);
    setAuditData(res as any, { action: "create", entityType: "ai_asset_discovery", entityId: tenantId, afterState: result.summary });
    res.json(result);
  }),
);

export default router;

let genericPayloadSchema = z.record(z.unknown());
