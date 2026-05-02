import { Request, Response, Router } from 'express';
import { z } from "zod";
import { logger } from '../../ports/logger.port';
/**
 * Audit Package Export Routes
 *
 * Endpoint for generating and downloading audit evidence ZIP packages.
 *
 * Requirements: 20.1
 */


import { authenticate, requirePermission } from '../../ports/auth.port';
import { generateAuditPackage } from '../../services/audit/reporting/audit-package-exporter.service';
import { toErrorMessage } from '@dos/module-sdk';

import { auditMiddleware, moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));

// GET /api/audit-package/:tenantId — Generate and download audit package ZIP
router.get('/:tenantId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const options: { controlDomains?: string[]; dateRange?: { from: string; to: string }; userRole?: string } = {};
    if (req.query.controlDomains) {
      options.controlDomains = (req.query.controlDomains as string).split(',');
    }
    if (req.query.dateFrom && req.query.dateTo) {
      options.dateRange = {
        from: req.query.dateFrom as string,
        to: req.query.dateTo as string,
      };
    }
    // P5.5: Pass user role for clearance filtering
    if (req.user?.role) {
      options.userRole = req.user.role;
    }

    const zipBuffer = await generateAuditPackage(tenantId, options);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="audit-package-${tenantId}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length.toString());
    res.send(zipBuffer);
  } catch (err: unknown) {
    logger.error(`[audit-package] ZIP generation failed for tenant ${req.params.tenantId}:`, toErrorMessage(err));
    res.status(500).json({ error: 'Audit package generation failed' });
  }
});

export default router;
