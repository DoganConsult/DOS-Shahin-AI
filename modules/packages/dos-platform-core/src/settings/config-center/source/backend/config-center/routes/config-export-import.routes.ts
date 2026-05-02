import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, validate, setAuditData } from '../ports/middleware.port';
import { exportConfig, importConfig } from '../services/config-export-import.service';
import { importConfigBodySchema } from '../schemas/config-center.schemas';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { initiateApproval } from '../../workflow/services/approvals/approval-routing.service';
import { findApprovalRule } from '../../../platform/dauth/registry/module-security-seeder.registry';
import type { SettingsScope } from '@dos/platform-core/settings/settings-resolver.service';

const router = Router();
router.use(auditMiddleware('config-center'));

router.get('/export', authenticate, requirePermission('config.export.read'), async (req: Request, res: Response) => {
  try {
    const scopesParam = req.query.scopes as string | undefined;
    const scopes = scopesParam ? scopesParam.split(',') as SettingsScope[] : undefined;
    const snapshot = await exportConfig(req.tenantId, req.user!.userId, scopes);
    setAuditData(res, { entityType: 'config_snapshot', entityId: req.tenantId, action: 'export' });
    emitEvent({
      tenantId: req.tenantId,
      userId: req.user!.userId,
      module: 'config-center',
      event: 'config_exported',
      entityType: 'config_snapshot',
      entityId: req.tenantId,
      data: { settingCount: snapshot.metadata.settingCount },
    } as any);
    res.json(snapshot);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/import', authenticate, requirePermission('config.import.write'), validate({ body: importConfigBodySchema }), async (req: Request, res: Response) => {
  try {
    const { snapshot, dryRun } = req.body;

    if (dryRun) {
      const result = await importConfig(req.tenantId, snapshot, req.user!.userId, true);
      res.json(result);
      return;
    }

    const approvalRule = findApprovalRule('config-center', 'config_snapshot', 'pending_import', 'imported');

    if (approvalRule) {
      const approval = await initiateApproval(req.tenantId, {
        entityType: 'config_snapshot',
        entityId: req.tenantId,
        action: 'import',
        requestedBy: req.user!.userId,
        routeId: 'config-center.import',
        context: {
          settingCount: Object.keys(snapshot.settings).length,
          exportedAt: snapshot.exportedAt,
          exportedBy: snapshot.exportedBy,
        },
      });

      setAuditData(res, { entityType: 'config_snapshot', entityId: req.tenantId, action: 'import_requested' });
      res.json({
        imported: 0,
        skipped: 0,
        errors: [],
        dryRun: false,
        approvalRequired: true,
        approvalRequestId: approval.requestId,
        status: 'pending_approval',
      });
      return;
    }

    const result = await importConfig(req.tenantId, snapshot, req.user!.userId, false);
    setAuditData(res, { entityType: 'config_snapshot', entityId: req.tenantId, action: 'import' });
    emitEvent({
      tenantId: req.tenantId,
      userId: req.user!.userId,
      module: 'config-center',
      event: 'config_imported',
      entityType: 'config_snapshot',
      entityId: req.tenantId,
      data: { imported: result.imported, skipped: result.skipped },
    } as any);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: toErrorMessage(err) });
  }
});

export default router;
