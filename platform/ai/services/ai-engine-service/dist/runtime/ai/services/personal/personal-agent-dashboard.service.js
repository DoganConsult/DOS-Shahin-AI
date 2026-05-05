// ============================================================================
// Personal Agent Dashboard & Analytics
//
// Dashboard summary, audit trail, and activity timeline queries with caching.
// ============================================================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { getCachedDashboardSummary, setCachedDashboardSummary, getCachedAuditTrail, setCachedAuditTrail, getCachedTimeline, setCachedTimeline, } from './personal-agent-cache.service';
import { mapActivityRow } from './personal-agent-approval.service';
// ============================================================================
// Dashboard Summary
// ============================================================================
/**
 * Get comprehensive dashboard summary for agent activities.
 * Uses a single CTE-based query to minimize connection pool usage.
 */
export async function getAgentDashboardSummary(tenantId, userId, dateRange) {
    // Check cache first
    const cached = await getCachedDashboardSummary(tenantId, userId, dateRange);
    if (cached) {
        return cached;
    }
    const schema = tenantSchema(tenantId);
    const startDate = dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = dateRange?.end || new Date().toISOString();
    // Optimized: Single query with CTEs to reduce connection pool usage
    const userFilter = userId ? 'AND aal.user_id = $4' : '';
    const params = [tenantId, startDate, endDate];
    if (userId)
        params.push(userId);
    const dashboardQuery = await safeQuery(`WITH
    -- Assignment stats
    assignment_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE is_active = true) as total_assignments,
        COUNT(*) FILTER (WHERE is_active = true AND is_enabled = true) as active_agents
      FROM "${schema}".personal_agent_assignments
      WHERE tenant_id = $1
    ),
    -- Activity stats
    activity_stats AS (
      SELECT
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE status = 'pending' AND required_approval = true) as pending_approvals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_today,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_today,
        COUNT(*) FILTER (WHERE triggered_by_sla = true) as sla_breaches,
        AVG(duration_ms) as avg_execution_time,
        COUNT(*) FILTER (WHERE status = 'completed')::float / NULLIF(COUNT(*), 0) * 100 as success_rate,
        COUNT(*) FILTER (WHERE approved_by IS NOT NULL)::float / NULLIF(COUNT(*) FILTER (WHERE required_approval = true), 0) * 100 as approval_rate,
        COUNT(*) FILTER (WHERE triggered_by_sla = false OR (triggered_by_sla = true AND sla_hours_overdue <= 0))::float / NULLIF(COUNT(*), 0) * 100 as sla_compliance_rate
      FROM "${schema}".agent_activity_log aal
      WHERE aal.tenant_id = $1 AND aal.created_at >= $2 AND aal.created_at <= $3 ${userFilter}
    ),
    -- Activities by type
    by_type AS (
      SELECT activity_type, COUNT(*) as count
      FROM "${schema}".agent_activity_log aal
      WHERE aal.tenant_id = $1 AND aal.created_at >= $2 AND aal.created_at <= $3 ${userFilter}
      GROUP BY activity_type
    ),
    -- Activities by status
    by_status AS (
      SELECT status, COUNT(*) as count
      FROM "${schema}".agent_activity_log aal
      WHERE aal.tenant_id = $1 AND aal.created_at >= $2 AND aal.created_at <= $3 ${userFilter}
      GROUP BY status
    )
    SELECT
      (SELECT total_assignments FROM assignment_stats) as total_assignments,
      (SELECT active_agents FROM assignment_stats) as active_agents,
      (SELECT total_activities FROM activity_stats) as total_activities,
      (SELECT pending_approvals FROM activity_stats) as pending_approvals,
      (SELECT completed_today FROM activity_stats) as completed_today,
      (SELECT failed_today FROM activity_stats) as failed_today,
      (SELECT sla_breaches FROM activity_stats) as sla_breaches,
      (SELECT avg_execution_time FROM activity_stats) as avg_execution_time,
      (SELECT success_rate FROM activity_stats) as success_rate,
      (SELECT approval_rate FROM activity_stats) as approval_rate,
      (SELECT sla_compliance_rate FROM activity_stats) as sla_compliance_rate,
      (SELECT jsonb_object_agg(activity_type, count) FROM by_type) as activities_by_type,
      (SELECT jsonb_object_agg(status, count) FROM by_status) as activities_by_status`, params);
    const stats = getFirstRow(dashboardQuery);
    // Parse JSONB aggregates
    const activitiesByType = stats.activities_by_type || {};
    const activitiesByStatus = stats.activities_by_status || {};
    // Recent activities (separate query - small result set, indexed)
    const recentParams = userId ? [tenantId, userId] : [tenantId];
    const recent = await safeQuery(`SELECT * FROM "${schema}".agent_activity_log
     WHERE tenant_id = $1 ${userId ? 'AND user_id = $2' : ''}
     ORDER BY created_at DESC
     LIMIT 20`, recentParams);
    const recentActivities = recent.rows.map(mapActivityRow);
    const summary = {
        totalAssignments: parseInt(stats.total_assignments) || 0,
        activeAgents: parseInt(stats.active_agents) || 0,
        totalActivities: parseInt(stats.total_activities) || 0,
        pendingApprovals: parseInt(stats.pending_approvals) || 0,
        completedToday: parseInt(stats.completed_today) || 0,
        failedToday: parseInt(stats.failed_today) || 0,
        slaBreaches: parseInt(stats.sla_breaches) || 0,
        activitiesByType,
        activitiesByStatus,
        recentActivities,
        performanceMetrics: {
            averageExecutionTime: parseFloat(stats.avg_execution_time) || 0,
            approvalRate: parseFloat(stats.approval_rate) || 0,
            successRate: parseFloat(stats.success_rate) || 0,
            slaComplianceRate: parseFloat(stats.sla_compliance_rate) || 0,
        },
    };
    // Cache the result
    await setCachedDashboardSummary(tenantId, summary, userId, dateRange);
    return summary;
}
// ============================================================================
// Audit Trail
// ============================================================================
/**
 * Get detailed audit trail for agent activities with full context
 */
export async function getAgentAuditTrail(tenantId, filters, pagination) {
    // Build cache key from filters
    const cacheKeyParts = JSON.stringify({ filters, pagination });
    // Check cache first (only for page 1 to avoid cache bloat)
    if (!pagination || pagination.page === 1) {
        const cached = await getCachedAuditTrail(tenantId, cacheKeyParts);
        if (cached) {
            return cached;
        }
    }
    const schema = tenantSchema(tenantId);
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let paramIndex = 2;
    if (filters?.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
    }
    if (filters?.agentId) {
        conditions.push(`agent_id = $${paramIndex++}`);
        params.push(filters.agentId);
    }
    if (filters?.activityType) {
        conditions.push(`activity_type = $${paramIndex++}`);
        params.push(filters.activityType);
    }
    if (filters?.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
    }
    if (filters?.entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(filters.entityType);
    }
    if (filters?.entityId) {
        conditions.push(`entity_id = $${paramIndex++}`);
        params.push(filters.entityId);
    }
    if (filters?.dateRange) {
        conditions.push(`created_at >= $${paramIndex++} AND created_at <= $${paramIndex++}`);
        params.push(filters.dateRange.start, filters.dateRange.end);
    }
    // Get total count
    const countResult = await safeQuery(`SELECT COUNT(*) as total FROM "${schema}".agent_activity_log WHERE ${conditions.join(' AND ')}`, params);
    const total = parseInt(getFirstRow(countResult)?.total || '0');
    // Get paginated activities
    const activitiesResult = await safeQuery(`SELECT aal.*,
            paa.agent_name_en, paa.agent_name_ar, paa.activation_mode,
            paa.inherited_roles, paa.inherited_permissions
     FROM "${schema}".agent_activity_log aal
     LEFT JOIN "${schema}".personal_agent_assignments paa ON aal.assignment_id = paa.assignment_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY aal.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, [...params, limit, offset]);
    const activities = activitiesResult.rows.map(row => {
        const activity = mapActivityRow(row);
        // Enrich with assignment details
        const enriched = activity;
        enriched.agentNameEn = row.agent_name_en;
        enriched.agentNameAr = row.agent_name_ar;
        enriched.assignmentActivationMode = row.activation_mode;
        enriched.inheritedRoles = row.inherited_roles || [];
        enriched.inheritedPermissions = row.inherited_permissions || [];
        return activity;
    });
    const result = {
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
    // Cache the result (only for page 1)
    if (page === 1) {
        await setCachedAuditTrail(tenantId, cacheKeyParts, result);
    }
    return result;
}
// ============================================================================
// Activity Timeline
// ============================================================================
/**
 * Get activity timeline visualization data (daily aggregates)
 */
export async function getAgentActivityTimeline(tenantId, userId, days = 7) {
    // Check cache first
    const cached = await getCachedTimeline(tenantId, userId, days);
    if (cached) {
        return cached;
    }
    const schema = tenantSchema(tenantId);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const userFilter = userId ? `AND user_id = $3` : '';
    const params = userId ? [tenantId, startDate, userId] : [tenantId, startDate];
    const timeline = await safeQuery(`SELECT
      DATE(created_at) as date,
      COUNT(*) as activities,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN triggered_by_sla = true THEN 1 END) as sla_breaches
     FROM "${schema}".agent_activity_log
     WHERE tenant_id = $1 AND created_at >= $2 ${userFilter}
     GROUP BY DATE(created_at)
     ORDER BY date ASC`, params);
    const result = timeline.rows.map(row => ({
        date: row.date,
        activities: parseInt(row.activities),
        completed: parseInt(row.completed),
        failed: parseInt(row.failed),
        pending: parseInt(row.pending),
        slaBreaches: parseInt(row.sla_breaches),
    }));
    // Cache the result
    await setCachedTimeline(tenantId, result, userId, days);
    return result;
}
//# sourceMappingURL=personal-agent-dashboard.service.js.map