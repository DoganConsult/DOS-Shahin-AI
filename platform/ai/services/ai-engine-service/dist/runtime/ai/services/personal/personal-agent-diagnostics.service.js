import { logger } from '../../ports/logger.port.js';
// ============================================================================
// Personal Agent Diagnostics
//
// Health checks, cache status, connection pool stats, and module metrics.
// ============================================================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ============================================================================
// Diagnostics
// ============================================================================
/**
 * Get comprehensive diagnostics for the personal-agent module.
 * Includes: cache health, connection pool stats, module status, performance metrics.
 */
export async function getPersonalAgentDiagnostics(tenantId) {
    const schema = tenantSchema(tenantId);
    // Check cache health
    const { checkCacheHealth } = await import('./personal-agent-cache.service.js');
    const cacheHealth = await checkCacheHealth();
    // Check connection pool health
    const { getPool } = await import('../../../../config/db/pool.js');
    const pool = getPool();
    const poolStats = {
        poolTotal: pool.totalCount,
        poolIdle: pool.idleCount,
        poolWaiting: pool.waitingCount,
        healthy: pool.totalCount > 0 && pool.idleCount >= 0,
    };
    // Get module metrics
    let metrics = {
        totalAssignments: 0,
        activeAgents: 0,
        totalActivities: 0,
        pendingApprovals: 0,
    };
    let services = {
        assignment: 'operational',
        activity: 'operational',
        sla: 'operational',
        cache: cacheHealth.healthy ? 'operational' : (cacheHealth.redisEnabled ? 'degraded' : 'unavailable'),
    };
    try {
        const stats = await safeQuery(`SELECT
        (SELECT COUNT(*) FROM "${schema}".personal_agent_assignments WHERE tenant_id = $1 AND is_active = true) as total_assignments,
        (SELECT COUNT(*) FROM "${schema}".personal_agent_assignments WHERE tenant_id = $1 AND is_active = true AND is_enabled = true) as active_agents,
        (SELECT COUNT(*) FROM "${schema}".agent_activity_log WHERE tenant_id = $1) as total_activities,
        (SELECT COUNT(*) FROM "${schema}".agent_activity_log WHERE tenant_id = $1 AND status = 'pending' AND required_approval = true) as pending_approvals`, [tenantId]);
        if (getFirstRow(stats)) {
            metrics = {
                totalAssignments: parseInt(getFirstRow(stats)?.total_assignments) || 0,
                activeAgents: parseInt(getFirstRow(stats)?.active_agents) || 0,
                totalActivities: parseInt(getFirstRow(stats)?.total_activities) || 0,
                pendingApprovals: parseInt(getFirstRow(stats)?.pending_approvals) || 0,
            };
        }
    }
    catch (err) {
        logger.error('[PersonalAgentDiagnostics] Error fetching metrics:', toErrorMessage(err));
        services.assignment = 'degraded';
        services.activity = 'degraded';
    }
    // Determine overall status
    const isHealthy = poolStats.healthy &&
        services.assignment === 'operational' &&
        services.activity === 'operational' &&
        services.sla === 'operational';
    const isDegraded = !isHealthy &&
        (poolStats.healthy || services.cache !== 'unavailable');
    const status = isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'unhealthy');
    return {
        module: 'personal-agent',
        status,
        timestamp: new Date().toISOString(),
        cache: cacheHealth,
        database: poolStats,
        metrics,
        services,
    };
}
//# sourceMappingURL=personal-agent-diagnostics.service.js.map