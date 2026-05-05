// @ts-nocheck
import { logger } from '../../ports/logger.port';
// ============================================
// AGRC-OS — Execution Planner & Cycle Persistence
// Computes parallel execution waves and persists
// cycle summaries (discoveries, handoffs, correlations).
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { AGENT_DEPENDENCY_GRAPH } from './dependency-graph';
import { activeCycleContexts } from './cycle-context';
// ── Parallel Execution Planner ─────────────────────────────────────────────
/**
 * Compute parallel execution waves from the dependency graph.
 * Agents in the same wave can run concurrently.
 */
export function computeExecutionWaves() {
    const allAgents = Object.keys(AGENT_DEPENDENCY_GRAPH);
    const completed = new Set();
    const waves = [];
    let waveNum = 0;
    while (completed.size < allAgents.length) {
        waveNum++;
        const ready = allAgents.filter(a => !completed.has(a) &&
            AGENT_DEPENDENCY_GRAPH[a].dependsOn.every(dep => completed.has(dep)));
        if (ready.length === 0) {
            const remaining = allAgents.filter(a => !completed.has(a));
            waves.push({ wave: waveNum, agents: remaining, dependenciesMet: false });
            remaining.forEach(a => completed.add(a));
            break;
        }
        waves.push({ wave: waveNum, agents: ready, dependenciesMet: true });
        ready.forEach(a => completed.add(a));
    }
    return waves;
}
// ── Persist Cycle Summary ──────────────────────────────────────────────────
export async function persistCycleSummary(tenantId) {
    const ctx = activeCycleContexts.get(tenantId);
    if (!ctx)
        return;
    const schema = tenantSchema(tenantId);
    try {
        // Tables are now created in database.ts createTenantSchema() migration
        await safeQuery(`INSERT INTO "${schema}".agent_cycle_summaries
         (cycle_id, tenant_id, discoveries, handoffs, correlations, discovery_count, handoff_count, correlation_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (cycle_id) DO UPDATE SET
         discoveries = EXCLUDED.discoveries,
         handoffs = EXCLUDED.handoffs,
         correlations = EXCLUDED.correlations,
         discovery_count = EXCLUDED.discovery_count,
         handoff_count = EXCLUDED.handoff_count,
         correlation_count = EXCLUDED.correlation_count`, [ctx.cycleId, tenantId,
            JSON.stringify(ctx.discoveries), JSON.stringify(ctx.handoffs), JSON.stringify(ctx.correlations),
            ctx.discoveries.length, ctx.handoffs.length, ctx.correlations.length]);
        for (const h of ctx.handoffs) {
            await safeQuery(`INSERT INTO "${schema}".agent_handoffs (id, from_agent, to_agent, handoff_type, priority, status, payload, created_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at`, [h.id, h.fromAgent, h.toAgent, h.handoffType, h.priority, h.status,
                JSON.stringify(h.payload), h.createdAt, h.completedAt || null]);
        }
        for (const d of ctx.discoveries) {
            await safeQuery(`INSERT INTO "${schema}".agent_discoveries (id, agent_id, discovery_type, title, severity, entity_type, entity_id, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           discovery_type = EXCLUDED.discovery_type, title = EXCLUDED.title, severity = EXCLUDED.severity,
           details = EXCLUDED.details
         WHERE (agent_discoveries.title, agent_discoveries.severity) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.severity)`, [d.id, d.agentId, d.type, d.title, d.severity, d.entityType, d.entityId, JSON.stringify(d.details), d.timestamp]);
        }
        for (const c of ctx.correlations) {
            await safeQuery(`INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (id) DO UPDATE SET
           agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
           findings = EXCLUDED.findings
         WHERE (agent_correlations.shared_entity, agent_correlations.severity) IS DISTINCT FROM (EXCLUDED.shared_entity, EXCLUDED.severity)`, [c.id, c.agents, c.sharedEntity, c.severity, JSON.stringify(c.findings)]);
        }
    }
    catch (err) {
        logger.warn(`[AgentCooperation] Failed to persist cycle summary: ${toErrorMessage(err)}`);
    }
}
//# sourceMappingURL=execution-planner.js.map