// ============================================
// AGRC-OS — Agent A/B Testing Service
// Enables A/B testing of agent configurations
// Requirements: ai-os-10.1
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
/**
 * Create or update an A/B test
 */
export async function upsertABTest(tenantId, test) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".agent_ab_tests
     (id, name, agent_id, variant_a_json, variant_b_json, split_ratio,
      status, start_date, end_date, min_sample_size, success_metric, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       agent_id = EXCLUDED.agent_id,
       variant_a_json = EXCLUDED.variant_a_json,
       variant_b_json = EXCLUDED.variant_b_json,
       split_ratio = EXCLUDED.split_ratio,
       status = EXCLUDED.status,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       min_sample_size = EXCLUDED.min_sample_size,
       success_metric = EXCLUDED.success_metric,
       updated_at = NOW()`, [
        test.id,
        test.name,
        test.agentId,
        JSON.stringify(test.variantA),
        JSON.stringify(test.variantB),
        test.splitRatio,
        test.status,
        test.startDate || null,
        test.endDate || null,
        test.minSampleSize || 100,
        test.successMetric,
    ]);
}
/**
 * Assign a user/session to a test variant
 */
export async function assignToVariant(tenantId, testId, userId, sessionId) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
/**
 * Record test result
 */
export async function recordTestResult(tenantId, testId, variant, result) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".ab_test_results
     (test_id, tenant_id, variant, success, latency_ms, cost_usd,
      user_satisfaction_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
        testId,
        tenantId,
        variant,
        result.success,
        result.latencyMs,
        result.costUsd,
        result.userSatisfactionScore || null,
    ]).catch(catchHandler(EC.AGENT_ACTION, {}));
}
/**
 * Get test results
 */
export async function getTestResults(tenantId, testId) {
    const schema = tenantSchema(tenantId);
    // Get test config
    const testResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT success_metric FROM "${schema}".agent_ab_tests
     WHERE id = $1 AND tenant_id = $2`, [testId, tenantId]), { tenantId: tenantId, operation: 'query agent_ab_tests' });
    if (testResult.rows.length === 0)
        return null;
    const successMetric = getFirstRow(testResult)?.success_metric;
    // Get results
    const results = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT variant,
            COUNT(*)::int AS total_runs,
            COUNT(CASE WHEN success THEN 1 END)::int AS success_count,
            COUNT(CASE WHEN NOT success THEN 1 END)::int AS failure_count,
            AVG(latency_ms)::int AS avg_latency,
            SUM(cost_usd)::real AS total_cost,
            AVG(user_satisfaction_score)::real AS avg_satisfaction
     FROM "${schema}".ab_test_results
     WHERE test_id = $1 AND tenant_id = $2
     GROUP BY variant`, [testId, tenantId]), { tenantId: tenantId, operation: 'query ab_test_results' });
    const variantA = {
        testId,
        variant: 'A',
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        avgLatencyMs: 0,
        totalCostUsd: 0,
        metricValue: 0,
    };
    const variantB = {
        testId,
        variant: 'B',
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        avgLatencyMs: 0,
        totalCostUsd: 0,
        metricValue: 0,
    };
    for (const row of results.rows) {
        const result = row.variant === 'A' ? variantA : variantB;
        result.totalRuns = row.total_runs || 0;
        result.successCount = row.success_count || 0;
        result.failureCount = row.failure_count || 0;
        result.avgLatencyMs = row.avg_latency || 0;
        result.totalCostUsd = row.total_cost || 0;
        result.userSatisfactionScore = row.avg_satisfaction || undefined;
        // Calculate metric value
        switch (successMetric) {
            case 'success_rate':
                result.metricValue = result.totalRuns > 0 ? result.successCount / result.totalRuns : 0;
                break;
            case 'latency':
                result.metricValue = result.avgLatencyMs;
                break;
            case 'cost':
                result.metricValue = result.totalCostUsd;
                break;
            case 'user_satisfaction':
                result.metricValue = result.userSatisfactionScore || 0;
                break;
        }
    }
    return { variantA, variantB };
}
/**
 * Determine winning variant
 */
export async function getWinningVariant(tenantId, testId) {
    const results = await getTestResults(tenantId, testId);
    if (!results)
        return null;
    // Get test config for metric
    const schema = tenantSchema(tenantId);
    const testResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT success_metric, min_sample_size FROM "${schema}".agent_ab_tests
     WHERE id = $1 AND tenant_id = $2`, [testId, tenantId]), { tenantId: tenantId, operation: 'query agent_ab_tests' });
    if (testResult.rows.length === 0)
        return null;
    const minSample = getFirstRow(testResult)?.min_sample_size || 100;
    // Check if we have enough samples
    if (results.variantA.totalRuns < minSample || results.variantB.totalRuns < minSample) {
        return null; // Not enough data
    }
    // Higher metric value wins (for all metrics, higher is better)
    return results.variantA.metricValue > results.variantB.metricValue ? 'A' : 'B';
}
//# sourceMappingURL=agent-ab-testing.service.js.map