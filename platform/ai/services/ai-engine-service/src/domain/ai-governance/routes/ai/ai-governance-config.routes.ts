import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { logger } from '../../ports/logger.port';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  getTenantEnforcementMode,
  setTenantEnforcementMode,
  type EnforcementMode,
} from '../../services/ai/operations/ai-governance-config.service';
import { toErrorMessage } from '@dos/module-sdk';
import {
  getSoDPolicy,
  setSoDPolicy,
  VALID_SOD_POLICIES,
  VALID_REGISTRY_TYPES,
  type SoDPolicy,
} from '../../services/ai-governance-lifecycle.service';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { enforcementModePutBody, sodPolicyPutBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));

const VALID_MODES: EnforcementMode[] = ["audit", "warn", "enforce"];

/**
 * GET /enforcement-mode
 * Returns the current tenant enforcement mode and list of valid modes.
 */
router.get(
  "/enforcement-mode", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Missing tenant context" });
      }

      const mode = await getTenantEnforcementMode(tenantId);
      return res.json({ mode, valid_modes: VALID_MODES });
    } catch (err: unknown) {
      logger.error("[ai-governance-config] GET enforcement-mode error:", toErrorMessage(err));
      return res.status(500).json({ error: "Failed to retrieve enforcement mode" });
    }
  },
);

/**
 * PUT /enforcement-mode
 * Updates the tenant enforcement mode. Body: { mode: 'audit' | 'warn' | 'enforce' }
 */
router.put(
  "/enforcement-mode",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: enforcementModePutBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Missing tenant context" });
      }

      const { mode } = req.body ?? {};
      if (!mode || !VALID_MODES.includes(mode as EnforcementMode)) {
        return res.status(400).json({
          error: `Invalid enforcement mode. Must be one of: ${VALID_MODES.join(", ")}`,
          valid_modes: VALID_MODES,
        });
      }

      await setTenantEnforcementMode(tenantId, mode as EnforcementMode);

      setAuditData(res as any, {
        action: "update",
        entityType: "ai_governance_config",
        entityId: "enforcement_mode",
        afterState: { mode },
      });

      return res.json({ mode, valid_modes: VALID_MODES });
    } catch (err: unknown) {
      logger.error("[ai-governance-config] PUT enforcement-mode error:", toErrorMessage(err));
      return res.status(500).json({ error: "Failed to update enforcement mode" });
    }
  },
);

router.get(
  "/sod-policy", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Missing tenant context" });
      }
      const { registry_type } = req.query;
      const policy = await getSoDPolicy(tenantId, registry_type as string | undefined);
      return res.json({ policy, valid_policies: VALID_SOD_POLICIES, registry_type: registry_type || null, valid_registry_types: [...VALID_REGISTRY_TYPES] });
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve SoD policy" });
    }
  },
);

router.put(
  "/sod-policy",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: sodPolicyPutBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Missing tenant context" });
      }
      const { policy, registry_type } = req.body ?? {};
      if (!policy || !VALID_SOD_POLICIES.includes(policy as SoDPolicy)) {
        return res.status(400).json({
          error: `Invalid SoD policy. Must be one of: ${VALID_SOD_POLICIES.join(", ")}`,
          valid_policies: VALID_SOD_POLICIES,
        });
      }
      await setSoDPolicy(tenantId, policy as SoDPolicy, registry_type as string | undefined);
      setAuditData(res as any, {
        action: "update",
        entityType: "ai_governance_config",
        entityId: registry_type ? `sod_policy_${registry_type}` : "sod_policy",
        afterState: { policy, registry_type: registry_type || null },
      });
      return res.json({ policy, valid_policies: VALID_SOD_POLICIES, registry_type: registry_type || null });
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to update SoD policy" });
    }
  },
);

export default router;

let genericPayloadSchema = z.record(z.unknown());
