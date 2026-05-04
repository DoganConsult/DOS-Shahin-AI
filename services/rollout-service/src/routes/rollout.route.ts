import { Router, type Request, type Response } from 'express';
import { createPlan, listPlans, planComposition, advanceRing, rollbackRing, evaluateRing } from '../lib/rollout-repo.js';
import { PlanCreateSchema, RingAdvanceSchema, RingRollbackSchema, EvaluateSchema } from '../schemas/rollout.schemas.js';
import { createChain, executeChain, type StepKind } from '../lib/compensation-orchestrator.js';

export const rolloutRouter = Router();

rolloutRouter.get('/plans', async (_req, res) => {
  try {
    res.json({ plans: await listPlans() });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

rolloutRouter.post('/plans', async (req: Request, res: Response) => {
  const p = PlanCreateSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    const plan = await createPlan(p.data.title, p.data.created_by, p.data.change_request_id ?? null);
    res.status(201).json({ ok: true, plan });
  } catch (e) {
    res.status(500).json({ error: 'create_failed', detail: String((e as Error).message) });
  }
});

rolloutRouter.get('/plans/:plan_id/composition', async (req, res) => {
  try {
    res.json(await planComposition(String(req.params.plan_id)));
  } catch (e) {
    res.status(404).json({ error: 'not_found', detail: String((e as Error).message) });
  }
});

rolloutRouter.post('/advance', async (req: Request, res: Response) => {
  const p = RingAdvanceSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    res.json(await advanceRing(p.data.plan_id, p.data.ring_code));
  } catch (e) {
    res.status(500).json({ error: 'advance_failed', detail: String((e as Error).message) });
  }
});

rolloutRouter.post('/rollback', async (req: Request, res: Response) => {
  const p = RingRollbackSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    res.json(await rollbackRing(p.data.plan_id, p.data.ring_code, p.data.triggered_by, p.data.reason));
  } catch (e) {
    res.status(500).json({ error: 'rollback_failed', detail: String((e as Error).message) });
  }
});

rolloutRouter.post('/compensation/chains', async (req: Request, res: Response) => {
  const steps = Array.isArray(req.body?.steps) ? req.body.steps as Array<{ kind: StepKind; payload?: Record<string, unknown> }> : null;
  if (!steps?.length) { res.status(400).json({ error: 'steps_required' }); return; }
  try {
    const id = await createChain(steps, req.body?.change_request_id ?? null);
    res.status(201).json({ ok: true, chain_id: id, step_count: steps.length });
  } catch (e) {
    res.status(500).json({ error: 'create_chain_failed', detail: String((e as Error).message) });
  }
});

rolloutRouter.post('/compensation/chains/:chain_id/execute', async (req, res) => {
  try {
    res.json(await executeChain(String(req.params.chain_id)));
  } catch (e) {
    res.status(500).json({ error: 'execute_chain_failed', detail: String((e as Error).message) });
  }
});

rolloutRouter.post('/evaluate', async (req: Request, res: Response) => {
  const p = EvaluateSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    res.json(await evaluateRing(p.data.plan_id, p.data.ring_code, p.data.signals));
  } catch (e) {
    res.status(500).json({ error: 'evaluate_failed', detail: String((e as Error).message) });
  }
});
