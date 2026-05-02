import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { logger } from '../../ports/logger.port.js';
const LOG_TAG = '[AI-PermissionRecommender]';
const MIN_DENIED_COUNT = 5;
const LOOKBACK_DAYS = parseInt(process.env.PERM_RECOMMEND_LOOKBACK_DAYS || '7', 10);
export async function generatePermissionRecommendations(tenantId) {
    const schema = tenantSchema(tenantId);
    const recommendations = [];
    let totalDenied = 0;
    try {
        const safeLookback = Math.max(1, Math.min(LOOKBACK_DAYS, 365));
        const { rows } = await safeQuery(`SELECT user_id, permission_code, COUNT(*) AS denied_count
       FROM "${schema}".role_usage_audit
       WHERE result = 'denied'
         AND created_at > NOW() - make_interval(days => $1)
       GROUP BY user_id, permission_code
       HAVING COUNT(*) >= $2
       ORDER BY COUNT(*) DESC
       LIMIT 100`, [safeLookback, MIN_DENIED_COUNT]);
        totalDenied = rows.reduce((sum, r) => sum + Number(r.denied_count), 0);
        for (const r of rows) {
            const count = Number(r.denied_count);
            const confidence = count > 50 ? 'high' : count > 20 ? 'medium' : 'low';
            recommendations.push({
                userId: r.user_id,
                permissionCode: r.permission_code,
                deniedCount: count,
                reason: `User attempted "${r.permission_code}" ${count} times in ${LOOKBACK_DAYS} days — all denied`,
                confidence,
            });
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} Failed to query denied permissions for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    const report = {
        tenantId,
        timestamp: new Date().toISOString(),
        recommendations,
        totalDenied,
    };
    logger.info(`${LOG_TAG} ${tenantId}: ${recommendations.length} recommendations from ${totalDenied} denied attempts`);
    try {
        await safeQuery(`INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('ai_permission_recommendations', $1, 'info', 'platform')`, [JSON.stringify(report)]);
    }
    catch (err) {
        logger.warn(`${LOG_TAG} Failed to persist recommendations for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return report;
}
export async function getLastRecommendations(tenantId) {
    try {
        const schema = tenantSchema(tenantId);
        const { rows } = await safeQuery(`SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'ai_permission_recommendations'
       ORDER BY created_at DESC LIMIT 1`);
        if (rows.length > 0) {
            return (typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload);
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} getLastRecommendations failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
}
//# sourceMappingURL=ai-permission-recommender.service.js.map