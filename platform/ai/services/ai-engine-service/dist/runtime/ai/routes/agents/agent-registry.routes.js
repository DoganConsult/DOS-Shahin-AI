// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '../../ports/auth.port.js';
import { listAssets, } from '../../../ai-governance/services/ai/registry/ai-asset-inventory.service.js';
import { toErrorMessage } from '@dos/module-sdk';
import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { createDraftAgentVersion, updateDraftAgentVersion, submitAgentVersionForApproval, approveAgentVersion, rejectAgentVersion, activateAgentVersion, suspendAgentVersion, retireAgentVersion, rollbackAgentVersion, listAgentVersions, getAgentVersionById, getActiveAgentVersionForAsset, deleteAgentVersion, } from '../../services/agents/core/agent-registry.service.js';
import { z } from "zod";
// ── Zod Schemas ──────────────────────────────────────────────────────────
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware("ai-agent-registry"));
const VALID_APPROVAL = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'retired', 'archived'];
const VALID_DEPLOYMENT = ['not_deployed', 'staging', 'canary', 'production', 'rollback', 'decommissioned'];
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;
const createVersionBody = z.object({
    asset_id: z.string().min(1),
    agent_config: z.record(z.unknown()),
    linked_prompt_asset_id: z.string().min(1).optional(),
    linked_model_asset_id: z.string().min(1).optional(),
    capabilities: z.array(z.unknown()).optional(),
    change_summary: z.string().max(2000).optional(),
    notes: z.string().max(5000).optional(),
}).strict();
const updateVersionBody = z.object({
    agent_config: z.record(z.unknown()).optional(),
    linked_prompt_asset_id: z.string().min(1).nullable().optional(),
    linked_model_asset_id: z.string().min(1).nullable().optional(),
    capabilities: z.array(z.unknown()).optional(),
    change_summary: z.string().max(2000).optional(),
    notes: z.string().max(5000).optional(),
}).strict();
const emptyBody = z.object({}).strict();
const notesBody = z.object({ notes: z.string().max(5000).optional() }).strict();
const rollbackBody = z.object({
    target_version_id: z.string().min(1),
    notes: z.string().max(5000).optional(),
}).strict();
router.get("/assets", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const result = await listAssets(tenantId, {
        asset_type: 'agent',
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
router.get("/versions", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
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
    if (req.query.linked_prompt_asset_id) {
        q.linked_prompt_asset_id = req.query.linked_prompt_asset_id;
    }
    if (req.query.linked_model_asset_id) {
        q.linked_model_asset_id = req.query.linked_model_asset_id;
    }
    const result = await listAgentVersions(tenantId, q);
    res.json({
        versions: result.versions,
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
    });
}));
router.get("/versions/active/:assetId", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const version = await getActiveAgentVersionForAsset(tenantId, req.params.assetId);
    if (!version) {
        res.status(404).json({ error: "No active version found for this asset" });
        return;
    }
    res.json(version);
}));
router.get("/versions/:versionId", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const version = await getAgentVersionById(tenantId, req.params.versionId);
    if (!version) {
        res.status(404).json({ error: "Agent version not found" });
        return;
    }
    res.json(version);
}));
router.post("/versions", authenticate, requirePermission("ai.agent.write"), validate({ body: createVersionBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { asset_id, agent_config, linked_prompt_asset_id, linked_model_asset_id, capabilities, change_summary, notes } = req.body;
        if (!asset_id || !agent_config) {
            res.status(400).json({ error: "asset_id and agent_config are required" });
            return;
        }
        const version = await createDraftAgentVersion(tenantId, {
            asset_id,
            agent_config,
            linked_prompt_asset_id,
            linked_model_asset_id,
            capabilities,
            change_summary,
            notes,
            created_by: userId,
        });
        setAuditData(res, { action: "create", entityType: "agent_version", entityId: version.agent_version_id, afterState: version });
        res.status(201).json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('Parent asset not found') || toErrorMessage(err).includes('asset_type=agent') ||
            toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Linked prompt asset') || toErrorMessage(err).includes('Linked model asset') ||
            toErrorMessage(err).includes('asset_type=prompt') || toErrorMessage(err).includes('asset_type=model')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.patch("/versions/:versionId", authenticate, requirePermission("ai.agent.write"), validate({ body: updateVersionBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const allowed = ['agent_config', 'capabilities', 'linked_prompt_asset_id', 'linked_model_asset_id', 'change_summary', 'notes'];
        const updateInput = { updated_by: userId };
        for (const key of allowed) {
            if (req.body[key] !== undefined)
                updateInput[key] = req.body[key];
        }
        const version = await updateDraftAgentVersion(tenantId, req.params.versionId, updateInput);
        setAuditData(res, { action: "update", entityType: "agent_version", entityId: req.params.versionId, afterState: version });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only draft') || toErrorMessage(err).includes('Cannot update an active') ||
            toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Linked prompt asset') || toErrorMessage(err).includes('Linked model asset') ||
            toErrorMessage(err).includes('asset_type=prompt') || toErrorMessage(err).includes('asset_type=model')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/submit", authenticate, requirePermission("ai.agent.write"), validate({ body: emptyBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await submitAgentVersionForApproval(tenantId, req.params.versionId, userId);
        setAuditData(res, {
            action: "update", entityType: "agent_version", entityId: req.params.versionId,
            afterState: { approval_status: version.approval_status },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only draft or rejected') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/approve", authenticate, requireAnyPermission("ai.agent.approve", "ai.agent.approve"), validate({ body: emptyBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await approveAgentVersion(tenantId, req.params.versionId, userId);
        setAuditData(res, {
            action: "update", entityType: "agent_version", entityId: req.params.versionId,
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
        if (toErrorMessage(err).includes('Only pending_approval') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/reject", authenticate, requireAnyPermission("ai.agent.approve", "ai.agent.approve"), validate({ body: notesBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await rejectAgentVersion(tenantId, req.params.versionId, userId, req.body.notes);
        setAuditData(res, {
            action: "update", entityType: "agent_version", entityId: req.params.versionId,
            afterState: { approval_status: version.approval_status },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('Only pending_approval') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/activate", authenticate, requirePermission("ai.agent.manage"), validate({ body: emptyBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { activated, deactivated } = await activateAgentVersion(tenantId, req.params.versionId, userId);
        setAuditData(res, {
            action: "activate", entityType: "agent_version", entityId: req.params.versionId,
            beforeState: deactivated ? { deactivated_version: deactivated.agent_version_id } : null,
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
            toErrorMessage(err).includes('retired version') || toErrorMessage(err).includes('archived') ||
            toErrorMessage(err).includes('missing required ownership') ||
            toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/suspend", authenticate, requirePermission("ai.agent.manage"), validate({ body: notesBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await suspendAgentVersion(tenantId, req.params.versionId, userId, req.body.notes);
        setAuditData(res, {
            action: "update", entityType: "agent_version", entityId: req.params.versionId,
            afterState: { deployment_status: 'suspended' },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('not active') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:versionId/retire", authenticate, requirePermission("ai.agent.manage"), validate({ body: notesBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const version = await retireAgentVersion(tenantId, req.params.versionId, userId, req.body.notes);
        setAuditData(res, {
            action: "update", entityType: "agent_version", entityId: req.params.versionId,
            afterState: { deployment_status: 'retired' },
        });
        res.json(version);
    }
    catch (err) {
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('active version') || toErrorMessage(err).includes('draft version') ||
            toErrorMessage(err).includes('pending_approval version') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.post("/versions/:assetId/rollback", authenticate, requirePermission("ai.agent.manage"), validate({ body: rollbackBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { target_version_id, notes } = req.body;
        const result = await rollbackAgentVersion(tenantId, req.params.assetId, target_version_id, userId, notes);
        setAuditData(res, {
            action: "update", entityType: "agent_version", entityId: result.rollbackVersion.agent_version_id,
            afterState: {
                deployment_status: 'active',
                rollback_from_version_id: target_version_id,
                version_number: result.rollbackVersion.version_number,
            },
        });
        res.json(result);
    }
    catch (err) {
        if (toErrorMessage(err).includes('Linked prompt asset') || toErrorMessage(err).includes('Linked model asset') ||
            toErrorMessage(err).includes('does not belong') || toErrorMessage(err).includes('Only approved') ||
            toErrorMessage(err).includes('archived') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        if (toErrorMessage(err).includes('not found')) {
            res.status(404).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(400).json({ error: toErrorMessage(err) });
    }
}));
router.delete("/versions/:versionId", authenticate, requirePermission("ai.agent.write"), validate({ body: emptyBody, strict: true }), asyncHandler(async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const deleted = await deleteAgentVersion(tenantId, req.params.versionId, userId);
        if (!deleted) {
            res.status(404).json({ error: "Agent version not found" });
            return;
        }
        setAuditData(res, { action: "delete", entityType: "agent_version", entityId: req.params.versionId });
        res.json({ deleted: true, agent_version_id: req.params.versionId });
    }
    catch (err) {
        if (toErrorMessage(err).includes('active version') || toErrorMessage(err).includes('Seeded global agents are immutable')) {
            res.status(422).json({ error: toErrorMessage(err) });
            return;
        }
        res.status(500).json({ error: toErrorMessage(err) });
    }
}));
router.get("/governance/resolve/:agentId", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { resolveGovernedAgent } = await import('../../services/governance/agent-governance-bridge.service.js');
    const resolution = await resolveGovernedAgent(tenantId, req.params.agentId);
    res.json(resolution);
}));
router.get("/governance/mismatches", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { detectAllAgentMismatches, getEnforcementMode } = await import('../../services/governance/agent-governance-bridge.service.js');
    const mismatches = await detectAllAgentMismatches(tenantId);
    res.json({
        enforcement_mode: getEnforcementMode(),
        total: mismatches.length,
        mismatches,
    });
}));
export default router;
//# sourceMappingURL=agent-registry.routes.js.map