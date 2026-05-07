// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, validate, asyncHandler } from '../ports/mcp.ports.js';
import * as service from '../services/mcp.service.js';
import { CreateToolSchema, CreateAgentSchema, BindToolSchema, LogExecutionSchema } from '../schemas/mcp.schemas.js';
import { z } from "zod";
const router = Router();
// §6: /api/mcp/tools
router.get('/tools', authenticate, requirePermission('mcp.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tools = await service.getTools(req.tenantId);
    res.json({ data: tools });
}));
router.post('/tools', authenticate, requirePermission('mcp.manage'), validate({ body: CreateToolSchema }), asyncHandler(async (req, res) => {
    const tool = await service.createTool(req.tenantId, req.user.id, req.body);
    res.status(201).json({ data: tool });
}));
// §6: /api/mcp/agents
router.get('/agents', authenticate, requirePermission('mcp.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const agents = await service.getAgents(req.tenantId);
    res.json({ data: agents });
}));
router.post('/agents', authenticate, requirePermission('mcp.manage'), validate({ body: CreateAgentSchema }), asyncHandler(async (req, res) => {
    const agent = await service.createAgent(req.tenantId, req.user.id, req.body);
    res.status(201).json({ data: agent });
}));
router.post('/agents/:id/tools', authenticate, requirePermission('mcp.manage'), validate({ body: BindToolSchema }), asyncHandler(async (req, res) => {
    await service.bindToolToAgent(req.tenantId, req.user.id, req.params.id, req.body.toolId);
    res.json({ data: { success: true } });
}));
// §6: /api/mcp/executions
router.post('/executions/log', authenticate, requirePermission('mcp.execute'), validate({ body: LogExecutionSchema }), asyncHandler(async (req, res) => {
    const log = await service.logExecution(req.tenantId, req.user.id, req.body);
    res.status(201).json({ data: log });
}));
router.get('/agents/:id/executions', authenticate, requirePermission('mcp.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const logs = await service.getExecutionLogs(req.tenantId, req.params.id);
    res.json({ data: logs });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=mcp.routes.js.map