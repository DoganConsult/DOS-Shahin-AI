import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port.js';
import { asyncHandler, moduleStack } from '../ports/middleware.port.js';
import * as serverService from '../services/mcp-server.service.js';
import * as executionService from '../services/mcp-execution.service.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('mcp'));
router.get('/info', authenticate, requirePermission('mcp.tool.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req, res) => {
    const info = serverService.getServerInfo();
    res.json({ success: true, data: info });
}));
router.get('/health', authenticate, requirePermission('mcp.stats.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
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
}));
router.get('/diagnostics', authenticate, requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const diagnostics = await executionService.getDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
}));
export default router;
//# sourceMappingURL=mcp-server.routes.js.map