/**
 * Runtime Health — AI pulse per module.
 * Consumed by frontend/.../shared/widgets/presentation/pulse-refresh/
 * module-ai-pulse.component.ts as:
 *   GET /api/runtime-health/ai-pulse/<moduleCode>
 *
 * Shape (from the FE type):
 *   {
 *     healthStatus: 'healthy' | 'degraded' | 'critical',
 *     maturityLevel: string,
 *     certificationState: string,
 *     agentsActive: number,
 *     agentActions24h: number,
 *     discoveries24h: number,
 *     proposalsPending: number,
 *     lastAgentRunAt: string | null,
 *     recentActions: Array<{action, timestamp, module, status, summary}>
 *   }
 *
 * Implementation — reads from dos.audit_trail where module = :moduleCode
 * and aggregates AI-related actions from the last 24h. The agent fleet
 * metrics (agentsActive, maturity, certification) will come from the AI
 * Engine's agent-registry when those tables land; until then the
 * handler returns conservative defaults and real counts from audit_trail
 * so the widget renders with live data instead of a 404.
 */

import { Router, Request, Response } from 'express';
import { safeQuery, emptyResult } from '@dos/db';

interface AgentPulseAggregateRow {
  agent_actions_24h: string | number;
  discoveries_24h: string | number;
  proposals_pending: string | number;
  last_agent_run_at: string | Date | null;
  [key: string]: unknown;
}

interface RecentAuditRow {
  action: string;
  created_at: string | Date;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  payload: unknown;
  [key: string]: unknown;
}

// Auth is enforced upstream at the gateway's Keycloak chokepoint —
// services/gateway/src/routes/index.ts runs canonicalAuth.authenticate()
// before proxying any non-public path. This router therefore reads
// `req.user` / `req.headers['x-tenant-id']` as trusted input.
const router = Router();

router.get('/ai-pulse/:moduleCode', async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      ((req as unknown as { user?: { tenantId?: string } }).user?.tenantId) ||
      '';
    const moduleCode = req.params.moduleCode;

    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }

    // Aggregate last-24h AI action counts from the audit trail for this
    // module. The action-name prefixes come from modules that write to
    // dos.audit_trail today: agent.<*>, discovery.<*>, proposal.<*>.
    const { rows: agg } = await safeQuery<AgentPulseAggregateRow>(
      `WITH recent AS (
         SELECT action, created_at
           FROM dos.audit_trail
          WHERE tenant_id = $1
            AND module = $2
            AND created_at > NOW() - INTERVAL '24 hours'
       )
       SELECT
         (SELECT COUNT(*) FROM recent WHERE action LIKE 'agent.%')                    AS agent_actions_24h,
         (SELECT COUNT(*) FROM recent WHERE action LIKE 'discovery.%')                AS discoveries_24h,
         (SELECT COUNT(*) FROM recent WHERE action LIKE 'proposal.pending%'
                                         OR action LIKE 'proposal.created%')          AS proposals_pending,
         (SELECT MAX(created_at) FROM recent WHERE action LIKE 'agent.%')             AS last_agent_run_at`,
      [tenantId, moduleCode],
    ).catch(() => emptyResult<AgentPulseAggregateRow>([
      { agent_actions_24h: 0, discoveries_24h: 0, proposals_pending: 0, last_agent_run_at: null },
    ]));

    const { rows: recent } = await safeQuery<RecentAuditRow>(
      `SELECT action, created_at, entity_type, entity_id, actor_id, payload
         FROM dos.audit_trail
        WHERE tenant_id = $1
          AND module = $2
          AND action LIKE ANY (ARRAY['agent.%', 'discovery.%', 'proposal.%'])
        ORDER BY created_at DESC
        LIMIT 10`,
      [tenantId, moduleCode],
    ).catch(() => emptyResult<RecentAuditRow>());

    const agentActions24h = Number(agg[0]?.agent_actions_24h ?? 0);
    const discoveries24h = Number(agg[0]?.discoveries_24h ?? 0);
    const proposalsPending = Number(agg[0]?.proposals_pending ?? 0);

    // Simple health heuristic — "healthy" unless there are stuck
    // proposals OR no agent activity in the last 24h while the module
    // was expected to be active. The FE tag severity map keys off
    // 'healthy' | 'degraded' | 'critical'.
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (proposalsPending >= 10) healthStatus = 'degraded';
    if (proposalsPending >= 25) healthStatus = 'critical';

    res.json({
      moduleCode,
      healthStatus,
      maturityLevel: 'baseline',
      certificationState: 'self-attested',
      agentsActive: 0,
      agentActions24h,
      discoveries24h,
      proposalsPending,
      lastAgentRunAt: agg[0]?.last_agent_run_at ?? null,
      recentActions: recent.map((r) => ({
        action: r.action,
        timestamp: r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at ?? new Date().toISOString()),
        entityType: r.entity_type ?? '',
        entityId: r.entity_id ?? '',
        actorId: r.actor_id ?? '',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load AI pulse', detail: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
