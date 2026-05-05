import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';
import { getProcessTable, getKernelStatus, getSchedulerTable, getIpcMessages, getMemoryPartitions, getKernelLog, killProcess, rebootAgent, adjustAutonomyLevel, getTokenUsage, setGlobalAutonomyLevel, getProcessDetail, getAgentDetail, pauseAgent, resumeAgent, getKernelHealth, saveKernelSnapshot, listKernelSnapshots, } from '../services/orchestration/ai-os-kernel.service';
import { getAgentHealthStatus, getAgentHealthDashboard, } from '../services/agents/lifecycle/agent-health-visualization.service';
import { getActiveAlerts, evaluateAlertRules, acknowledgeAlert, } from '../services/activity/activity-alerts.service';
import { getUnifiedActivityFeed, } from '../services/activity/unified-activity-feed.service';
import { checkToolPermission, getAgentPermissions, updateToolPermission, } from '../services/governance/agent-governance.service';
import { analyzeRbacUsage, } from '../services/core/ai-rbac-optimizer.service.js';
import { autoAssignAgentsForTenantMode, } from '../services/personal/personal-agent-auto-assign.service';
export async function processTable(req, res) {
    const result = await getProcessTable(req.tenantId);
    res.json(ok(result, req));
}
export async function kernelStatus(req, res) {
    const result = await getKernelStatus(req.tenantId);
    res.json(ok(result, req));
}
export async function schedulerTable(req, res) {
    const result = await getSchedulerTable(req.tenantId);
    res.json(ok(result, req));
}
export async function ipcMessages(req, res) {
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await getIpcMessages(req.tenantId, limit);
    res.json(ok(result, req));
}
export async function memoryPartitions(req, res) {
    const result = await getMemoryPartitions(req.tenantId);
    res.json(ok(result, req));
}
export async function kernelLog(req, res) {
    const limit = parseInt(req.query.limit, 10) || 100;
    const result = await getKernelLog(req.tenantId, limit);
    res.json(ok(result, req));
}
export async function killProcessHandler(req, res) {
    const result = await killProcess(req.tenantId, req.params.runId);
    setAuditData(res, { action: 'delete', entityType: 'ai_process', entityId: req.params.runId });
    res.json(ok({ killed: result }, req));
}
export async function rebootAgentHandler(req, res) {
    const _userId = req.user.userId;
    const result = await rebootAgent(req.tenantId, req.params.agentId);
    setAuditData(res, { action: 'update', entityType: 'ai_agent', entityId: req.params.agentId });
    res.json(ok(result, req));
}
export async function adjustAutonomy(req, res) {
    const result = await adjustAutonomyLevel(req.tenantId, req.params.agentId, req.body.level);
    setAuditData(res, { action: 'update', entityType: 'ai_autonomy', entityId: req.params.agentId });
    res.json(ok(result, req));
}
export async function tokenUsage(req, res) {
    const result = await getTokenUsage(req.tenantId);
    res.json(ok(result, req));
}
export async function setGlobalAutonomy(req, res) {
    const result = await setGlobalAutonomyLevel(req.tenantId, req.body.level);
    setAuditData(res, { action: 'update', entityType: 'global_autonomy' });
    res.json(ok(result, req));
}
export async function processDetail(req, res) {
    const result = await getProcessDetail(req.tenantId, req.params.pid);
    if (!result)
        throw new NotFoundError('ai_process', req.params.pid);
    res.json(ok(result, req));
}
export async function agentDetail(req, res) {
    const result = await getAgentDetail(req.tenantId, req.params.agentId);
    if (!result)
        throw new NotFoundError('ai_agent', req.params.agentId);
    res.json(ok(result, req));
}
export async function pauseAgentHandler(req, res) {
    const result = await pauseAgent(req.tenantId, req.params.agentId);
    setAuditData(res, { action: 'update', entityType: 'ai_agent_pause', entityId: req.params.agentId });
    res.json(ok({ paused: result }, req));
}
export async function resumeAgentHandler(req, res) {
    const result = await resumeAgent(req.tenantId, req.params.agentId);
    setAuditData(res, { action: 'update', entityType: 'ai_agent_resume', entityId: req.params.agentId });
    res.json(ok({ resumed: result }, req));
}
export async function kernelHealth(req, res) {
    const result = await getKernelHealth(req.tenantId);
    res.json(ok(result, req));
}
export async function saveSnapshot(req, res) {
    const snapshotId = await saveKernelSnapshot(req.tenantId);
    setAuditData(res, { action: 'create', entityType: 'kernel_snapshot', entityId: snapshotId });
    res.status(201).json(ok({ snapshotId }, req));
}
export async function listSnapshots(req, res) {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await listKernelSnapshots(req.tenantId, limit);
    res.json(ok(result, req));
}
export async function healthStatus(req, res) {
    const result = await getAgentHealthStatus(req.tenantId, req.params.agentId);
    res.json(ok(result, req));
}
export async function healthDashboard(req, res) {
    const result = await getAgentHealthDashboard(req.tenantId);
    res.json(ok(result, req));
}
export async function activeAlerts(req, res) {
    const severity = req.query.severity;
    const result = await getActiveAlerts(req.tenantId, severity);
    res.json(ok(result, req));
}
export async function evaluateAlerts(req, res) {
    const result = await evaluateAlertRules(req.tenantId);
    res.json(ok(result, req));
}
export async function acknowledgeAlertHandler(req, res) {
    const userId = req.user.userId;
    await acknowledgeAlert(req.tenantId, req.params.alertId, userId);
    setAuditData(res, { action: 'update', entityType: 'ai_alert', entityId: req.params.alertId });
    res.json(action('Alert acknowledged', req));
}
export async function activityFeed(req, res) {
    const userId = req.user?.userId ?? null;
    const result = await getUnifiedActivityFeed(req.tenantId, userId, {});
    res.json(ok(result, req));
}
export async function toolPermissionCheck(req, res) {
    const { agentId, toolName, action: permAction } = req.body;
    const result = await checkToolPermission(req.tenantId, agentId, toolName, permAction);
    res.json(ok(result, req));
}
export async function agentPermissions(req, res) {
    const result = await getAgentPermissions(req.tenantId, req.params.agentId);
    res.json(ok(result, req));
}
export async function updatePermission(req, res) {
    const result = await updateToolPermission(req.tenantId, req.params.agentId, req.body);
    setAuditData(res, { action: 'update', entityType: 'ai_tool_permission', entityId: req.params.agentId });
    res.json(ok(result, req));
}
export async function rbacAnalysis(req, res) {
    const result = await analyzeRbacUsage(req.tenantId);
    res.json(ok(result, req));
}
export async function assignments(req, res) {
    const userId = req.user.userId;
    const result = await autoAssignAgentsForTenantMode(req.tenantId, req.body.targetMode || 'copilot', userId);
    res.json(ok(result, req));
}
//# sourceMappingURL=ai.controller.js.map