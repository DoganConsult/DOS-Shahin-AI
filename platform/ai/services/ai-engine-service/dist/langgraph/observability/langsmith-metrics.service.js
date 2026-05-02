import { logger } from '@dos/platform-core/observability';
// ============================================
// LangSmith Observability Service
// Agent metrics, token tracking, and error analytics
// for LangGraph/LangChain agent execution
// ============================================
import { safeQuery, tenantSchema } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';
// ── Inline Helpers (replacing tenant-service utility imports) ──────
function calculatePercentiles(values, percentiles) {
    if (values.length === 0)
        return Object.fromEntries(percentiles.map(p => [`p${p}`, 0]));
    const sorted = [...values].sort((a, b) => a - b);
    const result = {};
    for (const p of percentiles) {
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        result[`p${p}`] = sorted[Math.max(0, idx)];
    }
    return result;
}
function calculateThroughput(totalDurationMs, totalOperations) {
    if (totalDurationMs <= 0)
        return 0;
    return (totalOperations / totalDurationMs) * 1000;
}
function getFirstRow(result) {
    return result.rows[0] || {};
}
async function streamAgentMetrics(_tenantId, _metrics) {
    // Placeholder: implement when realtime-metrics is wired
}
// ── Record Agent Metrics ────────────────────────────────────────────
/**
 * Record agent execution metrics for LangSmith observability
 * Calculates percentile metrics from historical data for the same agent
 */
export async function recordAgentMetrics(metrics) {
    const schema = tenantSchema(metrics.tenantId);
    try {
        // Calculate percentiles from historical data (last 100 runs for same agent)
        const historicalData = await safeQuery(`SELECT duration_ms, tool_calls
       FROM "${schema}".langgraph_agent_metrics
       WHERE agent_id = $1 AND tenant_id = $2 AND status = 'success'
       ORDER BY start_time DESC
       LIMIT 100`, [metrics.agentId, metrics.tenantId]);
        const latencyValues = historicalData.rows.map((r) => r.duration_ms).filter((v) => v > 0);
        const percentiles = calculatePercentiles(latencyValues, [50, 95, 99]);
        // Calculate throughput: operations per second
        const totalOperations = historicalData.rows.reduce((sum, r) => sum + (r.tool_calls || 0), 0);
        const totalDuration = historicalData.rows.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
        const throughput = calculateThroughput(totalDuration, totalOperations);
        // Use provided percentiles if available, otherwise use calculated ones
        const p50 = metrics.p50LatencyMs ?? percentiles.p50;
        const p95 = metrics.p95LatencyMs ?? percentiles.p95;
        const p99 = metrics.p99LatencyMs ?? percentiles.p99;
        const throughputRps = metrics.throughputRps ?? throughput;
        await safeQuery(`INSERT INTO "${schema}".langgraph_agent_metrics
         (agent_id, tenant_id, run_id, graph_type, template_type,
          start_time, end_time, duration_ms, status, error,
          tool_calls, discoveries, proposed_actions, executed_actions,
          input_tokens, output_tokens, total_tokens, cost_usd,
          cache_hits, langsmith_trace_id, temporal_workflow_id,
          otel_trace_id, otel_span_id, correlation_id,
          p50_latency_ms, p95_latency_ms, p99_latency_ms, throughput_rps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       ON CONFLICT (run_id) DO UPDATE SET
         end_time = EXCLUDED.end_time,
         duration_ms = EXCLUDED.duration_ms,
         status = EXCLUDED.status,
         error = EXCLUDED.error,
         tool_calls = EXCLUDED.tool_calls,
         discoveries = EXCLUDED.discoveries,
         proposed_actions = EXCLUDED.proposed_actions,
         executed_actions = EXCLUDED.executed_actions,
         input_tokens = EXCLUDED.input_tokens,
         output_tokens = EXCLUDED.output_tokens,
         total_tokens = EXCLUDED.total_tokens,
         cost_usd = EXCLUDED.cost_usd,
         cache_hits = EXCLUDED.cache_hits,
         otel_trace_id = EXCLUDED.otel_trace_id,
         otel_span_id = EXCLUDED.otel_span_id,
         correlation_id = EXCLUDED.correlation_id,
         p50_latency_ms = EXCLUDED.p50_latency_ms,
         p95_latency_ms = EXCLUDED.p95_latency_ms,
         p99_latency_ms = EXCLUDED.p99_latency_ms,
         throughput_rps = EXCLUDED.throughput_rps`, [
            metrics.agentId,
            metrics.tenantId,
            metrics.runId,
            metrics.graphType,
            metrics.templateType || null,
            metrics.startTime,
            metrics.endTime || null,
            metrics.durationMs,
            metrics.status,
            metrics.error || null,
            metrics.toolCalls,
            metrics.discoveries,
            metrics.proposedActions,
            metrics.executedActions,
            metrics.inputTokens,
            metrics.outputTokens,
            metrics.totalTokens,
            metrics.costUsd,
            metrics.cacheHits,
            metrics.langsmithTraceId || null,
            metrics.temporalWorkflowId || null,
            metrics.otelTraceId || null,
            metrics.otelSpanId || null,
            metrics.correlationId || null,
            p50 || null,
            p95 || null,
            p99 || null,
            throughputRps || null,
        ]);
        // Stream metrics update to connected clients
        const metricsWithPercentiles = {
            ...metrics,
            p50LatencyMs: p50,
            p95LatencyMs: p95,
            p99LatencyMs: p99,
            throughputRps,
        };
        await streamAgentMetrics(metrics.tenantId, metricsWithPercentiles);
    }
    catch (err) {
        // Non-fatal: log but don't throw
        logger.warn(`[LangSmith Metrics] Failed to record metrics: ${toErrorMessage(err)}`);
    }
}
// ── Token Usage Analytics ───────────────────────────────────────────
/**
 * Get token usage summary for LangGraph agents
 */
export async function getTokenUsageSummary(tenantId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const summary = {
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        avgLatency: 0,
        byAgent: {},
        byGraphType: {},
        byTemplate: {},
    };
    try {
        const result = await safeQuery(`SELECT
         agent_id,
         graph_type,
         template_type,
         COUNT(*)::int AS calls,
         SUM(input_tokens)::int AS input_tokens,
         SUM(output_tokens)::int AS output_tokens,
         SUM(total_tokens)::int AS total_tokens,
         SUM(cost_usd)::real AS cost,
         AVG(duration_ms)::int AS avg_latency
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND start_time >= $2
       GROUP BY agent_id, graph_type, template_type`, [tenantId, cutoff]);
        for (const row of result.rows) {
            summary.totalCalls += row.calls;
            summary.totalInputTokens += row.input_tokens || 0;
            summary.totalOutputTokens += row.output_tokens || 0;
            summary.totalTokens += row.total_tokens || 0;
            summary.totalCost += row.cost || 0;
            // By agent
            if (row.agent_id) {
                if (!summary.byAgent[row.agent_id]) {
                    summary.byAgent[row.agent_id] = {
                        calls: 0,
                        inputTokens: 0,
                        outputTokens: 0,
                        totalTokens: 0,
                        cost: 0,
                        avgLatency: 0,
                    };
                }
                summary.byAgent[row.agent_id].calls += row.calls;
                summary.byAgent[row.agent_id].inputTokens += row.input_tokens || 0;
                summary.byAgent[row.agent_id].outputTokens += row.output_tokens || 0;
                summary.byAgent[row.agent_id].totalTokens += row.total_tokens || 0;
                summary.byAgent[row.agent_id].cost += row.cost || 0;
                summary.byAgent[row.agent_id].avgLatency = row.avg_latency || 0;
            }
            // By graph type
            if (row.graph_type) {
                if (!summary.byGraphType[row.graph_type]) {
                    summary.byGraphType[row.graph_type] = { calls: 0, totalTokens: 0, cost: 0 };
                }
                summary.byGraphType[row.graph_type].calls += row.calls;
                summary.byGraphType[row.graph_type].totalTokens += row.total_tokens || 0;
                summary.byGraphType[row.graph_type].cost += row.cost || 0;
            }
            // By template
            if (row.template_type) {
                if (!summary.byTemplate[row.template_type]) {
                    summary.byTemplate[row.template_type] = { calls: 0, totalTokens: 0, cost: 0 };
                }
                summary.byTemplate[row.template_type].calls += row.calls;
                summary.byTemplate[row.template_type].totalTokens += row.total_tokens || 0;
                summary.byTemplate[row.template_type].cost += row.cost || 0;
            }
            summary.avgLatency = row.avg_latency || 0;
        }
    }
    catch (err) {
        logger.warn(`[LangSmith Metrics] Failed to get token usage: ${toErrorMessage(err)}`);
    }
    return summary;
}
// ── Error Analytics ────────────────────────────────────────────────
/**
 * Get error analytics for LangGraph agents
 */
export async function getErrorAnalytics(tenantId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const analytics = {
        totalErrors: 0,
        uniqueErrors: 0,
        errorRate: 0,
        byAgent: {},
        byErrorType: {},
        recentErrors: [],
    };
    try {
        // Get total runs and errors
        const totalsResult = await safeQuery(`SELECT
         COUNT(*)::int AS total_runs,
         COUNT(*) FILTER (WHERE status = 'error')::int AS error_count
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND start_time >= $2`, [tenantId, cutoff]);
        const totals = getFirstRow(totalsResult);
        const totalRuns = totals?.total_runs || 0;
        analytics.totalErrors = totals?.error_count || 0;
        analytics.errorRate = totalRuns > 0 ? (analytics.totalErrors / totalRuns) * 100 : 0;
        // Get errors by agent
        const agentErrorsResult = await safeQuery(`SELECT
         agent_id,
         error,
         COUNT(*)::int AS count,
         MAX(start_time)::text AS last_seen
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND start_time >= $2 AND status = 'error' AND error IS NOT NULL
       GROUP BY agent_id, error
       ORDER BY count DESC`, [tenantId, cutoff]);
        const uniqueErrors = new Set();
        for (const row of agentErrorsResult.rows) {
            uniqueErrors.add(row.error);
            if (!analytics.byAgent[row.agent_id]) {
                analytics.byAgent[row.agent_id] = {
                    count: 0,
                    lastSeen: '',
                    sampleError: '',
                };
            }
            analytics.byAgent[row.agent_id].count += row.count;
            if (!analytics.byAgent[row.agent_id].sampleError) {
                analytics.byAgent[row.agent_id].sampleError = row.error;
            }
            if (row.last_seen > analytics.byAgent[row.agent_id].lastSeen) {
                analytics.byAgent[row.agent_id].lastSeen = row.last_seen;
            }
        }
        analytics.uniqueErrors = uniqueErrors.size;
        // Get errors by type (extract error type from error message)
        const errorTypeResult = await safeQuery(`SELECT
         CASE
           WHEN error LIKE '%timeout%' THEN 'timeout'
           WHEN error LIKE '%network%' OR error LIKE '%connection%' THEN 'network'
           WHEN error LIKE '%validation%' OR error LIKE '%invalid%' THEN 'validation'
           WHEN error LIKE '%permission%' OR error LIKE '%access%' THEN 'permission'
           WHEN error LIKE '%not found%' OR error LIKE '%missing%' THEN 'not_found'
           ELSE 'other'
         END AS error_type,
         error,
         COUNT(*)::int AS count,
         array_agg(DISTINCT agent_id) AS agents,
         MAX(start_time)::text AS last_seen
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND start_time >= $2 AND status = 'error' AND error IS NOT NULL
       GROUP BY error_type, error
       ORDER BY count DESC`, [tenantId, cutoff]);
        for (const row of errorTypeResult.rows) {
            if (!analytics.byErrorType[row.error_type]) {
                analytics.byErrorType[row.error_type] = {
                    count: 0,
                    agents: [],
                    lastSeen: '',
                };
            }
            analytics.byErrorType[row.error_type].count += row.count;
            analytics.byErrorType[row.error_type].agents = [
                ...new Set([...analytics.byErrorType[row.error_type].agents, ...(row.agents || [])]),
            ];
            if (row.last_seen > analytics.byErrorType[row.error_type].lastSeen) {
                analytics.byErrorType[row.error_type].lastSeen = row.last_seen;
            }
        }
        // Get recent errors
        const recentErrorsResult = await safeQuery(`SELECT
         agent_id,
         error,
         graph_type,
         start_time::text AS timestamp
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND start_time >= $2 AND status = 'error' AND error IS NOT NULL
       ORDER BY start_time DESC
       LIMIT 20`, [tenantId, cutoff]);
        analytics.recentErrors = recentErrorsResult.rows.map((r) => ({
            agentId: r.agent_id,
            error: r.error,
            timestamp: r.timestamp,
            graphType: r.graph_type,
        }));
    }
    catch (err) {
        logger.warn(`[LangSmith Metrics] Failed to get error analytics: ${toErrorMessage(err)}`);
    }
    return analytics;
}
// ── Agent Performance Summary ────────────────────────────────────────
/**
 * Get performance summary for a specific agent
 */
export async function getAgentPerformanceSummary(tenantId, agentId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    try {
        const result = await safeQuery(`SELECT
         COUNT(*)::int AS total_runs,
         COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
         COUNT(*) FILTER (WHERE status = 'error')::int AS error_count,
         AVG(duration_ms)::int AS avg_duration_ms,
         AVG(tool_calls)::real AS avg_tool_calls,
         AVG(discoveries)::real AS avg_discoveries,
         AVG(executed_actions)::real AS avg_actions_executed,
         AVG(total_tokens)::int AS avg_tokens_per_run,
         AVG(cost_usd)::real AS avg_cost_per_run,
         MAX(start_time)::text AS last_run_at
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND agent_id = $2 AND start_time >= $3`, [tenantId, agentId, cutoff]);
        if (result.rows.length === 0 || getFirstRow(result)?.total_runs === 0) {
            return null;
        }
        const row = getFirstRow(result);
        const totalRuns = row.total_runs || 0;
        const successCount = row.success_count || 0;
        const errorCount = row.error_count || 0;
        return {
            agentId,
            totalRuns,
            successRate: totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
            avgDurationMs: row.avg_duration_ms || 0,
            avgToolCalls: row.avg_tool_calls || 0,
            avgDiscoveries: row.avg_discoveries || 0,
            avgActionsExecuted: row.avg_actions_executed || 0,
            avgTokensPerRun: row.avg_tokens_per_run || 0,
            avgCostPerRun: row.avg_cost_per_run || 0,
            errorRate: totalRuns > 0 ? (errorCount / totalRuns) * 100 : 0,
            lastRunAt: row.last_run_at || null,
        };
    }
    catch (err) {
        logger.warn(`[LangSmith Metrics] Failed to get agent performance: ${toErrorMessage(err)}`);
        return null;
    }
}
// ── LangSmith Trace Correlation ─────────────────────────────────────
/**
 * Get metrics by LangSmith trace ID for correlation
 */
export async function getMetricsByTraceId(tenantId, langsmithTraceId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND langsmith_trace_id = $2
       LIMIT 1`, [tenantId, langsmithTraceId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = getFirstRow(result);
        return {
            agentId: row.agent_id,
            tenantId: row.tenant_id,
            runId: row.run_id,
            graphType: row.graph_type,
            templateType: row.template_type,
            startTime: row.start_time,
            endTime: row.end_time,
            durationMs: row.duration_ms,
            status: row.status,
            error: row.error,
            toolCalls: row.tool_calls,
            discoveries: row.discoveries,
            proposedActions: row.proposed_actions,
            executedActions: row.executed_actions,
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            totalTokens: row.total_tokens,
            costUsd: row.cost_usd,
            cacheHits: row.cache_hits,
            langsmithTraceId: row.langsmith_trace_id,
            temporalWorkflowId: row.temporal_workflow_id,
        };
    }
    catch (err) {
        logger.warn(`[LangSmith Metrics] Failed to get metrics by trace: ${toErrorMessage(err)}`);
        return null;
    }
}
//# sourceMappingURL=langsmith-metrics.service.js.map