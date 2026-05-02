import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, validate, setAuditData } from '../ports/middleware.port';
import { getConfigSetting, getConfigSettingsForScope, upsertConfigSetting, deleteConfigSetting } from '../services/config-settings.service';
import { upsertSettingBodySchema, resolveAllQuerySchema } from '../schemas/config-center.schemas';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { SettingsScope } from '@dos/platform-core/settings/settings-resolver.service';

const router = Router();
router.use(auditMiddleware('config-center'));

router.get('/settings', authenticate, requirePermission('config.setting.read'), async (req: Request, res: Response) => {
  try {
    const query = resolveAllQuerySchema.parse(req.query);
    const scope: SettingsScope = (query.scope as SettingsScope) ?? 'tenant';
    const settings = await getConfigSettingsForScope(req.tenantId, scope, {
      moduleCode: query.moduleCode,
      productKey: query.productKey,
    });
    res.json({ settings, count: settings.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/settings/:key', authenticate, requirePermission('config.setting.read'), async (req: Request, res: Response) => {
  try {
    const scope: SettingsScope = (req.query.scope as SettingsScope) ?? 'tenant';
    const setting = await getConfigSetting(req.tenantId, scope, req.params.key);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json(setting);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.put('/settings/:key', authenticate, requirePermission('config.setting.write'), validate({ body: upsertSettingBodySchema }), async (req: Request, res: Response) => {
  try {
    const { value, scope, moduleCode, productKey, workspaceId, reason } = req.body;
    await upsertConfigSetting(req.tenantId, req.params.key, value, req.user!.userId, {
      scope: scope ?? 'tenant',
      moduleCode,
      productKey,
      workspaceId,
      reason,
    });
    setAuditData(res, { entityType: 'config_setting', entityId: req.params.key, action: 'upsert' });
    emitEvent({
      tenantId: req.tenantId,
      userId: req.user!.userId,
      module: 'config-center',
      event: 'setting_updated',
      entityType: 'config_setting',
      entityId: req.params.key,
      data: { key: req.params.key, scope: scope ?? 'tenant' },
    } as any);
    res.json({ ok: true, key: req.params.key });
  } catch (err: unknown) {
    res.status(400).json({ error: toErrorMessage(err) });
  }
});

router.delete('/settings/:key', authenticate, requirePermission('config.setting.write'), async (req: Request, res: Response) => {
  try {
    const scope: SettingsScope = (req.query.scope as SettingsScope) ?? 'tenant';
    await deleteConfigSetting(req.tenantId, req.params.key, scope, req.user!.userId);
    setAuditData(res, { entityType: 'config_setting', entityId: req.params.key, action: 'delete' });
    emitEvent({
      tenantId: req.tenantId,
      userId: req.user!.userId,
      module: 'config-center',
      event: 'setting_deleted',
      entityType: 'config_setting',
      entityId: req.params.key,
      data: { key: req.params.key, scope },
    } as any);
    res.json({ ok: true, key: req.params.key });
  } catch (err: unknown) {
    res.status(400).json({ error: toErrorMessage(err) });
  }
});

export default router;
