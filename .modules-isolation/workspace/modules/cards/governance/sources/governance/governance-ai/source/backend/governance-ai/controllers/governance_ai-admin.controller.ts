import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { GovernanceAiDiagnosticsService } from '../diagnostics/governance-ai-diagnostics.service';
import { GovernanceAiDashboardService } from '../services/operations/governance-ai-dashboard.service';
import { GovernanceAiRuntimeControlService } from '../services/operations/governance-ai-runtime-control.service';
import { checkLifecycleAuth } from '../services/operations/governance-ai-lifecycle-auth.service';

const router = Router();
const diagnosticsService = new GovernanceAiDiagnosticsService();
const dashboardService = new GovernanceAiDashboardService();
const runtimeControlService = new GovernanceAiRuntimeControlService();

router.use(moduleStack('governance-ai'));
router.use(auditMiddleware('governance_ai'));

router.get(
  '/settings',
  authenticate,
  requirePermission('governance_ai.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await runtimeControlService.getSettings(req.tenantId!);
    res.json({ success: true, data: settings });
  }),
);

router.put(
  '/settings',
  authenticate,
  requirePermission('governance_ai.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'settings.update');
    const { key, value } = req.body;
    await runtimeControlService.updateSetting(req.tenantId!, key, value, req.userId!);
    res.json({ success: true, message: 'Setting updated' });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('governance_ai.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await diagnosticsService.runDiagnostics(req.tenantId!);
    res.json({ success: true, data: report });
  }),
);

router.get(
  '/dashboard',
  authenticate,
  requirePermission('governance_ai.health.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await dashboardService.getSummary(req.tenantId!);
    res.json({ success: true, data: summary });
  }),
);

router.get(
  '/feature-flags',
  authenticate,
  requirePermission('governance_ai.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const flags = await runtimeControlService.getFeatureFlags(req.tenantId!);
    res.json({ success: true, data: flags });
  }),
);

export default router;
