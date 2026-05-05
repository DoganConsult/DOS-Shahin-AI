import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
export async function getAiDashboard(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const [agents, runs, proposals, recommendations, tools, tokens, topAgents, failures] = await Promise.all([
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled
         FROM "${schema}".ai_agents WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, active: 0, disabled: 0 }] })),
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
             FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 0) AS avg_ms
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, completed: 0, failed: 0, avg_ms: null }] })),
            safeQuery(`SELECT COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending
         FROM "${schema}".ai_proposals WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ pending: 0 }] })),
            safeQuery(`SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open
         FROM "${schema}".ai_recommendations WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ open: 0 }] })),
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('failed', 'timeout', 'denied'))::int AS failures
         FROM "${schema}".ai_tool_executions
         WHERE executed_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, failures: 0 }] })),
            safeQuery(`SELECT COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
           ROUND(SUM(estimated_cost_usd)::numeric, 4) AS est_cost
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL`).catch(() => ({ rows: [{ total_tokens: 0, est_cost: null }] })),
            getTopAgentUsage(schema),
            getRecentFailures(schema),
        ]);
        const r = runs.rows[0] ?? {};
        const t = tools.rows[0] ?? {};
        const toolTotal = t.total ?? 0;
        const toolFail = t.failures ?? 0;
        return {
            totalAgents: agents.rows[0]?.total ?? 0,
            activeAgents: agents.rows[0]?.active ?? 0,
            disabledAgents: agents.rows[0]?.disabled ?? 0,
            totalRuns24h: r.total ?? 0,
            completedRuns24h: r.completed ?? 0,
            failedRuns24h: r.failed ?? 0,
            averageRunDurationMs: r.avg_ms != null ? parseFloat(r.avg_ms) : null,
            pendingProposals: proposals.rows[0]?.pending ?? 0,
            openRecommendations: recommendations.rows[0]?.open ?? 0,
            toolExecutions24h: toolTotal,
            toolFailureRate: toolTotal > 0 ? parseFloat(((toolFail / toolTotal) * 100).toFixed(2)) : null,
            totalTokens24h: tokens.rows[0]?.total_tokens ?? 0,
            estimatedCost24h: tokens.rows[0]?.est_cost != null ? parseFloat(tokens.rows[0].est_cost) : null,
            topAgents: topAgents,
            recentFailures: failures,
            capturedAt: new Date().toISOString(),
        };
    }
    catch (err) {
        logger.error('[AiDashboard] getAiDashboard failed', { tenantId, error: toErrorMessage(err) });
        return {
            totalAgents: 0, activeAgents: 0, disabledAgents: 0,
            totalRuns24h: 0, completedRuns24h: 0, failedRuns24h: 0,
            averageRunDurationMs: null, pendingProposals: 0, openRecommendations: 0,
            toolExecutions24h: 0, toolFailureRate: null, totalTokens24h: 0, estimatedCost24h: null,
            topAgents: [], recentFailures: [], capturedAt: new Date().toISOString(),
        };
    }
}
async function getTopAgentUsage(schema) {
    const result = await safeQuery(`SELECT ar.agent_id, aa.agent_code,
       COUNT(*)::int AS run_count,
       COUNT(*) FILTER (WHERE ar.status = 'failed')::int AS failed_count,
       ROUND(AVG(EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at)) * 1000)
         FILTER (WHERE ar.status = 'completed'), 0) AS avg_ms
     FROM "${schema}".ai_agent_runs ar
     LEFT JOIN "${schema}".ai_agents aa ON aa.agent_id = ar.agent_id
     WHERE ar.created_at > NOW() - INTERVAL '24 hours' AND ar.deleted_at IS NULL
     GROUP BY ar.agent_id, aa.agent_code
     ORDER BY run_count DESC
     LIMIT 10`).catch(() => ({ rows: [] }));
    return result.rows.map((r) => ({
        agentId: r.agent_id ?? '', agentCode: r.agent_code ?? '',
        runCount: r.run_count ?? 0, failedCount: r.failed_count ?? 0,
        avgDurationMs: r.avg_ms != null ? parseFloat(r.avg_ms) : null,
    }));
}
async function getRecentFailures(schema) {
    const result = await safeQuery(`SELECT ar.run_id, aa.agent_code, ar.module_code, ar.error_message, ar.started_at
     FROM "${schema}".ai_agent_runs ar
     LEFT JOIN "${schema}".ai_agents aa ON aa.agent_id = ar.agent_id
     WHERE ar.status = 'failed' AND ar.created_at > NOW() - INTERVAL '24 hours' AND ar.deleted_at IS NULL
     ORDER BY ar.started_at DESC LIMIT 5`).catch(() => ({ rows: [] }));
    return result.rows.map((r) => ({
        runId: r.run_id ?? '', agentCode: r.agent_code ?? null,
        moduleCode: r.module_code ?? '', errorMessage: r.error_message ?? null,
        startedAt: r.started_at?.toISOString?.() ?? r.started_at ?? '',
    }));
}
export async function getAiCostUsage(tenantId, days = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const [totals, byAgent, byModel] = await Promise.all([
            safeQuery(`SELECT
           COUNT(*)::int AS total_runs,
           COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
           ROUND(COALESCE(SUM(estimated_cost_usd), 0)::numeric, 4) AS total_cost
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - ($1 || ' days')::INTERVAL AND deleted_at IS NULL`, [days]).catch(() => ({ rows: [{ total_runs: 0, total_tokens: 0, total_cost: 0 }] })),
            safeQuery(`SELECT aa.agent_code, COUNT(*)::int AS runs, COALESCE(SUM(ar.tokens_used), 0)::int AS tokens
         FROM "${schema}".ai_agent_runs ar
         LEFT JOIN "${schema}".ai_agents aa ON aa.agent_id = ar.agent_id
         WHERE ar.created_at > NOW() - ($1 || ' days')::INTERVAL AND ar.deleted_at IS NULL
         GROUP BY aa.agent_code ORDER BY tokens DESC LIMIT 15`, [days]).catch(() => ({ rows: [] })),
            safeQuery(`SELECT model_id, COUNT(*)::int AS runs, COALESCE(SUM(tokens_used), 0)::int AS tokens
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - ($1 || ' days')::INTERVAL AND deleted_at IS NULL AND model_id IS NOT NULL
         GROUP BY model_id ORDER BY tokens DESC LIMIT 10`, [days]).catch(() => ({ rows: [] })),
        ]);
        const t = totals.rows[0] ?? {};
        return {
            periodDays: days,
            totalRuns: t.total_runs ?? 0,
            totalTokens: t.total_tokens ?? 0,
            totalCostUsd: t.total_cost != null ? parseFloat(t.total_cost) : null,
            byAgent: byAgent.rows.map((r) => ({ agentCode: r.agent_code ?? '', runs: r.runs ?? 0, tokens: r.tokens ?? 0 })),
            byModel: byModel.rows.map((r) => ({ modelId: r.model_id ?? '', runs: r.runs ?? 0, tokens: r.tokens ?? 0 })),
        };
    }
    catch (err) {
        logger.warn('[AiDashboard] getAiCostUsage failed', { tenantId, error: toErrorMessage(err) });
        return { periodDays: days, totalRuns: 0, totalTokens: 0, totalCostUsd: null, byAgent: [], byModel: [] };
    }
}
//# sourceMappingURL=ai-dashboard.service.js.map