import { Router } from 'express';
import { logger } from '../../ports/logger.port.js';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { getTenantEnforcementMode, setTenantEnforcementMode, } from '../../services/ai/operations/ai-governance-config.service.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getSoDPolicy, setSoDPolicy, VALID_SOD_POLICIES, VALID_REGISTRY_TYPES, } from '../../services/ai-governance-lifecycle.service.js';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { enforcementModePutBody, sodPolicyPutBody } from "../../schemas/ai-governance.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
const VALID_MODES = ["audit", "warn", "enforce"];
/**
 * GET /enforcement-mode
 * Returns the current tenant enforcement mode and list of valid modes.
 */
router.get("/enforcement-mode", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Missing tenant context" });
        }
        const mode = await getTenantEnforcementMode(tenantId);
        return res.json({ mode, valid_modes: VALID_MODES });
    }
    catch (err) {
        logger.error("[ai-governance-config] GET enforcement-mode error:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to retrieve enforcement mode" });
    }
});
/**
 * PUT /enforcement-mode
 * Updates the tenant enforcement mode. Body: { mode: 'audit' | 'warn' | 'enforce' }
 */
router.put("/enforcement-mode", authenticate, requirePermission("ai_governance.manage"), validate({ body: enforcementModePutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Missing tenant context" });
        }
        const { mode } = req.body ?? {};
        if (!mode || !VALID_MODES.includes(mode)) {
            return res.status(400).json({
                error: `Invalid enforcement mode. Must be one of: ${VALID_MODES.join(", ")}`,
                valid_modes: VALID_MODES,
            });
        }
        await setTenantEnforcementMode(tenantId, mode);
        setAuditData(res, {
            action: "update",
            entityType: "ai_governance_config",
            entityId: "enforcement_mode",
            afterState: { mode },
        });
        return res.json({ mode, valid_modes: VALID_MODES });
    }
    catch (err) {
        logger.error("[ai-governance-config] PUT enforcement-mode error:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to update enforcement mode" });
    }
});
router.get("/sod-policy", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Missing tenant context" });
        }
        const { registry_type } = req.query;
        const policy = await getSoDPolicy(tenantId, registry_type);
        return res.json({ policy, valid_policies: VALID_SOD_POLICIES, registry_type: registry_type || null, valid_registry_types: [...VALID_REGISTRY_TYPES] });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to retrieve SoD policy" });
    }
});
router.put("/sod-policy", authenticate, requirePermission("ai_governance.manage"), validate({ body: sodPolicyPutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Missing tenant context" });
        }
        const { policy, registry_type } = req.body ?? {};
        if (!policy || !VALID_SOD_POLICIES.includes(policy)) {
            return res.status(400).json({
                error: `Invalid SoD policy. Must be one of: ${VALID_SOD_POLICIES.join(", ")}`,
                valid_policies: VALID_SOD_POLICIES,
            });
        }
        await setSoDPolicy(tenantId, policy, registry_type);
        setAuditData(res, {
            action: "update",
            entityType: "ai_governance_config",
            entityId: registry_type ? `sod_policy_${registry_type}` : "sod_policy",
            afterState: { policy, registry_type: registry_type || null },
        });
        return res.json({ policy, valid_policies: VALID_SOD_POLICIES, registry_type: registry_type || null });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to update SoD policy" });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-governance-config.routes.js.map