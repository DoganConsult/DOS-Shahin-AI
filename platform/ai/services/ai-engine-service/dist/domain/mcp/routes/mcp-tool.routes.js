// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port.js';
import { auditMiddleware, asyncHandler, moduleStack, validate, setAuditData } from '../ports/middleware.port.js';
import * as registryService from '../services/mcp-registry.service.js';
import * as executionService from '../services/mcp-execution.service.js';
import { listToolsQuery, executeToolBody, toolOverrideBody, toolStatusBody, toolEnableBody, executionStatsQuery, purgeLogsBody } from '../schemas/mcp.schemas.js';
import { z } from "zod";
const genericRouteSchema = z.any();
const router = Router();
router.use(moduleStack('mcp'));
router.use(auditMiddleware('mcp'));
router.get('/', authenticate, requirePermission('mcp.tool.read'), validate({ query: listToolsQuery }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { page, pageSize, status, agentId, moduleCode, domainCode, category, riskLevel, search, sortBy, sortDir } = req.query;
    const result = await registryService.listTools(tenantId, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        status: status,
        agentId,
        moduleCode,
        domainCode,
        category,
        riskLevel: riskLevel,
        search,
        sortBy,
        sortDir: sortDir,
    });
    res.json({ success: true, data: result.rows, total: result.total, page: Number(page) || 1, limit: Number(pageSize) || 50 });
}));
router.get('/:toolName', authenticate, requirePermission('mcp.tool.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tool = await registryService.getToolByName(req.params.toolName);
    if (!tool) {
        res.status(404).json({ success: false, error: 'Tool not found' });
        return;
    }
    res.json({ success: true, data: tool });
}));
router.get('/:toolName/resolved', authenticate, requirePermission('mcp.tool.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const tool = await registryService.getResolvedTool(tenantId, req.params.toolName);
    if (!tool) {
        res.status(404).json({ success: false, error: 'Tool not found' });
        return;
    }
    res.json({ success: true, data: tool });
}));
router.post('/execute', authenticate, requirePermission('mcp.tool.execute'), validate({ body: executeToolBody }), asyncHandler(async (req, res) => {
    const { toolName, arguments: args, agentId, autonomyLevel, traceId } = req.body;
    const tenantId = req.body.tenantId || req.tenantId;
    const userId = req.user?.userId;
    setAuditData(res, { action: 'execute', entityType: 'mcp_tool', entityId: toolName });
    const { executeDynamicTool } = require('../../../mcp/handlers/dynamic-tool-executor');
    const result = await executeDynamicTool({
        toolName,
        arguments: args,
        tenantId,
        userId,
        agentId,
        traceId,
        autonomyLevel,
        userRoles: req.user?.roles || [],
        userPermissions: req.user?.permissions || [],
        actorType: req.user?.principalType || 'human',
    });
    res.json({ success: !result.isError, toolName, content: result.content, isError: !!result.isError, metadata: result.metadata });
}));
router.patch('/:toolName/status', authenticate, requirePermission('mcp.tool.manage'), validate({ body: toolStatusBody }), asyncHandler(async (req, res) => {
    setAuditData(res, { action: 'update_status', entityType: 'mcp_tool', entityId: req.params.toolName });
    await registryService.updateToolStatus(req.params.toolName, req.body.status);
    res.json({ success: true, message: `Tool status updated to ${req.body.status}` });
}));
router.patch('/:toolName/enable', authenticate, requirePermission('mcp.tool.manage'), validate({ body: toolEnableBody }), asyncHandler(async (req, res) => {
    setAuditData(res, { action: req.body.enabled ? 'enable' : 'disable', entityType: 'mcp_tool', entityId: req.params.toolName });
    if (req.body.enabled) {
        await registryService.enableTool(req.params.toolName);
    }
    else {
        await registryService.disableTool(req.params.toolName);
    }
    res.json({ success: true, message: `Tool ${req.body.enabled ? 'enabled' : 'disabled'}` });
}));
router.get('/stats/execution', authenticate, requirePermission('mcp.stats.read'), validate({ query: executionStatsQuery }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { toolName, limit: _limit } = req.query;
    const stats = await executionService.getExecutionStats(tenantId, toolName || undefined);
    res.json({ success: true, data: stats });
}));
router.put('/overrides/:toolName', authenticate, requirePermission('mcp.override.manage'), validate({ body: toolOverrideBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    setAuditData(res, { action: 'upsert_override', entityType: 'mcp_tool_override', entityId: req.params.toolName });
    await registryService.upsertToolOverride(tenantId, { ...req.body, toolName: req.params.toolName });
    res.json({ success: true, message: 'Override applied' });
}));
router.delete('/overrides/:toolName', authenticate, requirePermission('mcp.override.manage'), validate({ body: genericRouteSchema }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    setAuditData(res, { action: 'delete_override', entityType: 'mcp_tool_override', entityId: req.params.toolName });
    await registryService.deleteToolOverride(tenantId, req.params.toolName);
    res.json({ success: true, message: 'Override removed' });
}));
router.post('/logs/purge', authenticate, requirePermission('mcp.admin.manage'), validate({ body: purgeLogsBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    setAuditData(res, { action: 'purge_logs', entityType: 'mcp_execution_log', entityId: tenantId });
    const count = await executionService.purgeOldLogs(tenantId, req.body.retentionDays);
    res.json({ success: true, message: `Purged ${count} old log entries`, purgedCount: count });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=mcp-tool.routes.js.map