// @ts-nocheck
import { logger } from '../ports/logger.port.js';
import * as executionRepo from '../repositories/mcp-execution.repo.js';
import { MCP_BUSINESS_THRESHOLDS } from '../data/mcp-constants.js';
import * as toolRepo from '../repositories/mcp-tool.repo.js';
import * as agentRepo from '../repositories/mcp-agent.repo.js';
export async function getExecutionStats(tenantId, toolName) {
    const rows = await executionRepo.getExecutionStats(tenantId, toolName);
    return rows.map(r => ({
        toolName: r.tool_name,
        callCount: r.call_count || 0,
        avgMs: r.avg_ms || 0,
        errorCount: r.error_count || 0,
        lastCalled: r.last_called || '',
    }));
}
export async function getHealthReport(tenantId) {
    const warnings = [];
    const errors = [];
    let tools = { rows: [], total: 0 };
    let agents = [];
    try {
        tools = await toolRepo.listTools(tenantId, {});
        agents = await agentRepo.listAllAgents();
    }
    catch {
        errors.push('Failed to load registry data');
    }
    const enabledTools = tools.rows.filter(t => t.isEnabled).length;
    const disabledTools = tools.rows.filter(t => !t.isEnabled).length;
    let execStats = { total: 0, errors: 0 };
    let avgDurationMs = 0;
    try {
        execStats = await executionRepo.getExecutionCount24h(tenantId);
        const slowest = await executionRepo.getSlowestTools(tenantId, 1);
        avgDurationMs = slowest.length > 0 ? slowest[0].avgMs : 0;
    }
    catch {
        warnings.push('Execution stats unavailable');
    }
    const errorRate = execStats.total > 0 ? execStats.errors / execStats.total : 0;
    if (errorRate > MCP_BUSINESS_THRESHOLDS.ERROR_RATE_CRITICAL_THRESHOLD) {
        errors.push(`Error rate ${(errorRate * 100).toFixed(1)}% exceeds critical threshold`);
    }
    else if (errorRate > MCP_BUSINESS_THRESHOLDS.ERROR_RATE_WARNING_THRESHOLD) {
        warnings.push(`Error rate ${(errorRate * 100).toFixed(1)}% exceeds warning threshold`);
    }
    let pendingApprovals = 0;
    try {
        pendingApprovals = await executionRepo.getPendingApprovalCount(tenantId);
        if (pendingApprovals > MCP_BUSINESS_THRESHOLDS.PENDING_APPROVAL_WARNING) {
            warnings.push(`${pendingApprovals} pending approval requests`);
        }
    }
    catch { /* non-critical */ }
    let serverStatus = 'healthy';
    if (errors.length > 0)
        serverStatus = 'down';
    else if (warnings.length > 0)
        serverStatus = 'degraded';
    const overallHealth = errors.length > 0 ? 'critical' : warnings.length > 0 ? 'degraded' : 'healthy';
    return {
        tenantId,
        generatedAt: new Date().toISOString(),
        serverStatus,
        registryStats: {
            tools: tools.total,
            agents: agents.length,
            prompts: 0,
            resources: 0,
            enabledTools,
            disabledTools,
        },
        executionStats: {
            totalCalls: execStats.total,
            errorRate,
            avgDurationMs,
            blockedByGates: 0,
            pendingApprovals,
        },
        sessionStats: {
            activeSessions: 0,
            maxSessions: MCP_BUSINESS_THRESHOLDS.MAX_ACTIVE_SESSIONS,
        },
        warnings,
        errors,
        overallHealth,
    };
}
export async function getDiagnostics(tenantId) {
    const health = await getHealthReport(tenantId);
    const slowestTools = await executionRepo.getSlowestTools(tenantId, 5).catch(() => []);
    return {
        tenantId,
        generatedAt: health.generatedAt,
        toolRegistry: {
            total: health.registryStats.tools,
            enabled: health.registryStats.enabledTools,
            disabled: health.registryStats.disabledTools,
            deprecated: 0,
        },
        agentRegistry: {
            total: health.registryStats.agents,
            enabled: health.registryStats.agents,
        },
        executionHealth: {
            last24hCalls: health.executionStats.totalCalls,
            last24hErrors: Math.round(health.executionStats.totalCalls * health.executionStats.errorRate),
            errorRate: health.executionStats.errorRate,
            avgLatencyMs: health.executionStats.avgDurationMs,
            slowestTools,
        },
        pendingApprovals: health.executionStats.pendingApprovals,
        staleTools: 0,
        overallHealth: health.overallHealth,
        warnings: health.warnings,
        errors: health.errors,
    };
}
export async function listApprovalRequests(tenantId, status) {
    return executionRepo.listApprovalRequests(tenantId, status);
}
export async function reviewApproval(tenantId, requestId, decision, reviewedBy, notes) {
    await executionRepo.updateApprovalStatus(tenantId, requestId, decision, reviewedBy, notes);
    logger.info(`[MCP-Execution] Approval ${requestId} ${decision} by ${reviewedBy}`);
}
export async function purgeOldLogs(tenantId, retentionDays) {
    const count = await executionRepo.purgeOldLogs(tenantId, retentionDays);
    logger.info(`[MCP-Execution] Purged ${count} old log entries for tenant ${tenantId}`);
    return count;
}
export async function expireOldApprovals(tenantId) {
    const count = await executionRepo.expireOldApprovals(tenantId);
    if (count > 0)
        logger.info(`[MCP-Execution] Expired ${count} old approval requests for tenant ${tenantId}`);
    return count;
}
//# sourceMappingURL=mcp-execution.service.js.map