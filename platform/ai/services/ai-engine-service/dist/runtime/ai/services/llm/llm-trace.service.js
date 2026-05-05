import { safeQuery, tenantSchema } from '../../ports/database.port';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
export function createTraceId() {
    return `tr_${uuid().replace(/-/g, '').slice(0, 16)}`;
}
export function createSpanId() {
    return `sp_${uuid().replace(/-/g, '').slice(0, 12)}`;
}
export async function recordTrace(span) {
    const schema = tenantSchema(span.tenantId);
    const traceId = span.traceId || createTraceId();
    const spanId = span.spanId || createSpanId();
    try {
        await safeQuery(`INSERT INTO "${schema}".llm_traces
         (trace_id, span_id, parent_span_id, run_id, agent_id, tenant_id, user_id,
          operation, provider, model, input_preview, output_preview,
          input_tokens, output_tokens, latency_ms, status, error_message,
          metadata, prompt_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`, [
            traceId, spanId, span.parentSpanId || null, span.runId || null,
            span.agentId || null, span.tenantId, span.userId || null,
            span.operation, span.provider || null, span.model || null,
            (span.inputPreview || '').slice(0, 500),
            (span.outputPreview || '').slice(0, 500),
            span.inputTokens || 0, span.outputTokens || 0,
            span.latencyMs || 0, span.status, span.errorMessage || null,
            JSON.stringify(span.metadata || {}), span.promptVersion || null,
        ]);
        return traceId;
    }
    catch {
        return null;
    }
}
export async function queryTraces(q) {
    const schema = tenantSchema(q.tenantId);
    const conditions = ['tenant_id = $1'];
    const params = [q.tenantId];
    let idx = 2;
    if (q.agentId) {
        conditions.push(`agent_id = $${idx++}`);
        params.push(q.agentId);
    }
    if (q.runId) {
        conditions.push(`run_id = $${idx++}`);
        params.push(q.runId);
    }
    if (q.status) {
        conditions.push(`status = $${idx++}`);
        params.push(q.status);
    }
    const where = conditions.join(' AND ');
    const limit = q.limit || 50;
    const offset = q.offset || 0;
    try {
        const countRes = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".llm_traces WHERE ${where}`, params);
        const result = await safeQuery(`SELECT * FROM "${schema}".llm_traces WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);
        return { traces: result.rows, total: getFirstRow(countRes)?.total || 0 };
    }
    catch {
        return { traces: [], total: 0 };
    }
}
export async function getTraceStats(tenantId, daysBack = 7) {
    const schema = tenantSchema(tenantId);
    const stats = { totalTraces: 0, errorRate: 0, avgLatency: 0, byStatus: {}, byAgent: {} };
    try {
        const result = await safeQuery(`SELECT status, agent_id, COUNT(*)::int AS cnt, AVG(latency_ms)::int AS avg_lat
       FROM "${schema}".llm_traces
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY status, agent_id`, [tenantId, daysBack]);
        for (const row of result.rows) {
            stats.totalTraces += row.cnt;
            stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + row.cnt;
            if (row.agent_id)
                stats.byAgent[row.agent_id] = (stats.byAgent[row.agent_id] || 0) + row.cnt;
            stats.avgLatency = row.avg_lat || 0;
        }
        const errorCount = (stats.byStatus['error'] || 0) + (stats.byStatus['timeout'] || 0) + (stats.byStatus['circuit_break'] || 0);
        stats.errorRate = stats.totalTraces > 0 ? Math.round((errorCount / stats.totalTraces) * 1000) / 10 : 0;
    }
    catch { /* non-fatal */ }
    return stats;
}
//# sourceMappingURL=llm-trace.service.js.map