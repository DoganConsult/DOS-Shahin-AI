import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware } from '../ports/middleware.port';
import { getConfigAuditHistory } from '../services/config-audit.service';
import { auditQuerySchema } from '../schemas/config-center.schemas';
import { toErrorMessage } from '@dos/module-sdk';

const router = Router();
router.use(auditMiddleware('config-center'));

router.get('/audit', authenticate, requirePermission('config.audit.read'), async (req: Request, res: Response) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const entries = await getConfigAuditHistory(req.tenantId, {
      key: query.key,
      actorId: query.actorId,
      scope: query.scope,
      limit: query.limit,
      offset: query.offset,
    });
    res.json({ entries, count: entries.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/audit/:key', authenticate, requirePermission('config.audit.read'), async (req: Request, res: Response) => {
  try {
    const entries = await getConfigAuditHistory(req.tenantId, {
      key: req.params.key,
      limit: 100,
    });
    res.json({ entries, count: entries.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
