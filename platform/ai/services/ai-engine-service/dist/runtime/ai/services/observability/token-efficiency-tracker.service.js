import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AGRC-OS — Token Efficiency Tracker
// Tracks tokens per discovery/action for optimization
// Requirements: ai-os-7.1
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
/**
 * Track token usage for a specific operation
 */
export async function trackTokenEfficiency(record) {
    const schema = tenantSchema(record.tenantId);
    await safeQuery(`INSERT INTO "${schema}".token_efficiency_log
     (tenant_id, agent_id, run_id, discovery_id, action_id, operation_type,
      input_tokens, output_tokens, total_tokens, cache_hit, efficiency_score, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`, [
        record.tenantId,
        record.agentId || null,
        record.runId || null,
        record.discoveryId || null,
        record.actionId || null,
        record.operationType,
        record.inputTokens,
        record.outputTokens,
        record.totalTokens,
        record.cacheHit,
        record.efficiencyScore,
        record.metadata ? JSON.stringify(record.metadata) : null,
    ]).catch(catchHandler(EC.EVENT_BUS, {}));
}
/**
 * Calculate efficiency score based on operation type and token usage
 */
export function calculateEfficiencyScore(operationType, inputTokens, outputTokens, cacheHit) {
    // Base efficiency: lower tokens = higher score
    const totalTokens = inputTokens + outputTokens;
    // Expected token ranges per operation type
    const expectedRanges = {
        discovery: { min: 500, max: 2000 },
        action: { min: 300, max: 1500 },
        tool_call: { min: 100, max: 500 },
        llm_call: { min: 200, max: 1000 },
    };
    const range = expectedRanges[operationType] || { min: 0, max: 10000 };
    // Score based on how close to minimum
    let score = 1.0;
    if (totalTokens > range.max) {
        score = 0.3; // Over budget
    }
    else if (totalTokens > range.min) {
        // Linear interpolation between min and max
        score = 1.0 - ((totalTokens - range.min) / (range.max - range.min)) * 0.7;
    }
    // Bonus for cache hits
    if (cacheHit) {
        score = Math.min(1.0, score * 1.2);
    }
    return Math.max(0, Math.min(1, score));
}
/**
 * Get efficiency metrics for an agent or tenant
 */
export async function getEfficiencyMetrics(tenantId, agentId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    const conditions = [`created_at > NOW() - INTERVAL '${daysBack} days'`];
    const params = [];
    let idx = 1;
    if (agentId) {
        conditions.push(`agent_id = $${idx++}`);
        params.push(agentId);
    }
    try {
        const result = await safeQuery(`SELECT 
         operation_type,
         AVG(CASE WHEN operation_type = 'discovery' THEN total_tokens ELSE NULL END)::int AS avg_discovery_tokens,
         AVG(CASE WHEN operation_type = 'action' THEN total_tokens ELSE NULL END)::int AS avg_action_tokens,
         AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END)::real AS cache_hit_rate,
         COUNT(*)::int AS count,
         AVG(total_tokens)::int AS avg_tokens
       FROM "${schema}".token_efficiency_log
       WHERE ${conditions.join(' AND ')}
       GROUP BY operation_type`, params);
        const metrics = {
            avgTokensPerDiscovery: 0,
            avgTokensPerAction: 0,
            cacheHitRate: 0,
            efficiencyTrend: 'stable',
            topWasteSources: [],
        };
        let totalCacheHits = 0;
        let totalOperations = 0;
        for (const row of result.rows) {
            if (row.operation_type === 'discovery') {
                metrics.avgTokensPerDiscovery = row.avg_discovery_tokens || 0;
            }
            if (row.operation_type === 'action') {
                metrics.avgTokensPerAction = row.avg_action_tokens || 0;
            }
            totalCacheHits += (row.cache_hit_rate || 0) * (row.count || 0);
            totalOperations += row.count || 0;
            if (row.avg_tokens > 1000) {
                metrics.topWasteSources.push({
                    operationType: row.operation_type,
                    avgTokens: row.avg_tokens,
                    count: row.count,
                });
            }
        }
        metrics.cacheHitRate = totalOperations > 0 ? totalCacheHits / totalOperations : 0;
        metrics.topWasteSources.sort((a, b) => b.avgTokens - a.avgTokens);
        // Determine trend (simplified - would need historical comparison)
        metrics.efficiencyTrend = 'stable';
        return metrics;
    }
    catch {
        return {
            avgTokensPerDiscovery: 0,
            avgTokensPerAction: 0,
            cacheHitRate: 0,
            efficiencyTrend: 'stable',
            topWasteSources: [],
        };
    }
}
//# sourceMappingURL=token-efficiency-tracker.service.js.map