// ============================================================
// AGRC-OS Cross-Agent Metric Aggregation & Correlation Service
// Aggregates per-agent performance, cooperation metrics,
// circuit breaker health, and cross-agent correlations
// into a unified fleet dashboard model.
// ============================================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { aiCircuitBreaker } from '../governance/circuit/ai-circuit-breaker.service';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
// ── Per-Agent Performance ───────────────────────────────────────────────────
export async function getAgentPerformanceSummaries(tenantId, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
    try {
        const res = await safeQuery(`SELECT agent_id,
              COUNT(*)::int AS runs_total,
              COUNT(*) FILTER (WHERE executed_at >= $2)::int AS runs_24h,
              COUNT(*)::int AS actions_proposed,
              COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END), 0)::int AS actions_executed,
              COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms,
              CASE WHEN COUNT(*) > 0
                THEN ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric, 4)
                ELSE 0 END AS success_rate,
              MAX(executed_at) AS last_run_at
       FROM agent_performance
       WHERE tenant_id = $1
       GROUP BY agent_id
       ORDER BY agent_id`, [tenantId, cutoff]);
        const summaries = [];
        for (const row of res.rows) {
            let topActions = [];
            try {
                const actionRes = await safeQuery(`SELECT tool_name AS type, COUNT(*)::int AS cnt
           FROM agent_performance
           WHERE tenant_id = $1 AND agent_id = $2 AND executed_at >= $3
           GROUP BY tool_name ORDER BY cnt DESC LIMIT 5`, [tenantId, row.agent_id, cutoff]);
                topActions = actionRes.rows.map((a) => ({ type: a.type, count: a.cnt }));
            }
            catch { /* non-critical */ }
            summaries.push({
                agentId: row.agent_id,
                runsTotal: row.runs_total,
                runsLast24h: row.runs_24h,
                actionsProposed: row.actions_proposed,
                actionsExecuted: row.actions_executed,
                avgDurationMs: row.avg_duration_ms,
                successRate: Number(row.success_rate),
                lastRunAt: row.last_run_at?.toISOString?.() || row.last_run_at,
                topActionTypes: topActions,
            });
        }
        return summaries;
    }
    catch {
        return [];
    }
}
// ── Cooperation Metrics ─────────────────────────────────────────────────────
export async function getCooperationMetrics(tenantId, hours = 24) {
    const schema = tenantSchema(tenantId);
    const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
    const defaults = {
        totalHandoffs: 0, completedHandoffs: 0, pendingHandoffs: 0,
        handoffCompletionRate: 0, topHandoffPairs: [],
        totalDiscoveries: 0, correlationsFound: 0, avgHandoffLatencyMs: 0,
    };
    try {
        const handoffRes = await safeQuery(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) FILTER (WHERE status = 'completed'), 0)::int AS avg_latency_ms
       FROM "${schema}".agent_handoffs
       WHERE created_at >= $1`, [cutoff]);
        const pairRes = await safeQuery(`SELECT from_agent, to_agent, COUNT(*)::int AS cnt
       FROM "${schema}".agent_handoffs
       WHERE created_at >= $1
       GROUP BY from_agent, to_agent
       ORDER BY cnt DESC LIMIT 10`, [cutoff]);
        const discoveryRes = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".agent_discoveries WHERE created_at >= $1`, [cutoff]);
        const correlationRes = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".agent_correlations WHERE created_at >= $1`, [cutoff]);
        const r = getFirstRow(handoffRes) || {};
        const total = r.total || 0;
        return {
            totalHandoffs: total,
            completedHandoffs: r.completed || 0,
            pendingHandoffs: r.pending || 0,
            handoffCompletionRate: total > 0 ? Math.round((r.completed || 0) / total * 100) / 100 : 0,
            topHandoffPairs: pairRes.rows.map((p) => ({ from: p.from_agent, to: p.to_agent, count: p.cnt })),
            totalDiscoveries: getFirstRow(discoveryRes)?.total || 0,
            correlationsFound: getFirstRow(correlationRes)?.total || 0,
            avgHandoffLatencyMs: r.avg_latency_ms || 0,
        };
    }
    catch {
        return defaults;
    }
}
// ── Fleet Health Snapshot ───────────────────────────────────────────────────
export async function getFleetHealth(tenantId, hours = 24) {
    const agents = await getAgentPerformanceSummaries(tenantId, hours);
    const cooperation = await getCooperationMetrics(tenantId, hours);
    const cbStats = aiCircuitBreaker.getStats();
    const bpStats = eventBus.getBackpressureStats();
    const now = Date.now();
    const twoHoursMs = 2 * 3600_000;
    const activeAgents = agents.filter(a => a.lastRunAt && (now - new Date(a.lastRunAt).getTime()) < twoHoursMs);
    const staleAgents = agents.filter(a => a.lastRunAt && (now - new Date(a.lastRunAt).getTime()) >= twoHoursMs);
    const idleAgents = 10 - agents.length;
    const avgSuccessRate = agents.length > 0
        ? agents.reduce((s, a) => s + a.successRate, 0) / agents.length
        : 0;
    const handoffRate = cooperation.handoffCompletionRate;
    const cbHealthy = cbStats.state === 'CLOSED' ? 1 : cbStats.state === 'HALF_OPEN' ? 0.5 : 0;
    const bpHealthy = bpStats.dropped === 0 ? 1 : bpStats.dropped < 10 ? 0.7 : 0.3;
    const fleetScore = Math.round((avgSuccessRate * 0.35 +
        handoffRate * 0.2 +
        cbHealthy * 0.25 +
        bpHealthy * 0.1 +
        (activeAgents.length / 10) * 0.1) * 100);
    let fleetStatus = 'optimal';
    if (agents.length === 0)
        fleetStatus = 'idle';
    else if (fleetScore < 40 || cbStats.state === 'OPEN')
        fleetStatus = 'critical';
    else if (fleetScore < 70)
        fleetStatus = 'degraded';
    return {
        timestamp: new Date().toISOString(),
        agentCount: 10,
        activeAgents: activeAgents.length,
        idleAgents: Math.max(0, idleAgents),
        staleAgents: staleAgents.length,
        circuitBreaker: {
            state: cbStats.state,
            failureCount: cbStats.failures,
            dropped: cbStats.dropped,
            inFlight: cbStats.inFlight,
        },
        eventBusBackpressure: bpStats,
        agents,
        cooperation,
        fleetScore,
        fleetStatus,
    };
}
// ── Persist Fleet Snapshot ──────────────────────────────────────────────────
export async function saveFleetSnapshot(tenantId) {
    const schema = tenantSchema(tenantId);
    const health = await getFleetHealth(tenantId);
    try {
        await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".agent_fleet_snapshots (
        snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fleet_score INT DEFAULT 0,
        fleet_status TEXT DEFAULT 'idle',
        active_agents INT DEFAULT 0,
        stale_agents INT DEFAULT 0,
        circuit_breaker_state TEXT DEFAULT 'CLOSED',
        total_handoffs INT DEFAULT 0,
        correlations_found INT DEFAULT 0,
        backpressure_dropped INT DEFAULT 0,
        snapshot_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await safeQuery(`INSERT INTO "${schema}".agent_fleet_snapshots
         (fleet_score, fleet_status, active_agents, stale_agents,
          circuit_breaker_state, total_handoffs, correlations_found,
          backpressure_dropped, snapshot_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
            health.fleetScore, health.fleetStatus,
            health.activeAgents, health.staleAgents,
            health.circuitBreaker.state,
            health.cooperation.totalHandoffs,
            health.cooperation.correlationsFound,
            health.eventBusBackpressure.dropped,
            JSON.stringify(health),
        ]);
    }
    catch { /* best effort */ }
}
// ── Fleet Snapshot History ──────────────────────────────────────────────────
export async function getFleetSnapshotHistory(tenantId, limit = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const res = await safeQuery(`SELECT * FROM "${schema}".agent_fleet_snapshots ORDER BY created_at DESC LIMIT $1`, [limit]);
        return res.rows;
    }
    catch {
        return [];
    }
}
// ── Cross-Agent Trend Analysis ──────────────────────────────────────────────
export async function getAgentTrends(tenantId, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 3600_000).toISOString();
    try {
        const res = await safeQuery(`SELECT agent_id,
              DATE(executed_at) AS day,
              COUNT(*)::int AS runs,
              SUM(CASE WHEN success THEN 1 ELSE 0 END)::int AS successes,
              COALESCE(AVG(duration_ms), 0)::int AS avg_ms
       FROM agent_performance
       WHERE tenant_id = $1 AND executed_at >= $2
       GROUP BY agent_id, DATE(executed_at)
       ORDER BY agent_id, day`, [tenantId, cutoff]);
        const trends = {};
        for (const row of res.rows) {
            if (!trends[row.agent_id])
                trends[row.agent_id] = [];
            trends[row.agent_id].push({
                day: row.day,
                runs: row.runs,
                successes: row.successes,
                avgMs: row.avg_ms,
            });
        }
        return { period: { days, since: cutoff }, trends };
    }
    catch {
        return { period: { days, since: cutoff }, trends: {} };
    }
}
//# sourceMappingURL=agent-metrics-aggregator.service.js.map