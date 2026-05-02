/**
 * AI router — narrow surface backed by the bound AI port.
 *
 *   POST /ai/suggestions/list   { scopeType, recordId?, context? } → AiSuggestion[]
 *   POST /ai/query/interpret    { scopeType, query }               → AiInterpretResult
 *   POST /ai/classify           { scopeType, text, taxonomy }      → AiClassifyResult
 *
 * Returns 503 when the host has not bound an AI implementation, instead of
 * silently faking a score.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { getAiPort } from '../../ports/ai.port';

export interface AiRouterDeps {
  resolveContext: (req: Request) => { tenantId: string; userId: string } | Promise<{ tenantId: string; userId: string }>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const handleAiError = (res: Response, err: unknown) => {
  const e = err as Error;
  if (/not bound/.test(e.message)) return fail(res, 503, 'ai_unavailable', e.message);
  return fail(res, 500, 'ai_failed', String(e.message ?? e));
};

export function createAiRouter(deps: AiRouterDeps): ExpressRouter {
  const router = Router();

  const ctx = async (req: Request, res: Response) => {
    try { return await deps.resolveContext(req); }
    catch (err) { fail(res, 401, 'no_context', String((err as Error).message)); return null; }
  };

  router.post('/ai/suggestions/list', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { scopeType, recordId, context } = req.body ?? {};
    if (typeof scopeType !== 'string') return fail(res, 400, 'bad_scope', 'scopeType required');
    try {
      const out = await getAiPort().suggest({
        tenantId: c.tenantId, actorId: c.userId, scopeType, recordId, context,
      });
      res.json({ data: out });
    } catch (err) { handleAiError(res, err); }
  });

  router.post('/ai/query/interpret', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { scopeType, query } = req.body ?? {};
    if (typeof scopeType !== 'string') return fail(res, 400, 'bad_scope', 'scopeType required');
    if (typeof query !== 'string') return fail(res, 400, 'bad_query', 'query required');
    try {
      const out = await getAiPort().interpretQuery({
        tenantId: c.tenantId, actorId: c.userId, scopeType, query,
      });
      res.json({ data: out });
    } catch (err) { handleAiError(res, err); }
  });

  router.post('/ai/classify', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { scopeType, text, taxonomy } = req.body ?? {};
    if (typeof scopeType !== 'string') return fail(res, 400, 'bad_scope', 'scopeType required');
    if (typeof text !== 'string') return fail(res, 400, 'bad_text', 'text required');
    if (typeof taxonomy !== 'string') return fail(res, 400, 'bad_taxonomy', 'taxonomy required');
    try {
      const out = await getAiPort().classify({
        tenantId: c.tenantId, actorId: c.userId, scopeType, text, taxonomy,
      });
      res.json({ data: out });
    } catch (err) { handleAiError(res, err); }
  });

  return router;
}
