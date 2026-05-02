/**
 * Compliance-Calculator REST router (W57) — sub-router on `/api/compliance`.
 *
 *   GET    /compliance-calculator                 list (scope, scopeRef)
 *   GET    /compliance-calculator/:id             single
 *   GET    /compliance-calculator/latest          latest snapshot for scope+scopeRef
 *   POST   /compliance-calculator/run             trigger immutable calculation
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listCalculations, getCalculation, getLatestCalculation, runCalculation,
  type CalculationScope,
} from '../../application/compliance-calculator/compliance-calculator.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ComplianceCalculatorRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ComplianceCalculatorRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ComplianceCalculatorRouterContext | Promise<ComplianceCalculatorRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ComplianceCalculatorRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createComplianceCalculatorRouter(deps: ComplianceCalculatorRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_calculator_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/compliance-calculator', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_calculator.calc.read', res))) return;
    try {
      const out = await listCalculations(deps.client, {
        tenantSchema: ctx.tenantSchema,
        scope: typeof req.query.scope === 'string' ? req.query.scope as CalculationScope : undefined,
        scopeRef: typeof req.query.scopeRef === 'string' ? req.query.scopeRef : undefined,
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

  router.get('/compliance-calculator/latest', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_calculator.calc.read', res))) return;
    const scope = typeof req.query.scope === 'string' ? req.query.scope as CalculationScope : undefined;
    const scopeRef = typeof req.query.scopeRef === 'string' ? req.query.scopeRef : undefined;
    if (!scope || !scopeRef) return fail(res, 400, 'bad_input', 'scope and scopeRef required');
    try {
      const row = await getLatestCalculation(deps.client, {
        tenantSchema: ctx.tenantSchema, scope, scopeRef,
      });
      if (!row) return fail(res, 404, 'not_found', `no snapshot for ${scope}:${scopeRef}`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.get('/compliance-calculator/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_calculator.calc.read', res))) return;
    try {
      const row = await getCalculation(deps.client, {
        tenantSchema: ctx.tenantSchema, calculationId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `calculation ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/compliance-calculator/run', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_calculator.calc.write', res))) return;
    try {
      const created = await runCalculation(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        scope: typeof req.body?.scope === 'string' ? req.body.scope as CalculationScope : '' as CalculationScope,
        scopeRef: typeof req.body?.scopeRef === 'string' ? req.body.scopeRef : '',
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'compliance_calculator.run',
          resourceType: 'compliance_calculation', resourceId: created.calculationId,
          after: {
            scope: created.scope, scopeRef: created.scopeRef, scorePct: created.scorePct,
            total: created.totalRequirements, openGaps: created.openGaps,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_scope') return fail(res, 400, 'bad_scope', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
