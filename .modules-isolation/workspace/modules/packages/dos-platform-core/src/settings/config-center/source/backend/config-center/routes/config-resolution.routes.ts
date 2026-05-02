import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, validate, setAuditData } from '../ports/middleware.port';
import { resolveConfig, resolveManyConfigs, explainResolution } from '../services/config-resolution.service';
import { resolveKeyParamsSchema, resolveBatchBodySchema } from '../schemas/config-center.schemas';
import { ConfigGateway } from '../ports/config-gateway.port';
import { toErrorMessage } from '@dos/module-sdk';

const router = Router();
router.use(auditMiddleware('config-center'));

router.get('/resolve/:key', authenticate, requirePermission('config.setting.read'), async (req: Request, res: Response) => {
  try {
    const { key } = resolveKeyParamsSchema.parse(req.params);
    const result = await resolveConfig(key, {
      tenantId: req.tenantId,
      userId: req.user?.userId,
      moduleCode: req.query.moduleCode as string,
      roleCode: req.query.roleCode as string,
    });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/resolve/batch', authenticate, requirePermission('config.setting.read'), validate({ body: resolveBatchBodySchema }), async (req: Request, res: Response) => {
  try {
    const { keys } = req.body;
    const results = await resolveManyConfigs(keys, {
      tenantId: req.tenantId,
      userId: req.user?.userId,
    });
    res.json({ results, count: results.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/explain/:key', authenticate, requirePermission('config.setting.read'), async (req: Request, res: Response) => {
  try {
    const { key } = resolveKeyParamsSchema.parse(req.params);
    const explanation = await explainResolution(key, {
      tenantId: req.tenantId,
      userId: req.user?.userId,
      moduleCode: req.query.moduleCode as string,
    });
    res.json(explanation);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/gateway/inventory', authenticate, requirePermission('config.health.read'), async (_req: Request, res: Response) => {
  try {
    const inventory = ConfigGateway.getFullInventory();
    res.json({
      total: inventory.length,
      bootstrapKeys: inventory.filter(i => i.bootstrap).length,
      overriddenKeys: inventory.filter(i => i.hasOverride).length,
      items: inventory,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/gateway/overrides', authenticate, requirePermission('config.health.read'), async (_req: Request, res: Response) => {
  try {
    res.json({ overrides: ConfigGateway.getOverrides() });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.put('/gateway/override/:key', authenticate, requirePermission('config.setting.write'), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (ConfigGateway.isBootstrapKey(key)) {
      res.status(403).json({ error: `Key '${key}' is a bootstrap key and cannot be overridden at runtime. It must be set via environment variables before server start.` });
      return;
    }
    ConfigGateway.setOverride(key, value, req.user!.userId);
    setAuditData(res, { entityType: 'config_override', entityId: key, action: 'override_set' });
    res.json({ ok: true, key });
  } catch (err: unknown) {
    res.status(400).json({ error: toErrorMessage(err) });
  }
});

router.delete('/gateway/override/:key', authenticate, requirePermission('config.setting.write'), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    ConfigGateway.clearOverride(key);
    setAuditData(res, { entityType: 'config_override', entityId: key, action: 'override_cleared' });
    res.json({ ok: true, key });
  } catch (err: unknown) {
    res.status(400).json({ error: toErrorMessage(err) });
  }
});

router.post('/gateway/invalidate', authenticate, requirePermission('config.setting.write'), async (req: Request, res: Response) => {
  try {
    const { key } = req.body ?? {};
    ConfigGateway.invalidateCache(key);
    res.json({ ok: true, invalidated: key ?? 'all' });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/gateway/workspace-config', authenticate, requirePermission('config.setting.read'), async (_req: Request, res: Response) => {
  try {
    const inventory = ConfigGateway.getFullInventory();
    const wsItems = inventory.filter(i => i.key.startsWith('WORKSPACE_'));
    const config: Record<string, unknown> = {};
    for (const item of wsItems) {
      const shortKey = item.key.replace('WORKSPACE_', '').toLowerCase();
      config[shortKey] = item.currentValue;
    }
    res.json({ config, count: wsItems.length, items: wsItems });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/gateway/shell-override', authenticate, requirePermission('config.setting.read'), async (_req: Request, res: Response) => {
  try {
    const g = (key: string): unknown => ConfigGateway.getSync(key);
    const toBool = (v: unknown): boolean | undefined => v === true || v === 'true' ? true : v === false || v === 'false' ? false : undefined;
    const toNum = (v: unknown): number | undefined => v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : undefined;

    const override: Record<string, unknown> = {
      source: 'tenant-override',
      priority: 30,
    };

    const defaultView = g('WORKSPACE_DEFAULT_VIEW');
    if (defaultView) override.defaultView = defaultView;

    const viewModes = g('WORKSPACE_DEFAULT_VIEW');
    if (viewModes && typeof viewModes === 'string') override.viewModes = [viewModes, 'table', 'cards'].filter((v, i, a) => a.indexOf(v) === i);

    const kpiMax = toNum(g('WORKSPACE_KPI_MAX_VISIBLE'));
    if (kpiMax !== undefined) override.kpiMaxVisible = kpiMax;

    const drawerPos = g('WORKSPACE_DETAIL_DRAWER_POS');
    if (drawerPos === 'right' || drawerPos === 'bottom') override.detailDrawerPosition = drawerPos;

    const footerEnabled = toBool(g('WORKSPACE_FOOTER_ENABLED'));
    if (footerEnabled !== undefined) override.footerEnabled = footerEnabled;

    const contextRail = toBool(g('WORKSPACE_CONTEXT_RAIL_VISIBLE'));
    const aiPanel = toBool(g('WORKSPACE_AI_PANEL_VISIBLE'));
    const workflowRibbon = toBool(g('WORKSPACE_WORKFLOW_RIBBON'));
    if (contextRail !== undefined || aiPanel !== undefined || workflowRibbon !== undefined) {
      const visibleSlots: Record<string, boolean> = {};
      if (contextRail !== undefined) visibleSlots['context-rail'] = contextRail;
      if (aiPanel !== undefined) visibleSlots['ai-recommendations'] = aiPanel;
      if (workflowRibbon !== undefined) visibleSlots['workflow-ribbon'] = workflowRibbon;
      override.visibleSlots = visibleSlots;
    }

    const panelWidth = g('WORKSPACE_DETAIL_DRAWER_WIDTH');
    if (panelWidth) {
      override.panelWidths = { 'detail-drawer': panelWidth };
    }

    res.json({ override });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.put('/gateway/workspace-batch', authenticate, requirePermission('config.setting.write'), async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Body must contain { updates: Record<string, unknown> }' });
      return;
    }
    const results: { key: string; ok: boolean; error?: string }[] = [];
    for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
      const fullKey = key.startsWith('WORKSPACE_') ? key : `WORKSPACE_${key.toUpperCase()}`;
      try {
        if (ConfigGateway.isBootstrapKey(fullKey)) {
          results.push({ key: fullKey, ok: false, error: 'Bootstrap key' });
          continue;
        }
        ConfigGateway.setOverride(fullKey, value, req.user!.userId);
        results.push({ key: fullKey, ok: true });
      } catch (err: unknown) {
        results.push({ key: fullKey, ok: false, error: toErrorMessage(err) });
      }
    }
    setAuditData(res, { entityType: 'workspace_config', entityId: 'batch', action: 'workspace_batch_update' });
    res.json({ ok: true, results, updated: results.filter(r => r.ok).length });
  } catch (err: unknown) {
    res.status(400).json({ error: toErrorMessage(err) });
  }
});

export default router;
