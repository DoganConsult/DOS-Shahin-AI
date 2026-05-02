import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware } from '../ports/middleware.port';
import { checkEnvHealth, checkSecretBindings, detectConfigDrift } from '../services/config-health.service';
import { runConfigDiagnostics } from '../services/config-diagnostics.service';
import { toErrorMessage } from '@dos/module-sdk';

const router = Router();
router.use(auditMiddleware('config-center'));

router.get('/health/env', authenticate, requirePermission('config.health.read'), async (_req: Request, res: Response) => {
  try {
    const report = checkEnvHealth();
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/health/secrets', authenticate, requirePermission('config.health.read'), async (_req: Request, res: Response) => {
  try {
    const report = checkSecretBindings();
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/health/drift', authenticate, requirePermission('config.health.read'), async (req: Request, res: Response) => {
  try {
    const report = await detectConfigDrift(req.tenantId);
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/health/diagnostics', authenticate, requirePermission('config.health.read'), async (req: Request, res: Response) => {
  try {
    const report = await runConfigDiagnostics(req.tenantId);
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
