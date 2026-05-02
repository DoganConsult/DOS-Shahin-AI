import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  createBreakGlass,
  revokeBreakGlass,
  listBreakGlassEntries,
  recordPromotion,
  listPromotions,
  getGovernanceEventSummary,
  listGovernanceAuditEvents,
  invalidateSummaryCache,
} from '../../services/ai/operations/ai-governance-ops.service';
import { checkGovernanceHealth, repairAiGovernance } from '../../services/ai/operations/ai-governance-bootstrap.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { breakGlassPostBody, breakGlassIdRevokePostBody, promotionsPostBody, repairPostBody, optOutConfigSchema } from "../../schemas/ai-governance.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));

router.get(
  "/summary", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const summary = await getGovernanceEventSummary(tenantId);
      return res.json(summary);
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve governance summary" });
    }
  },
);

router.get(
  "/events", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const { event_type, limit, offset } = req.query;
      const result = await listGovernanceAuditEvents(tenantId, {
        event_type: event_type as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      return res.json(result);
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve governance events" });
    }
  },
);

router.post(
  "/break-glass",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: breakGlassPostBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user!.userId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });

      const { asset_id, version_id, registry_type, reason, duration_minutes } = req.body;
      if (!asset_id || !registry_type || !reason) {
        return res.status(400).json({ error: "asset_id, registry_type, and reason are required" });
      }

      const entry = await createBreakGlass(tenantId, {
        asset_id,
        version_id,
        registry_type,
        actor_id: userId,
        reason,
        duration_minutes,
      });

      invalidateSummaryCache(tenantId);
      setAuditData(res as any, {
        action: "create",
        entityType: "break_glass",
        entityId: entry.break_glass_id,
        afterState: { asset_id, registry_type, reason, duration_minutes },
      });
      return res.status(201).json(entry);
    } catch (err: unknown) {
      if (toErrorMessage(err).includes('at least 10')) {
        return res.status(400).json({ error: toErrorMessage(err) });
      }
      return res.status(500).json({ error: "Failed to create break-glass entry" });
    }
  },
);

router.post(
  "/break-glass/:id/revoke",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: breakGlassIdRevokePostBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user!.userId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });

      const entry = await revokeBreakGlass(tenantId, req.params.id, userId);
      invalidateSummaryCache(tenantId);
      setAuditData(res as any, {
        action: "update",
        entityType: "break_glass",
        entityId: req.params.id,
        afterState: { status: "revoked", revoked_by: userId },
      });
      return res.json(entry);
    } catch (err: unknown) {
      if (toErrorMessage(err).includes('not found')) {
        return res.status(404).json({ error: toErrorMessage(err) });
      }
      return res.status(500).json({ error: "Failed to revoke break-glass entry" });
    }
  },
);

router.get(
  "/break-glass", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const { status, registry_type, limit, offset } = req.query;
      const result = await listBreakGlassEntries(tenantId, {
        status: status as string,
        registry_type: registry_type as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      return res.json(result);
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve break-glass entries" });
    }
  },
);

router.post(
  "/promotions",
  authenticate,
  requirePermission("ai_governance.manage"), validate({ body: promotionsPostBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user!.userId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });

      const { asset_id, version_id, registry_type, from_environment, to_environment, notes } = req.body;
      if (!asset_id || !version_id || !registry_type || !from_environment || !to_environment) {
        return res.status(400).json({ error: "asset_id, version_id, registry_type, from_environment, to_environment are required" });
      }

      const record = await recordPromotion(tenantId, {
        asset_id,
        version_id,
        registry_type,
        from_environment,
        to_environment,
        promoted_by: userId,
        notes,
      });

      setAuditData(res as any, {
        action: "create",
        entityType: "promotion",
        entityId: record.promotion_id,
        afterState: { from_environment, to_environment, registry_type },
      });
      return res.status(201).json(record);
    } catch (err: unknown) {
      if (toErrorMessage(err).includes('Invalid environment') || toErrorMessage(err).includes('must differ')
          || toErrorMessage(err).includes('Cannot skip') || toErrorMessage(err).includes('Cannot demote')) {
        return res.status(400).json({ error: toErrorMessage(err) });
      }
      return res.status(500).json({ error: "Failed to record promotion" });
    }
  },
);

router.get(
  "/promotions", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const { registry_type, asset_id, limit, offset } = req.query;
      const result = await listPromotions(tenantId, {
        registry_type: registry_type as string,
        asset_id: asset_id as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      return res.json(result);
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve promotions" });
    }
  },
);

router.get(
  "/health", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const report = await checkGovernanceHealth(tenantId);
      return res.json(report);
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to check governance health" });
    }
  },
);

router.post(
  "/repair",
  authenticate,
  requirePermission("platform.system.admin"), validate({ body: repairPostBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      const _userId = req.user!.userId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const result = await repairAiGovernance(tenantId);
      setAuditData(res as any, {
        action: "create",
        entityType: "ai_governance_repair",
        entityId: tenantId,
        afterState: {
          modelVersions: result.bootstrap.modelVersions,
          promptVersions: result.bootstrap.promptVersions,
          agentVersions: result.bootstrap.agentVersions,
          toolBindings: result.bootstrap.toolBindings,
          allowlistEntries: result.bootstrap.allowlistEntries,
          backfill_processed: result.backfill.processed,
          backfill_resolved: result.backfill.backfilled,
          backfill_unresolved: result.backfill.unresolved,
          healthy: result.health.healthy,
        },
      });
      return res.json(result);
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to repair AI governance" });
    }
  },
);

// ── AI Cost Summary ──────────────────────────────────────────────────────
router.get(
  "/cost-summary", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const period = (req.query.period as string) || "30d";
      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const { withTenantClient } = await import('@dos/db');
      const { costRows, byAgentRows, byModelRows } = await withTenantClient(tenantId, async (client: any) => {
        const cost = await client.query(
          `SELECT
             COALESCE(SUM(cost_usd), 0)::float AS "totalCostUsd",
             COUNT(*)::int AS "totalCalls",
             COALESCE(SUM(input_tokens), 0)::bigint AS "totalInputTokens",
             COALESCE(SUM(output_tokens), 0)::bigint AS "totalOutputTokens"
             FROM ai_audit_log
            WHERE created_at >= NOW() - INTERVAL '${days} days'`,
        );
        const agent = await client.query(
          `SELECT agent_id AS "agentId", agent_id AS "agentName", model,
             COUNT(*)::int AS "totalCalls",
             COALESCE(SUM(input_tokens), 0)::int AS "inputTokens",
             COALESCE(SUM(output_tokens), 0)::int AS "outputTokens",
             COALESCE(SUM(cost_usd), 0)::float AS "costUsd",
             COALESCE(AVG(latency_ms), 0)::int AS "avgLatencyMs"
             FROM ai_audit_log
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY agent_id, model ORDER BY "costUsd" DESC LIMIT 50`,
        );
        const model = await client.query(
          `SELECT model, COUNT(*)::int AS calls,
             COALESCE(SUM(cost_usd), 0)::float AS "costUsd",
             COALESCE(SUM(input_tokens + output_tokens), 0)::bigint AS tokens
             FROM ai_audit_log
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY model ORDER BY "costUsd" DESC`,
        );
        return { costRows: cost.rows, byAgentRows: agent.rows, byModelRows: model.rows };
      });
      const summary = costRows[0] || { totalCostUsd: 0, totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0 };
      return res.json({
        success: true,
        data: {
          ...summary,
          periodStart: new Date(Date.now() - days * 86400000).toISOString(),
          periodEnd: new Date().toISOString(),
          byAgent: byAgentRows,
          byModel: byModelRows,
        },
      });
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve cost summary" });
    }
  },
);

// ── AI Budget ────────────────────────────────────────────────────────────
router.get(
  "/budget", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const schema = `tenant_${tenantId}`;
      const { safeQuery } = await import('@dos/db');
      const result = await safeQuery(
        `SELECT COALESCE((config->>'ai_monthly_budget_usd')::float, 0) AS "monthlyLimit"
         FROM "${schema}".tenant_config WHERE key = 'ai_settings' LIMIT 1`,
        [],
      );
      return res.json({ success: true, data: result.rows[0] || { monthlyLimit: 0 } });
    } catch (_err: unknown) {
      return res.json({ success: true, data: { monthlyLimit: 0 } });
    }
  },
);

// ── AI Opt-Out Config ────────────────────────────────────────────────────
router.get(
  "/opt-out-config", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const schema = `tenant_${tenantId}`;
      const { safeQuery } = await import('@dos/db');
      const result = await safeQuery(
        `SELECT config FROM "${schema}".tenant_config WHERE key = 'ai_opt_out' LIMIT 1`,
        [],
      );
      const config = result.rows[0]?.config || {
        globalOptOut: false,
        optOutModules: {},
        dataRetentionDays: 90,
        anonymizePrompts: false,
        disableTraining: false,
        lastUpdated: "",
        updatedBy: "",
      };
      return res.json({ success: true, data: config });
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve opt-out config" });
    }
  },
);

router.put(
  "/opt-out-config",
  authenticate,
  requirePermission("ai.governance.write"),
  validate({ body: optOutConfigSchema }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user!.userId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const schema = `tenant_${tenantId}`;
      const { safeQuery } = await import('@dos/db');
      const config = { ...req.body, lastUpdated: new Date().toISOString(), updatedBy: userId };
      await safeQuery(
        `INSERT INTO "${schema}".tenant_config (key, config, updated_at)
         VALUES ('ai_opt_out', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET config = $1::jsonb, updated_at = NOW()`,
        [JSON.stringify(config)],
      );
      setAuditData(res as any, {
        action: "update",
        entityType: "ai_opt_out_config",
        entityId: tenantId,
        afterState: { globalOptOut: config.globalOptOut },
      });
      return res.json({ success: true });
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to save opt-out config" });
    }
  },
);

// ── AI Audit Trail ───────────────────────────────────────────────────────
router.get(
  "/audit-trail", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("ai.governance.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Missing tenant context" });
      const schema = `tenant_${tenantId}`;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const { safeQuery } = await import('@dos/db');
      const result = await safeQuery(
        `SELECT id, tenant_id AS "tenantId", user_id AS "userId", agent_id AS "agentId",
           action, model, input_tokens AS "inputTokens", output_tokens AS "outputTokens",
           latency_ms AS "latencyMs", cost_usd AS "costUsd", status, error_message AS "errorMessage",
           created_at AS "createdAt"
         FROM "${schema}".ai_audit_log
         ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
      return res.json({ success: true, data: result.rows });
    } catch (_err: unknown) {
      return res.status(500).json({ error: "Failed to retrieve audit trail" });
    }
  },
);

export default router;

let genericPayloadSchema = z.record(z.unknown());
