import { logger } from '../../ports/logger.port.js';
// ============================================================
// Agent Task Execution Tracker
// Tracks all agent-executed tasks with status, verification, and performance metrics
// ============================================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { toErrorMessage } from '@dos/module-sdk';
/**
 * Record a new agent task execution
 */
export async function recordAgentTask(tenantId, agentId, runId, action) {
    const schema = tenantSchema(tenantId);
    const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    try {
        await safeQuery(`INSERT INTO "${schema}".agent_tasks (
        task_id, tenant_id, agent_id, run_id, action_type, action_title,
        entity_type, entity_id, status, started_at, retry_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 0, $10)`, [
            taskId,
            tenantId,
            agentId,
            runId,
            action.type,
            action.title,
            action.entityType || null,
            action.entityId || null,
            'executing',
            action.payload ? JSON.stringify(action.payload) : null,
        ]);
        return taskId;
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to record task for ${agentId}: ${toErrorMessage(err)}`);
        throw err;
    }
}
/**
 * Update task status
 */
export async function updateTaskStatus(tenantId, taskId, status, error) {
    const schema = tenantSchema(tenantId);
    try {
        const updates = ['status = $1'];
        const values = [status];
        let paramIndex = 2;
        if (status === 'completed' || status === 'verified' || status === 'unverified' || status === 'failed') {
            updates.push(`completed_at = NOW()`);
            updates.push(`duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000`);
        }
        if (error) {
            updates.push(`error = $${paramIndex}`);
            values.push(error);
            paramIndex++;
        }
        await safeQuery(`UPDATE "${schema}".agent_tasks SET ${updates.join(', ')} WHERE task_id = $${paramIndex}`, [...values, taskId]);
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to update task ${taskId}: ${toErrorMessage(err)}`);
    }
}
/**
 * Record task verification result
 */
export async function recordTaskVerification(tenantId, taskId, verified, details) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`UPDATE "${schema}".agent_tasks
       SET verification_status = $1, verification_details = $2, status = CASE WHEN $1 = true THEN 'verified' ELSE 'unverified' END
       WHERE task_id = $3`, [verified ? 'verified' : 'unverified', details ? JSON.stringify(details) : null, taskId]);
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to record verification for ${taskId}: ${toErrorMessage(err)}`);
    }
}
/**
 * Increment retry count for a task
 */
export async function incrementTaskRetry(tenantId, taskId) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`UPDATE "${schema}".agent_tasks SET retry_count = retry_count + 1 WHERE task_id = $1`, [taskId]);
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to increment retry for ${taskId}: ${toErrorMessage(err)}`);
    }
}
/**
 * Get task by ID
 */
export async function getTask(tenantId, taskId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT task_id, tenant_id, agent_id, run_id, action_type, action_title,
              entity_type, entity_id, status, verification_status, verification_details,
              started_at, completed_at, duration_ms, error, retry_count, metadata
       FROM "${schema}".agent_tasks
       WHERE task_id = $1`, [taskId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            taskId: row.task_id,
            tenantId: row.tenant_id,
            agentId: row.agent_id,
            runId: row.run_id,
            actionType: row.action_type,
            actionTitle: row.action_title,
            entityType: row.entity_type,
            entityId: row.entity_id,
            status: row.status,
            verificationStatus: row.verification_status,
            verificationDetails: row.verification_details ? JSON.parse(row.verification_details) : undefined,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            durationMs: row.duration_ms ? Math.round(row.duration_ms) : undefined,
            error: row.error,
            retryCount: row.retry_count || 0,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to get task ${taskId}: ${toErrorMessage(err)}`);
        return null;
    }
}
/**
 * Get tasks for an agent
 */
export async function getAgentTasks(tenantId, agentId, options) {
    const schema = tenantSchema(tenantId);
    try {
        let query = `SELECT task_id, tenant_id, agent_id, run_id, action_type, action_title,
                        entity_type, entity_id, status, verification_status, verification_details,
                        started_at, completed_at, duration_ms, error, retry_count, metadata
                 FROM "${schema}".agent_tasks
                 WHERE agent_id = $1`;
        const params = [agentId];
        let paramIndex = 2;
        if (options?.status) {
            query += ` AND status = $${paramIndex}`;
            params.push(options.status);
            paramIndex++;
        }
        query += ` ORDER BY started_at DESC`;
        if (options?.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(options.limit);
            paramIndex++;
        }
        if (options?.offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(options.offset);
        }
        const result = await safeQuery(query, params);
        return result.rows.map((row) => ({
            taskId: row.task_id,
            tenantId: row.tenant_id,
            agentId: row.agent_id,
            runId: row.run_id,
            actionType: row.action_type,
            actionTitle: row.action_title,
            entityType: row.entity_type,
            entityId: row.entity_id,
            status: row.status,
            verificationStatus: row.verification_status,
            verificationDetails: row.verification_details ? JSON.parse(row.verification_details) : undefined,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            durationMs: row.duration_ms ? Math.round(row.duration_ms) : undefined,
            error: row.error,
            retryCount: row.retry_count || 0,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to get tasks for ${agentId}: ${toErrorMessage(err)}`);
        return [];
    }
}
/**
 * Get task metrics for an agent
 */
export async function getAgentTaskMetrics(tenantId, agentId, days = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
        MAX(started_at) as last_task_at
       FROM "${schema}".agent_tasks
       WHERE agent_id = $1 AND started_at > NOW() - INTERVAL '${days} days'`, [agentId]);
        const row = result.rows[0];
        const total = parseInt(row.total_tasks || '0', 10);
        const completed = parseInt(row.completed_tasks || '0', 10);
        const verified = parseInt(row.verified_tasks || '0', 10);
        const failed = parseInt(row.failed_tasks || '0', 10);
        return {
            agentId,
            totalTasks: total,
            completedTasks: completed,
            verifiedTasks: verified,
            failedTasks: failed,
            averageDurationMs: row.avg_duration_ms ? Math.round(row.avg_duration_ms) : 0,
            successRate: total > 0 ? completed / total : 0,
            verificationRate: completed > 0 ? verified / completed : 0,
            lastTaskAt: row.last_task_at || undefined,
        };
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to get metrics for ${agentId}: ${toErrorMessage(err)}`);
        return {
            agentId,
            totalTasks: 0,
            completedTasks: 0,
            verifiedTasks: 0,
            failedTasks: 0,
            averageDurationMs: 0,
            successRate: 0,
            verificationRate: 0,
        };
    }
}
/**
 * Get all agent task metrics for a tenant
 */
export async function getAllAgentTaskMetrics(tenantId, days = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT 
        agent_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
        MAX(started_at) as last_task_at
       FROM "${schema}".agent_tasks
       WHERE started_at > NOW() - INTERVAL '${days} days'
       GROUP BY agent_id`, []);
        const metrics = {};
        for (const row of result.rows) {
            const total = parseInt(row.total_tasks || '0', 10);
            const completed = parseInt(row.completed_tasks || '0', 10);
            const verified = parseInt(row.verified_tasks || '0', 10);
            const failed = parseInt(row.failed_tasks || '0', 10);
            metrics[row.agent_id] = {
                agentId: row.agent_id,
                totalTasks: total,
                completedTasks: completed,
                verifiedTasks: verified,
                failedTasks: failed,
                averageDurationMs: row.avg_duration_ms ? Math.round(row.avg_duration_ms) : 0,
                successRate: total > 0 ? completed / total : 0,
                verificationRate: completed > 0 ? verified / completed : 0,
                lastTaskAt: row.last_task_at || undefined,
            };
        }
        return metrics;
    }
    catch (err) {
        logger.error(`[AgentTaskTracker] Failed to get all metrics: ${toErrorMessage(err)}`);
        return {};
    }
}
//# sourceMappingURL=agent-task-tracker.service.js.map