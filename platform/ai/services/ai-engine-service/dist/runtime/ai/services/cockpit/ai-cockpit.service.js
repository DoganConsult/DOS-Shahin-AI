// @ts-nocheck
// ============================================
// AI OS Cockpit — Aggregated health, signals, and operational metrics
// for the AI operating layer. Consumed by /api/ai-os/cockpit endpoint.
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { getAgentCatalog, getTenantPlatformMode } from '../../ports/platform.port.js';
import { getFirstRow } from '@dos/db';
export async function getCockpitSnapshot(tenantId) {
    const schema = tenantSchema(tenantId);
    const mode = await getTenantPlatformMode(tenantId);
    // Agent health
    const agentHealth = [];
    const agentCatalog = getAgentCatalog();
    for (const agent of agentCatalog) {
        try {
            const runs = await safeQuery(`SELECT status, started_at, completed_at,
                EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000 AS duration_ms
         FROM "${schema}".agent_runs
         WHERE agent_id = $1 AND started_at > NOW() - INTERVAL '24 hours'
         ORDER BY started_at DESC`, [agent.id]);
            const lastRun = getFirstRow(runs);
            const errors = runs.rows.filter((r) => r.status === 'failed').length;
            const avgMs = runs.rows.length > 0
                ? Math.round(runs.rows.reduce((s, r) => s + (r.duration_ms || 0), 0) / runs.rows.length)
                : 0;
            agentHealth.push({
                agentId: agent.id,
                name: agent.name,
                lastRunAt: lastRun?.started_at || null,
                lastRunStatus: lastRun?.status || null,
                runsLast24h: runs.rows.length,
                errorsLast24h: errors,
                avgDurationMs: avgMs,
            });
        }
        catch {
            agentHealth.push({
                agentId: agent.id, name: agent.name,
                lastRunAt: null, lastRunStatus: null,
                runsLast24h: 0, errorsLast24h: 0, avgDurationMs: 0,
            });
        }
    }
    const activeAgents = agentHealth.filter(a => a.runsLast24h > 0).length;
    const totalErrors = agentHealth.reduce((s, a) => s + a.errorsLast24h, 0);
    const totalRuns = agentHealth.reduce((s, a) => s + a.runsLast24h, 0);
    // SLA status
    let sla = { openTasks: 0, breachedTasks: 0, warningTasks: 0 };
    try {
        const slaResult = await safeQuery(`SELECT
        COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_tasks,
        COUNT(*) FILTER (WHERE breached_at IS NOT NULL) AS breached_tasks,
        COUNT(*) FILTER (WHERE due_at IS NOT NULL AND due_at < NOW() + INTERVAL '4 hours' AND breached_at IS NULL AND status IN ('open','in_progress')) AS warning_tasks
       FROM "${schema}".process_tasks
       WHERE deleted_at IS NULL`);
        const r = getFirstRow(slaResult);
        sla = { openTasks: parseInt(r?.open_tasks || '0'), breachedTasks: parseInt(r?.breached_tasks || '0'), warningTasks: parseInt(r?.warning_tasks || '0') };
    }
    catch { /* process_tasks may not exist */ }
    // Memory stats
    let memory = { totalMemories: 0, memoriesLast24h: 0 };
    try {
        const memResult = await safeQuery(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS recent
       FROM "${schema}".agent_memories
       WHERE deleted_at IS NULL`);
        const r = getFirstRow(memResult);
        memory = { totalMemories: parseInt(r?.total || '0'), memoriesLast24h: parseInt(r?.recent || '0') };
    }
    catch { /* agent_memories may not exist */ }
    // Proposal stats
    let proposals = { pendingApproval: 0, executedLast24h: 0, rejectedLast24h: 0 };
    try {
        const propResult = await safeQuery(`SELECT
        COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending,
        COUNT(*) FILTER (WHERE status = 'executed' AND updated_at > NOW() - INTERVAL '24 hours') AS executed,
        COUNT(*) FILTER (WHERE status = 'rejected' AND updated_at > NOW() - INTERVAL '24 hours') AS rejected
       FROM "${schema}".agent_proposals
       WHERE deleted_at IS NULL`);
        const r = getFirstRow(propResult);
        proposals = { pendingApproval: parseInt(r?.pending || '0'), executedLast24h: parseInt(r?.executed || '0'), rejectedLast24h: parseInt(r?.rejected || '0') };
    }
    catch { /* agent_proposals may not exist */ }
    return {
        timestamp: new Date().toISOString(),
        tenantId,
        platformMode: mode,
        temporalEnabled: process.env.TEMPORAL_ENABLED === 'true',
        langgraphEnabled: process.env.LANGGRAPH_AGENTS_ENABLED === 'true',
        agents: agentHealth,
        agentSummary: {
            totalAgents: agentCatalog.length,
            activeInLast24h: activeAgents,
            errorRate: totalRuns > 0 ? Math.round((totalErrors / totalRuns) * 100) / 100 : 0,
        },
        sla,
        memory,
        proposals,
    };
}
//# sourceMappingURL=ai-cockpit.service.js.map