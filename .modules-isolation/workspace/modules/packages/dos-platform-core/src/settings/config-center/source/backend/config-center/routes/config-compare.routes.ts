import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware } from '../ports/middleware.port';
import { compareTenants, compareTenantToDefaults } from '../services/config-compare.service';
import { compareTenantsQuerySchema } from '../schemas/config-center.schemas';
import { toErrorMessage } from '@dos/module-sdk';
import type { SettingsScope } from '@dos/platform-core/settings/settings-resolver.service';

const router = Router();
router.use(auditMiddleware('config-center'));

router.get('/compare/tenants', authenticate, requirePermission('config.compare.read'), async (req: Request, res: Response) => {
  try {
    const query = compareTenantsQuerySchema.parse(req.query);
    const diffs = await compareTenants(query.tenantA, query.tenantB, query.scope as SettingsScope);
    const mismatches = diffs.filter(d => !d.match);
    res.json({ diffs, total: diffs.length, mismatches: mismatches.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/compare/defaults', authenticate, requirePermission('config.compare.read'), async (req: Request, res: Response) => {
  try {
    const diffs = await compareTenantToDefaults(req.tenantId);
    const mismatches = diffs.filter(d => !d.match);
    res.json({ diffs, total: diffs.length, mismatches: mismatches.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
