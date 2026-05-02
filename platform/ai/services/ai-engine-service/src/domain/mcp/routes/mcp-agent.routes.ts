// @ts-nocheck
import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, validate } from '../ports/middleware.port';
import * as registryService from '../services/mcp-registry.service';
import { agentEnableBody, agentStatusBody as _agentStatusBody } from '../schemas/mcp.schemas';
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('mcp'));
router.use(auditMiddleware('mcp'));

router.get(
  '/',
  authenticate,
  requirePermission('mcp.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
    const agents = await registryService.listAgents();
    const agentsWithTools = await Promise.all(
      agents.map(async (agent) => {
        const tools = await registryService.getToolsForAgent('default', agent.agentId);
        return { ...agent, toolCount: tools.length };
      }),
    );
    res.json({ success: true, data: agentsWithTools, total: agentsWithTools.length });
  }),
);

router.get(
  '/all',
  authenticate,
  requirePermission('mcp.agent.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
    const agents = await registryService.listAllAgents();
    res.json({ success: true, data: agents, total: agents.length });
  }),
);

router.get(
  '/:agentId',
  authenticate,
  requirePermission('mcp.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const agent = await registryService.getAgent(req.params.agentId);
    if (!agent) { res.status(404).json({ success: false, error: 'Agent not found' }); return; }
    const tenantId = req.tenantId;
    const tools = await registryService.getToolsForAgent(tenantId, agent.agentId);
    res.json({ success: true, data: { ...agent, tools } });
  }),
);

router.get(
  '/:agentId/tools',
  authenticate,
  requirePermission('mcp.tool.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const tools = await registryService.getToolsForAgent(tenantId, req.params.agentId);
    res.json({ success: true, data: tools, total: tools.length });
  }),
);

router.patch(
  '/:agentId/enable',
  authenticate,
  requirePermission('mcp.agent.manage'),
  validate({ body: agentEnableBody }),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.body.enabled) {
      await registryService.enableAgent(req.params.agentId);
    } else {
      await registryService.disableAgent(req.params.agentId);
    }
    res.json({ success: true, message: `Agent ${req.body.enabled ? 'enabled' : 'disabled'}` });
  }),
);

export default router;

let genericPayloadSchema = z.record(z.unknown());
