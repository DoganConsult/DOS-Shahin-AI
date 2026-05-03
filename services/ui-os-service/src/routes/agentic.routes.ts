import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';

/**
 * Phase M0.5 — Public agentic registry + status-strip aggregate.
 *
 *   GET /agentic/registry
 *     → { agents: [...], bindings: [...] }
 *     PUBLIC. Aggregate read of dos.agent_registry + dos.agent_module_binding.
 *     Returns no tenant-specific runtime data.
 *
 *   GET /agentic/strip?moduleCode=<code>
 *     → AgentStripSummary shape for the public landing strip.
 *     PUBLIC. Returns counts only (no per-tenant detail).
 *
 * Both endpoints refuse tenant headers — they are deliberately unauthenticated
 * to support the public marketing landing showcase.
 */

interface AgentRow {
  agent_code: string;
  display_name_en: string;
  display_name_ar: string;
  role_key: string;
  capabilities: string[];
  permission_key: string;
  brand_tile_kind: string;
  status: string;
  confidence_default: string;
}

interface BindingRow {
  agent_code: string;
  module_code: string;
  workbench_route: string | null;
  audit_route: string | null;
  followup_route: string | null;
  enabled: boolean;
}

export function createAgenticRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/agentic/registry', async (_req: Request, res: Response) => {
    try {
      const agentsQ = await pool.query<AgentRow>(
        `SELECT agent_code, display_name_en, display_name_ar, role_key,
                capabilities, permission_key, brand_tile_kind, status,
                confidence_default
           FROM dos.agent_registry
          WHERE status = 'active'
          ORDER BY agent_code`,
      );
      const bindingsQ = await pool.query<BindingRow>(
        `SELECT agent_code, module_code, workbench_route, audit_route,
                followup_route, enabled
           FROM dos.agent_module_binding
          WHERE enabled = TRUE
          ORDER BY agent_code, module_code`,
      );
      res.json({
        agents: agentsQ.rows.map((r) => ({
          agentCode: r.agent_code,
          displayNameEn: r.display_name_en,
          displayNameAr: r.display_name_ar,
          roleKey: r.role_key,
          capabilities: r.capabilities,
          permissionKey: r.permission_key,
          brandTileKind: r.brand_tile_kind,
          status: r.status,
          confidenceDefault: Number(r.confidence_default),
        })),
        bindings: bindingsQ.rows.map((r) => ({
          agentCode: r.agent_code,
          moduleCode: r.module_code,
          workbenchRoute: r.workbench_route,
          auditRoute: r.audit_route,
          followupRoute: r.followup_route,
          enabled: r.enabled,
        })),
      });
    } catch (e) {
      res.status(500).json({ error: 'agentic_registry_failed', message: (e as Error).message });
    }
  });

  router.get('/agentic/strip', async (req: Request, res: Response) => {
    const moduleCode = String(req.query.moduleCode ?? '').trim() || null;
    try {
      // Public aggregate — counts only. Detailed per-tenant runtime data
      // requires authenticated paths via ai-engine-service.
      const sql = moduleCode
        ? `SELECT count(DISTINCT a.agent_code) AS active
             FROM dos.agent_registry a
             JOIN dos.agent_module_binding b ON b.agent_code = a.agent_code
            WHERE a.status = 'active' AND b.enabled = TRUE AND b.module_code = $1`
        : `SELECT count(*) AS active FROM dos.agent_registry WHERE status='active'`;
      const params = moduleCode ? [moduleCode] : [];
      const q = await pool.query<{ active: string }>(sql, params);
      const active = Number(q.rows[0]?.active ?? 0);
      res.json({
        activeAgents: active,
        runningTasks: 0,
        pendingApprovals: 0,
        failedActions: 0,
        lastRunAt: null,
        perAgent: [],
      });
    } catch (e) {
      res.status(500).json({ error: 'agentic_strip_failed', message: (e as Error).message });
    }
  });

  return router;
}
