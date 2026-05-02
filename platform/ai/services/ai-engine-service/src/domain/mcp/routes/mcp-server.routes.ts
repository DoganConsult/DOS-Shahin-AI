import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack } from '../ports/middleware.port';
import * as serverService from '../services/mcp-server.service';
import * as executionService from '../services/mcp-execution.service';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('mcp'));

router.get(
  '/info',
  authenticate,
  requirePermission('mcp.tool.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
    const info = serverService.getServerInfo();
    res.json({ success: true, data: info });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('mcp.stats.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const health = await executionService.getHealthReport(tenantId);
    res.json({
      success: true,
      data: {
        serverStatus: health.serverStatus,
        registryStats: health.registryStats,
        executionStats: health.executionStats,
        sessionStats: health.sessionStats,
        overallHealth: health.overallHealth,
        warnings: health.warnings,
        errors: health.errors,
      },
    });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const diagnostics = await executionService.getDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
  }),
);

export default router;
