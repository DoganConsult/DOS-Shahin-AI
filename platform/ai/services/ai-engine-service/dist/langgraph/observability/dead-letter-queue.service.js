import { logger } from '@dos/platform-core/observability';
// ============================================
// Agent Dead-Letter Queue Service
// Manages permanently failed agent runs for analysis and recovery
// ============================================
import { safeQuery, tenantSchema } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';
// ── Inline Helper (replacing tenant-service utility import) ──────
function getFirstRow(result) {
    return result.rows[0] || {};
}
/**
 * Add a failed agent run to the dead-letter queue
 */
export async function addToDeadLetterQueue(input) {
    const schema = tenantSchema(input.tenantId);
    try {
        const result = await safeQuery(`INSERT INTO "${schema}".agent_dead_letter_queue
         (tenant_id, agent_id, run_id, graph_type, template_type,
          failure_reason, failure_category, error_message, error_stack,
          retry_count, max_retries, input_data, state_snapshot,
          langsmith_trace_id, temporal_workflow_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING dlq_id`, [
            input.tenantId,
            input.agentId,
            input.runId,
            input.graphType,
            input.templateType || null,
            input.failureReason,
            input.failureCategory,
            input.errorMessage || null,
            input.errorStack || null,
            input.retryCount,
            input.maxRetries,
            input.inputData ? JSON.stringify(input.inputData) : null,
            input.stateSnapshot ? JSON.stringify(input.stateSnapshot) : null,
            input.langsmithTraceId || null,
            input.temporalWorkflowId || null,
        ]);
        return getFirstRow(result)?.dlq_id;
    }
    catch (err) {
        logger.error(`[Dead Letter Queue] Failed to add entry: ${toErrorMessage(err)}`);
        throw err;
    }
}
/**
 * Get unresolved dead-letter entries for a tenant
 */
export async function getUnresolvedEntries(tenantId, agentId, failureCategory, limit = 100) {
    const schema = tenantSchema(tenantId);
    try {
        let queryStr = `
      SELECT dlq_id, tenant_id, agent_id, run_id, graph_type, template_type,
             failure_reason, failure_category, error_message, error_stack,
             last_error_at, retry_count, max_retries, last_retry_at,
             input_data, state_snapshot, langsmith_trace_id, temporal_workflow_id,
             created_at, updated_at, resolved_at, resolution_action, resolved_by, resolution_notes
      FROM "${schema}".agent_dead_letter_queue
      WHERE tenant_id = $1 AND resolved_at IS NULL
    `;
        const params = [tenantId];
        let paramIndex = 2;
        if (agentId) {
            queryStr += ` AND agent_id = $${paramIndex}`;
            params.push(agentId);
            paramIndex++;
        }
        if (failureCategory) {
            queryStr += ` AND failure_category = $${paramIndex}`;
            params.push(failureCategory);
            paramIndex++;
        }
        queryStr += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);
        const result = await safeQuery(queryStr, params);
        return result.rows.map((row) => ({
            dlqId: row.dlq_id,
            tenantId: row.tenant_id,
            agentId: row.agent_id,
            runId: row.run_id,
            graphType: row.graph_type,
            templateType: row.template_type || undefined,
            failureReason: row.failure_reason,
            failureCategory: row.failure_category,
            errorMessage: row.error_message || undefined,
            errorStack: row.error_stack || undefined,
            lastErrorAt: new Date(row.last_error_at),
            retryCount: row.retry_count,
            maxRetries: row.max_retries,
            lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at) : undefined,
            inputData: row.input_data ? (typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data) : undefined,
            stateSnapshot: row.state_snapshot ? (typeof row.state_snapshot === 'string' ? JSON.parse(row.state_snapshot) : row.state_snapshot) : undefined,
            langsmithTraceId: row.langsmith_trace_id || undefined,
            temporalWorkflowId: row.temporal_workflow_id || undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
            resolutionAction: row.resolution_action || undefined,
            resolvedBy: row.resolved_by || undefined,
            resolutionNotes: row.resolution_notes || undefined,
        }));
    }
    catch (err) {
        logger.error(`[Dead Letter Queue] Failed to fetch entries: ${toErrorMessage(err)}`);
        return [];
    }
}
/**
 * Resolve a dead-letter entry (mark as resolved)
 */
export async function resolveDLQEntry(tenantId, dlqId, resolutionAction, resolvedBy, resolutionNotes) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`UPDATE "${schema}".agent_dead_letter_queue
       SET resolved_at = NOW(),
           resolution_action = $1,
           resolved_by = $2,
           resolution_notes = $3,
           updated_at = NOW()
       WHERE dlq_id = $4 AND tenant_id = $5`, [resolutionAction, resolvedBy, resolutionNotes || null, dlqId, tenantId]);
    }
    catch (err) {
        logger.error(`[Dead Letter Queue] Failed to resolve entry: ${toErrorMessage(err)}`);
        throw err;
    }
}
export async function getFailureStats(tenantId, agentId, days = 30) {
    const schema = tenantSchema(tenantId);
    try {
        let queryStr = `
      SELECT
        failure_category as category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_count,
        AVG(retry_count)::DECIMAL(10,2) as avg_retry_count,
        MAX(created_at) as last_occurrence
      FROM "${schema}".agent_dead_letter_queue
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `;
        const params = [tenantId];
        if (agentId) {
            queryStr += ` AND agent_id = $2`;
            params.push(agentId);
        }
        queryStr += ` GROUP BY failure_category ORDER BY count DESC`;
        const result = await safeQuery(queryStr, params);
        return result.rows.map((row) => ({
            category: row.category,
            count: parseInt(row.count),
            unresolvedCount: parseInt(row.unresolved_count),
            avgRetryCount: parseFloat(row.avg_retry_count || '0'),
            lastOccurrence: new Date(row.last_occurrence),
        }));
    }
    catch (err) {
        logger.error(`[Dead Letter Queue] Failed to fetch stats: ${toErrorMessage(err)}`);
        return [];
    }
}
//# sourceMappingURL=dead-letter-queue.service.js.map