/**
 * Settings REST router (W26) — sub-router on composite `/api/compliance`.
 *
 *   GET    /settings                list (scope, isActive, paging)
 *   GET    /settings/:id            single by uuid
 *   GET    /settings/by-key/:key    single by config_key
 *   PUT    /settings                upsert (configKey + configValue [+ scope, isActive])
 *   DELETE /settings/:id            deactivate (sets is_active=false)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listSettings, getSetting, getSettingByKey,
  upsertSetting, deactivateSetting,
} from '../../application/settings/settings.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface SettingsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface SettingsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => SettingsRouterContext | Promise<SettingsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: SettingsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

const parseBool = (q: unknown): boolean | undefined => {
  if (q === 'true') return true;
  if (q === 'false') return false;
  return undefined;
};

export function createSettingsRouter(deps: SettingsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_settings_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/settings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'setting.config.read', res))) return;
    try {
      const out = await listSettings(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        scope: typeof req.query.scope === 'string' ? (req.query.scope as never) : undefined,
        isActive: parseBool(req.query.isActive),
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_scope') return fail(res, 400, 'bad_scope', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/settings/by-key/:key', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'setting.config.read', res))) return;
    try {
      const row = await getSettingByKey(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, configKey: req.params.key,
      });
      if (!row) return fail(res, 404, 'not_found', `setting key=${req.params.key} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.get('/settings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'setting.config.read', res))) return;
    try {
      const row = await getSetting(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `setting ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.put('/settings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'setting.config.write', res))) return;
    try {
      const configKey = typeof req.body?.configKey === 'string' ? req.body.configKey : '';
      const configValue = req.body?.configValue && typeof req.body.configValue === 'object'
        ? req.body.configValue : null;
      const before = configKey ? await getSettingByKey(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, configKey,
      }) : null;
      const upserted = await upsertSetting(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        configKey, configValue: (configValue as Record<string, unknown>) ?? {},
        scope: typeof req.body?.scope === 'string' ? (req.body.scope as never) : undefined,
        isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance',
          action: before ? 'setting.update' : 'setting.create',
          resourceType: 'compliance_setting', resourceId: upserted.id,
          before: before ? { configValue: before.configValue, isActive: before.isActive } : undefined,
          after: { configValue: upserted.configValue, isActive: upserted.isActive },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(before ? 200 : 201).json({ data: upserted });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_scope') return fail(res, 400, 'bad_scope', err.message);
      return fail(res, 500, 'upsert_failed', String(err.message));
    }
  });

  router.delete('/settings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'setting.config.write', res))) return;
    try {
      const before = await getSetting(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `setting ${req.params.id} not found`);
      const updated = await deactivateSetting(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id,
      });
      if (!updated) return fail(res, 404, 'not_found', `setting ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'setting.deactivate',
          resourceType: 'compliance_setting', resourceId: updated.id,
          before: { isActive: before.isActive },
          after: { isActive: updated.isActive },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'deactivate_failed', String(err.message));
    }
  });

  return router;
}
