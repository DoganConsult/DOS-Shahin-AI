/**
 * Crosswalk-Mappings REST router (W45) — sub-router on composite `/api/compliance`.
 *
 *   GET    /crosswalk-mappings           list (sourceControlId, targetRequirementId, relationship)
 *   GET    /crosswalk-mappings/:id       single
 *   POST   /crosswalk-mappings           create
 *   DELETE /crosswalk-mappings/:id       remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listCrosswalkMappings, getCrosswalkMapping,
  createCrosswalkMapping, deleteCrosswalkMapping,
  type CrosswalkRelationship,
} from '../../application/crosswalk-mappings/crosswalk-mappings.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface CrosswalkMappingsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface CrosswalkMappingsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => CrosswalkMappingsRouterContext | Promise<CrosswalkMappingsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: CrosswalkMappingsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createCrosswalkMappingsRouter(deps: CrosswalkMappingsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_crosswalk_mappings_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/crosswalk-mappings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'crosswalk_mapping.mapping.read', res))) return;
    try {
      const out = await listCrosswalkMappings(deps.client, {
        tenantSchema: ctx.tenantSchema,
        sourceControlId: typeof req.query.sourceControlId === 'string' ? req.query.sourceControlId : undefined,
        targetRequirementId: typeof req.query.targetRequirementId === 'string' ? req.query.targetRequirementId : undefined,
        relationship: typeof req.query.relationship === 'string'
          ? req.query.relationship as CrosswalkRelationship : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/crosswalk-mappings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'crosswalk_mapping.mapping.read', res))) return;
    try {
      const row = await getCrosswalkMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, mappingId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `mapping ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/crosswalk-mappings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'crosswalk_mapping.mapping.write', res))) return;
    try {
      const created = await createCrosswalkMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        sourceControlId: typeof req.body?.sourceControlId === 'string' ? req.body.sourceControlId : '',
        targetRequirementId: typeof req.body?.targetRequirementId === 'string' ? req.body.targetRequirementId : '',
        relationship: typeof req.body?.relationship === 'string'
          ? req.body.relationship as CrosswalkRelationship : undefined,
        confidence: typeof req.body?.confidence === 'number' ? req.body.confidence : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'crosswalk_mapping.create',
          resourceType: 'crosswalk_mapping', resourceId: created.mappingId,
          after: {
            sourceControlId: created.sourceControlId,
            targetRequirementId: created.targetRequirementId,
            relationship: created.relationship,
            confidence: created.confidence,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_relationship') return fail(res, 400, 'bad_relationship', err.message);
      if (err.code === 'bad_confidence') return fail(res, 400, 'bad_confidence', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.delete('/crosswalk-mappings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'crosswalk_mapping.mapping.write', res))) return;
    try {
      const before = await getCrosswalkMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, mappingId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `mapping ${req.params.id} not found`);
      const removed = await deleteCrosswalkMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, mappingId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `mapping ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'crosswalk_mapping.delete',
          resourceType: 'crosswalk_mapping', resourceId: removed.mappingId,
          before: {
            sourceControlId: before.sourceControlId,
            targetRequirementId: before.targetRequirementId,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(204).end();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'delete_failed', String(err.message));
    }
  });

  return router;
}
