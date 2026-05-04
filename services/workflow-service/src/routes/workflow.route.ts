import { Router, type Request, type Response } from 'express';
import {
  listDefinitions, getDefinition, createDefinition, publishDefinition,
  startInstance, listInstances, instanceComposition, emitSignal, completeStep,
} from '../lib/workflow-repo.js';
import {
  DefinitionCreateSchema, DefinitionPublishSchema, InstanceStartSchema,
  SignalEmitSchema, StepCompleteSchema,
} from '../schemas/workflow.schemas.js';

export const workflowRouter = Router();

workflowRouter.get('/definitions', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ definitions: await listDefinitions(status) });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.get('/definitions/:workflow_key', async (req: Request, res: Response) => {
  try {
    const v = req.query.version ? Number(req.query.version) : undefined;
    const def = await getDefinition(String(req.params.workflow_key), v);
    if (!def) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ definition: def });
  } catch (e) {
    res.status(500).json({ error: 'get_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.post('/definitions', async (req: Request, res: Response) => {
  const p = DefinitionCreateSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    const def = await createDefinition(p.data as Parameters<typeof createDefinition>[0]);
    res.status(201).json({ ok: true, definition: def });
  } catch (e) {
    res.status(500).json({ error: 'create_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.post('/definitions/publish', async (req: Request, res: Response) => {
  const p = DefinitionPublishSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    res.json({ ok: true, definition: await publishDefinition(String(p.data.workflow_key), Number(p.data.version)) });
  } catch (e) {
    res.status(409).json({ error: 'publish_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.get('/instances', async (req: Request, res: Response) => {
  try {
    const wk = typeof req.query.workflow_key === 'string' ? req.query.workflow_key : undefined;
    const st = typeof req.query.status === 'string' ? req.query.status : undefined;
    const lim = req.query.limit ? Math.min(500, Number(req.query.limit)) : 100;
    res.json({ instances: await listInstances(wk, st, lim) });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.post('/instances', async (req: Request, res: Response) => {
  const p = InstanceStartSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    res.status(201).json({ ok: true, instance: await startInstance(p.data as Parameters<typeof startInstance>[0]) });
  } catch (e) {
    res.status(500).json({ error: 'start_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.get('/instances/:instance_id/composition', async (req: Request, res: Response) => {
  try {
    const c = await instanceComposition(String(req.params.instance_id));
    if (!c) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(c);
  } catch (e) {
    res.status(500).json({ error: 'composition_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.post('/signals', async (req: Request, res: Response) => {
  const p = SignalEmitSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    res.status(201).json({ ok: true, event: await emitSignal(p.data as Parameters<typeof emitSignal>[0]) });
  } catch (e) {
    res.status(500).json({ error: 'signal_failed', detail: String((e as Error).message) });
  }
});

workflowRouter.post('/steps/complete', async (req: Request, res: Response) => {
  const p = StepCompleteSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try {
    await completeStep(String(p.data.instance_id), String(p.data.step_id), p.data.output);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'complete_failed', detail: String((e as Error).message) });
  }
});
