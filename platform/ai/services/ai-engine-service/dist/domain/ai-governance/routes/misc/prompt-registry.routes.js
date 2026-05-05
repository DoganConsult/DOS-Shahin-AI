// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '../../ports/auth.port';
import { listAssets, } from '../../services/ai/registry/ai-asset-inventory.service';
import { toErrorMessage } from '@dos/module-sdk';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { createDraftPromptVersion, updateDraftPromptVersion, submitPromptVersionForApproval, approvePromptVersion, rejectPromptVersion, activatePromptVersion, suspendPromptVersion, retirePromptVersion, rollbackPromptVersion, listPromptVersions, getPromptVersionById, getActivePromptVersionForAsset, deletePromptVersion, } from '../../services/misc/prompt-registry.service';
import { createVersionsBody, updateVersionsBody, createSubmitBody, createApproveBody, createRejectBody, createActivateBody, createSuspendBody, createRetireBody, createRollbackBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
const VALID_APPROVAL = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'retired', 'archived'];
const VALID_DEPLOYMENT = ['not_deployed', 'staging', 'canary', 'production', 'rollback', 'decommissioned'];
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;
router.get("/assets", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const result = await listAssets(tenantId, {
        asset_type: 'prompt',
        limit,
        offset,
    });
    res.json({
        assets: result.assets,
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
    });
}));
router.get("/versions", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const q = { limit, offset };
    if (req.query.asset_id)
        q.asset_id = req.query.asset_id;
    if (req.query.approval_status) {
        if (!VALID_APPROVAL.includes(req.query.approval_status)) {
            res.status(400).json({ error: `Invalid approval_status. Allowed: ${VALID_APPROVAL.join(', ')}` });
            return;
        }
        q.approval_status = req.query.approval_status;
    }
    if (req.query.deployment_status) {
        if (!VALID_DEPLOYMENT.includes(req.query.deployment_status)) {
            res.status(400).json({ error: `Invalid deployment_status. Allowed: ${VALID_DEPLOYMENT.join(', ')}` });
            return;
        }
        q.deployment_status = req.query.deployment_status;
    }
    if (req.query.is_active !== undefined) {
        q.is_active = req.query.is_active === 'true';
    }
    if (req.query.linked_model_asset_id) {
        q.linked_model_asset_id = req.query.linked_model_asset_id;
    }
    const result = await listPromptVersions(tenantId, q);
    res.json({
        versions: result.versions,
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
    });
}));
router.get("/versions/active/:assetId", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const version = await getActivePromptVersionForAsset(tenantId, req.params.assetId);
    if (!version) {
        res.status(404).json({ error: "No active version found for this asset" });
        return;
    }
    res.json(version);
}));
router.get("/versions/:versionId", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const version = await getPromptVersionById(tenantId, req.params.versionId);
    if (!version) {
        res.status(404).json({ error: "Prompt version not found" });
        return;
    }
    res.json(version);
}));
router.post("/versions", authenticate, requirePermission("ai.governance.write"), validate({ body: createVersionsBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { asset_id, template_text, variables, linked_model_asset_id, change_summary, notes } = req.body;
        if (!asset_id || !template_text) {
            res.status(400).json({ error: "asset_id and template_text are required" });
            return;
        }
        const version = await createDraftPromptVersion(tenantId, {
            asset_id,
            template_text,
            variables,
            linked_model_asset_id,
            change_summary,
            notes,
            created_by: userId,
        });
        setAuditData(res, { action: "create", entityType: "prompt_version", entityId: version.prompt_version_id, afterState: version });
        res.status(201).json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('Parent asset not found') || toErrorMessage(err).includes('asset_type=prompt')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Linked model asset not found') || toErrorMessage(err).includes('asset_type=model')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.patch("/versions/:versionId", authenticate, requirePermission("ai.governance.write"), validate({ body: updateVersionsBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const allowed = ['template_text', 'variables', 'linked_model_asset_id', 'change_summary', 'notes'];
        const updateInput = { updated_by: userId };
        for (const key of allowed) {
            if (req.body[key] !== undefined)
                updateInput[key] = req.body[key];
        }
        const version = await updateDraftPromptVersion(tenantId, req.params.versionId, updateInput);
        setAuditData(res, { action: "update", entityType: "prompt_version", entityId: req.params.versionId, afterState: version });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only draft') || toErrorMessage(err).includes('Cannot update an active')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Linked model asset not found') || toErrorMessage(err).includes('asset_type=model')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/submit", authenticate, requirePermission("ai.governance.write"), validate({ body: createSubmitBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await submitPromptVersionForApproval(tenantId, req.params.versionId, userId);
        setAuditData(res, {
            action: "update", entityType: "prompt_version", entityId: req.params.versionId,
            afterState: { approval_status: version.approval_status },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only draft or rejected') || toErrorMessage(err).includes('Seeded global prompts are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/approve", authenticate, requireAnyPermission("ai.prompt.approve", "ai.agent.approve"), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await approvePromptVersion(tenantId, req.params.versionId, userId);
        setAuditData(res, {
            action: "update", entityType: "prompt_version", entityId: req.params.versionId,
            afterState: { approval_status: version.approval_status, approved_by: userId },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Separation of Duties')) {
            res.status(403).json({ error: toErrorMessage(err), reason: 'sod_conflict' });
            return;
        }
        if (toErrorMessage(err).includes('Only pending_approval') || toErrorMessage(err).includes('Seeded global prompts are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/reject", authenticate, requireAnyPermission("ai.prompt.approve", "ai.agent.approve"), validate({ body: createRejectBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await rejectPromptVersion(tenantId, req.params.versionId, userId, req.body.notes);
        setAuditData(res, {
            action: "update", entityType: "prompt_version", entityId: req.params.versionId,
            afterState: { approval_status: version.approval_status },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only pending_approval') || toErrorMessage(err).includes('Seeded global prompts are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/activate", authenticate, requirePermission("ai_governance.manage"), validate({ body: createActivateBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { activated, deactivated } = await activatePromptVersion(tenantId, req.params.versionId, userId);
        setAuditData(res, {
            action: "activate", entityType: "prompt_version", entityId: req.params.versionId,
            beforeState: deactivated ? { deactivated_version: deactivated.prompt_version_id } : null,
            afterState: { deployment_status: 'active', is_active: true },
        });
        res.json({ activated, deactivated });
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only approved') || toErrorMessage(err).includes('already active') ||
            toErrorMessage(err).includes('archived') || toErrorMessage(err).includes('missing required ownership') ||
            toErrorMessage(err).includes('Seeded global prompts are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/suspend", authenticate, requirePermission("ai_governance.manage"), validate({ body: createSuspendBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await suspendPromptVersion(tenantId, req.params.versionId, userId, req.body.notes);
        setAuditData(res, {
            action: "update", entityType: "prompt_version", entityId: req.params.versionId,
            afterState: { deployment_status: 'suspended' },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('not active') || toErrorMessage(err).includes('Seeded global prompts are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/retire", authenticate, requirePermission("ai_governance.manage"), validate({ body: createRetireBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await retirePromptVersion(tenantId, req.params.versionId, userId, req.body.notes);
        setAuditData(res, {
            action: "update", entityType: "prompt_version", entityId: req.params.versionId,
            afterState: { deployment_status: 'retired' },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('active version') || toErrorMessage(err).includes('draft version') || toErrorMessage(err).includes('pending_approval version')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Seeded global prompts are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:assetId/rollback", authenticate, requirePermission("ai_governance.manage"), validate({ body: createRollbackBody }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { target_version_id, notes } = req.body;
        if (!target_version_id) {
            res.status(400).json({ error: "target_version_id is required" });
            return;
        }
        const result = await rollbackPromptVersion(tenantId, req.params.assetId, target_version_id, userId, notes);
        setAuditData(res, {
            action: "update", entityType: "prompt_version", entityId: result.rollbackVersion.prompt_version_id,
            afterState: {
                deployment_status: 'active',
                rollback_from_version_id: target_version_id,
                version_number: result.rollbackVersion.version_number,
            },
        });
        res.json(result);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('does not belong') || toErrorMessage(err).includes('Only approved') || toErrorMessage(err).includes('archived')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.delete("/versions/:versionId", authenticate, requirePermission("ai_governance.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const deleted = await deletePromptVersion(tenantId, req.params.versionId, userId);
        if (!deleted) {
            res.status(404).json({ error: "Prompt version not found" });
            return;
        }
        setAuditData(res, { action: "delete", entityType: "prompt_version", entityId: req.params.versionId });
        res.json({ deleted: true, prompt_version_id: req.params.versionId });
    }
    catch (err) {
        if (toErrorMessage(err).includes('active version')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(500).json({ error: toErrorMessage(err) });
    }
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=prompt-registry.routes.js.map