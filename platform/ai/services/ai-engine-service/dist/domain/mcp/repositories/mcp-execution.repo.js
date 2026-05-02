import { safeQuery, tenantSchema } from '../ports/database.port.js';
export async function logExecution(tenantId, toolName, agentId, userId, inputArgs, outputResult, isError, errorMessage, durationMs, traceId, handlerKey, executionType, providerKey) {
    const schema = tenantSchema(tenantId);
    const status = isError ? 'failed' : 'succeeded';
    await safeQuery(`INSERT INTO "${schema}".mcp_tool_execution_log
     (tenant_id, tool_name, agent_id, user_id, status, input_args, output_result,
      is_error, error_message, duration_ms, started_at, completed_at,
      handler_key, execution_type, provider_key, transport_type, trace_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - ($10 || ' milliseconds')::interval, NOW(),
             $11, $12, $13, 'internal', $14)`, [
        tenantId, toolName, agentId || null, userId || null,
        status, JSON.stringify(inputArgs), outputResult ? JSON.stringify(outputResult) : null,
        isError, errorMessage || null, durationMs,
        handlerKey || null, executionType || null, providerKey || null, traceId || null,
    ]);
}
export async function getExecutionStats(tenantId, toolName, limit = 100) {
    const schema = tenantSchema(tenantId);
    if (toolName) {
        const result = await safeQuery(`SELECT tool_name, agent_id, status, is_error, duration_ms, handler_key, created_at
       FROM "${schema}".mcp_tool_execution_log
       WHERE tool_name = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT $3`, [toolName, tenantId, limit]);
        return result.rows;
    }
    const result = await safeQuery(`SELECT tool_name, COUNT(*) as call_count,
            AVG(duration_ms)::int as avg_ms,
            SUM(CASE WHEN is_error THEN 1 ELSE 0 END) as error_count,
            MAX(created_at) as last_called
     FROM "${schema}".mcp_tool_execution_log
     WHERE tenant_id = $1
     GROUP BY tool_name ORDER BY call_count DESC LIMIT $2`, [tenantId, limit]);
    return result.rows;
}
export async function getExecutionCount24h(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT COUNT(*)::int AS total,
            SUM(CASE WHEN is_error THEN 1 ELSE 0 END)::int AS errors
     FROM "${schema}".mcp_tool_execution_log
     WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [tenantId]);
    const row = result.rows[0] || {};
    return { total: row.total || 0, errors: row.errors || 0 };
}
export async function getSlowestTools(tenantId, limit = 10) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT tool_name, AVG(duration_ms)::int AS avg_ms
     FROM "${schema}".mcp_tool_execution_log
     WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY tool_name ORDER BY avg_ms DESC LIMIT $2`, [tenantId, limit]);
    return result.rows.map(r => ({ toolName: r.tool_name, avgMs: r.avg_ms || 0 }));
}
export async function purgeOldLogs(tenantId, retentionDays) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`DELETE FROM "${schema}".mcp_tool_execution_log
     WHERE tenant_id = $1 AND created_at < NOW() - ($2 || ' days')::interval`, [tenantId, retentionDays]);
    return result.rowCount || 0;
}
export async function getPendingApprovalCount(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".mcp_tool_approval_requests
     WHERE tenant_id = $1 AND status = 'pending' AND expires_at > NOW()`, [tenantId]);
    return result.rows[0]?.count || 0;
}
export async function listApprovalRequests(tenantId, status) {
    const schema = tenantSchema(tenantId);
    if (status) {
        const result = await safeQuery(`SELECT * FROM "${schema}".mcp_tool_approval_requests
       WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 100`, [tenantId, status]);
        return result.rows;
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".mcp_tool_approval_requests
     WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`, [tenantId]);
    return result.rows;
}
export async function updateApprovalStatus(tenantId, requestId, status, reviewedBy, reviewNotes) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".mcp_tool_approval_requests
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
     WHERE request_id = $4 AND tenant_id = $5`, [status, reviewedBy, reviewNotes || null, requestId, tenantId]);
}
export async function expireOldApprovals(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".mcp_tool_approval_requests
     SET status = 'expired'
     WHERE tenant_id = $1 AND status = 'pending' AND expires_at < NOW()`, [tenantId]);
    return result.rowCount || 0;
}
//# sourceMappingURL=mcp-execution.repo.js.map