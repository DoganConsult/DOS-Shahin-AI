import { Router, Response } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack, auditMiddleware } from '../ports/middleware.port';
import { ok } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { WidgetRegistryService } from '../services/registry/widget-registry.service';
import { WidgetDiagnosticsService } from '../diagnostics/widgets-diagnostics.service';
import type { AuthenticatedRequest } from '@dos/types';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('widgets'));
router.use(auditMiddleware('widgets'));

router.get('/settings',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['widgets'],
    ).catch(() => ({ rows: [] }));
    res.json(ok(rows, req));
  }),
);

router.get('/health',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const diagnostics = new WidgetDiagnosticsService(req.tenantId!);
    const result = await diagnostics.runDiagnostics();
    res.json(ok(result, req));
  }),
);

router.get('/summary',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const registryService = new WidgetRegistryService(req.tenantId!);
    const statusCounts = await registryService.getStatusCounts();
    res.json(ok({ statusCounts }, req));
  }),
);

export async function getConfig(_tenantId: string): Promise<Record<string, unknown>> { return {}; }
export async function updateConfig(_tenantId: string, _body: Record<string, unknown>): Promise<Record<string, unknown>> { return {}; }

export default router;
