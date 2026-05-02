import { safeQuery, tenantSchema } from '@dos/db';
export async function recordSignal(tenantId, signalType, payload) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".ai_signals (signal_type, payload, created_at)
     VALUES ($1, $2, NOW())`, [signalType, JSON.stringify(payload)]).catch(() => { });
}
export async function getSignalStats(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT signal_type, COUNT(*)::int AS count, MAX(created_at) AS last_seen
       FROM "${schema}".ai_signals
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY signal_type
       ORDER BY count DESC`);
        return { signals: result.rows, period: '24h' };
    }
    catch {
        return { signals: [], period: '24h' };
    }
}
export async function getLatestSignals(tenantId, limit = 50) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT signal_id, signal_type, payload, created_at
         FROM "${schema}".ai_signals
        ORDER BY created_at DESC
        LIMIT $1`, [limit]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function getSignalHistory(tenantId, signalType, days = 7) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT signal_id, signal_type, payload, created_at
         FROM "${schema}".ai_signals
        WHERE signal_type = $1
          AND created_at > NOW() - ($2 || ' days')::interval
        ORDER BY created_at DESC`, [signalType, String(days)]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function getSignalTrend(tenantId, signalType, days = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
         FROM "${schema}".ai_signals
        WHERE signal_type = $1
          AND created_at > NOW() - ($2 || ' days')::interval
        GROUP BY day
        ORDER BY day ASC`, [signalType, String(days)]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function pruneSignals(tenantId, retentionDays = 90) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`DELETE FROM "${schema}".ai_signals WHERE created_at < NOW() - ($1 || ' days')::interval`, [String(retentionDays)]);
        return result.rowCount ?? 0;
    }
    catch {
        return 0;
    }
}
export async function pruneDecisions(tenantId, retentionDays = 180) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`DELETE FROM "${schema}".ai_decision_log WHERE created_at < NOW() - ($1 || ' days')::interval`, [String(retentionDays)]);
        return result.rowCount ?? 0;
    }
    catch {
        return 0;
    }
}
export async function getAggregatedDashboard(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const [agents, signals, performance] = await Promise.all([
            safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM "${schema}".actor_registry WHERE actor_type != 'human'`).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
            safeQuery(`SELECT signal_type, COUNT(*)::int AS count FROM "${schema}".ai_signals WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY signal_type`).catch(() => ({ rows: [] })),
            safeQuery(`SELECT AVG(latency_ms)::int AS avg_latency, COUNT(*)::int AS total_calls, SUM(CASE WHEN error_type IS NOT NULL THEN 1 ELSE 0 END)::int AS errors FROM "${schema}".llm_usage_log WHERE created_at > NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ avg_latency: 0, total_calls: 0, errors: 0 }] })),
        ]);
        return {
            agents: agents.rows[0] || { total: 0, active: 0 },
            signals: signals.rows,
            performance: performance.rows[0] || { avg_latency: 0, total_calls: 0, errors: 0 },
            period: '7d',
        };
    }
    catch {
        return { agents: { total: 0, active: 0 }, signals: [], performance: { avg_latency: 0, total_calls: 0, errors: 0 }, period: '7d' };
    }
}
//# sourceMappingURL=ai-cockpit-signal.service.js.map