/**
 * Runtime-config HTTP router.
 *
 * Mounts under `/api/compliance` (subpaths are explicit and stable):
 *   GET    /runtime-config/:kind/:type
 *   PUT    /runtime-config/:kind/:type
 *   GET    /views/:scopeType
 *   PUT    /views/:scopeType/:viewKey
 *   POST   /views/:scopeType/:viewKey/share
 *   DELETE /views/:scopeType/:viewKey
 *
 * The router is constructed with a DbClient + a tenant/actor resolver; the host
 * supplies the resolver so headers/middleware can vary per service.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  getConfig,
  saveConfig,
  listViews,
  saveViewPreset,
  shareViewPreset,
  deleteViewPreset,
  type ConfigKind,
} from '../../application/runtime-config/runtime-config.service';

export interface RequestContext {
  tenantId: string;
  userId: string;
}

export interface RuntimeConfigRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RequestContext | Promise<RequestContext>;
}

const VALID_KINDS: ReadonlyArray<ConfigKind> = ['list', 'detail', 'form', 'filters', 'columns', 'actions', 'views'];

const isKind = (s: string): s is ConfigKind => (VALID_KINDS as readonly string[]).includes(s);

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

export function createRuntimeConfigRouter(deps: RuntimeConfigRouterDeps): ExpressRouter {
  const router = Router();

  const ctx = async (req: Request, res: Response) => {
    try { return await deps.resolveContext(req); }
    catch (err) { fail(res, 401, 'no_context', String((err as Error).message)); return null; }
  };

  router.get('/runtime-config/:kind/:type', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { kind, type } = req.params;
    if (!isKind(kind)) return fail(res, 400, 'bad_kind', `kind must be one of ${VALID_KINDS.join(',')}`);
    const r = await getConfig(deps, { kind, type, tenantId: c.tenantId });
    if (!r) return fail(res, 404, 'not_found', `no config for ${kind}/${type}`);
    res.json({ data: r });
  });

  router.put('/runtime-config/:kind/:type', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { kind, type } = req.params;
    if (!isKind(kind)) return fail(res, 400, 'bad_kind', `kind must be one of ${VALID_KINDS.join(',')}`);
    const payload = req.body?.payload;
    if (payload === undefined) return fail(res, 400, 'missing_payload', 'body.payload required');
    const version = typeof req.body?.version === 'number' ? req.body.version : undefined;
    const rec = await saveConfig(deps, { kind, type, tenantId: c.tenantId, version }, payload, c.userId);
    res.status(200).json({ data: rec });
  });

  router.get('/views/:scopeType', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const rows = await listViews(deps, { tenantId: c.tenantId, userId: c.userId, scopeType: req.params.scopeType });
    res.json({ data: rows });
  });

  router.put('/views/:scopeType/:viewKey', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const payload = req.body?.payload;
    if (payload === undefined) return fail(res, 400, 'missing_payload', 'body.payload required');
    const r = await saveViewPreset(deps, {
      tenantId: c.tenantId, userId: c.userId,
      scopeType: req.params.scopeType, viewKey: req.params.viewKey, payload,
    });
    res.status(200).json({ data: r });
  });

  router.post('/views/:scopeType/:viewKey/share', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const payload = req.body?.payload;
    if (payload === undefined) return fail(res, 400, 'missing_payload', 'body.payload required');
    const sharedWith: string[] | undefined = Array.isArray(req.body?.sharedWith) ? req.body.sharedWith : undefined;
    const r = await shareViewPreset(deps, {
      tenantId: c.tenantId, userId: c.userId,
      scopeType: req.params.scopeType, viewKey: req.params.viewKey, payload, sharedWith,
    });
    res.status(200).json({ data: r });
  });

  router.delete('/views/:scopeType/:viewKey', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const r = await deleteViewPreset(deps, {
      tenantId: c.tenantId, userId: c.userId,
      scopeType: req.params.scopeType, viewKey: req.params.viewKey,
    });
    res.status(r.deleted ? 200 : 404).json({ data: r });
  });

  return router;
}
