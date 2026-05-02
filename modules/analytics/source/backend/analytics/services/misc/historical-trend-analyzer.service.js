"use strict";
// ============================================
// AGRC-OS — Historical Trend Analyzer Service
// Analyzes historical trends in agent performance
// Requirements: ai-os-10.3
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTrends = analyzeTrends;
exports.getTrendSummary = getTrendSummary;
const database_port_1 = require("../../ports/database.port");
/**
 * Analyze historical trends
 */
async function analyzeTrends(tenantId, metric, agentId, period = 'daily', daysBack = 30) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const dataPoints = [];
    // Determine date grouping
    let dateGroup;
    switch (period) {
        case 'daily':
            dateGroup = `DATE(created_at)`;
            break;
        case 'weekly':
            dateGroup = `DATE_TRUNC('week', created_at)`;
            break;
        case 'monthly':
            dateGroup = `DATE_TRUNC('month', created_at)`;
            break;
    }
    // Build query
    const conditions = [`created_at > NOW() - make_interval(days => $1)`];
    const params = [daysBack];
    let idx = 2;
    if (agentId) {
        conditions.push(`agent_id = $${idx++}`);
        params.push(agentId);
    }
    let selectClause;
    switch (metric) {
        case 'latency':
            selectClause = `AVG(latency_ms)::real AS value`;
            break;
        case 'success_rate':
            selectClause = `(COUNT(CASE WHEN success THEN 1 END)::real / COUNT(*)::real) AS value`;
            break;
        case 'cost':
            selectClause = `SUM(cost_usd)::real AS value`;
            break;
        case 'error_rate':
            selectClause = `(COUNT(CASE WHEN NOT success THEN 1 END)::real / COUNT(*)::real) AS value`;
            break;
        case 'usage':
            selectClause = `COUNT(*)::real AS value`;
            break;
        default:
            selectClause = `0::real AS value`;
    }
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT ${dateGroup} AS date, ${selectClause}, COUNT(*)::int AS count
       FROM "${schema}".agent_runs
       WHERE ${conditions.join(' AND ')}
       GROUP BY ${dateGroup}
       ORDER BY date ASC`, params);
        for (const row of result.rows) {
            dataPoints.push({
                date: new Date(row.date),
                value: row.value || 0,
                count: row.count || 0,
            });
        }
    }
    catch {
        // Non-fatal
    }
    // Calculate trend
    const trend = calculateTrend(dataPoints);
    const avgValue = dataPoints.length > 0
        ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
        : 0;
    const values = dataPoints.map(p => p.value);
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    // Simple forecast (linear regression)
    const forecast = dataPoints.length >= 3 ? simpleForecast(dataPoints) : undefined;
    return {
        metric,
        agentId,
        period,
        dataPoints,
        trend: trend.direction,
        trendStrength: trend.strength,
        avgValue,
        minValue,
        maxValue,
        forecast,
    };
}
/**
 * Calculate trend direction and strength
 */
function calculateTrend(dataPoints) {
    if (dataPoints.length < 2) {
        return { direction: 'stable', strength: 0 };
    }
    // Simple linear regression
    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(p => p.value);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    // Calculate correlation coefficient (trend strength)
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
        const predicted = slope * x[i] + intercept;
        return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const strength = Math.abs(Math.sqrt(rSquared));
    let direction;
    if (Math.abs(slope) < 0.01) {
        direction = 'stable';
    }
    else {
        direction = slope > 0 ? 'increasing' : 'decreasing';
    }
    return { direction, strength };
}
/**
 * Simple forecast using linear regression
 */
function simpleForecast(dataPoints) {
    if (dataPoints.length < 3) {
        return { nextValue: 0, confidence: 0 };
    }
    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(p => p.value);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const nextX = n;
    const nextValue = slope * nextX + intercept;
    // Confidence based on R²
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
        const predicted = slope * x[i] + intercept;
        return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - (ssRes / ssTot))) : 0;
    return {
        nextValue: Math.max(0, nextValue), // Ensure non-negative
        confidence: rSquared,
    };
}
/**
 * Get trend summary for dashboard
 */
async function getTrendSummary(tenantId, agentId) {
    const [latency, successRate, cost] = await Promise.all([
        analyzeTrends(tenantId, 'latency', agentId, 'daily', 7),
        analyzeTrends(tenantId, 'success_rate', agentId, 'daily', 7),
        analyzeTrends(tenantId, 'cost', agentId, 'daily', 7),
    ]);
    return { latency, successRate, cost };
}
//# sourceMappingURL=historical-trend-analyzer.service.js.map