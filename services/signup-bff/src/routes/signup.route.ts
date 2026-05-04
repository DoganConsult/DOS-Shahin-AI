import { Router, type Request, type Response } from 'express';
import { listFlows, listSteps, startAttempt, completeAttempt } from '../lib/signup-repo.js';
import { FlowQuerySchema, StartAttemptSchema, CompleteAttemptSchema } from '../schemas/signup.schemas.js';

export const signupRouter = Router();

signupRouter.get('/flows', async (req: Request, res: Response) => {
  const parse = FlowQuerySchema.safeParse({ product_code: req.query.product_code });
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    const flows = await listFlows(parse.data.product_code);
    res.json({ flows });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

signupRouter.get('/flows/:flow_code/steps', async (req: Request, res: Response) => {
  try {
    const steps = await listSteps(String(req.params.flow_code));
    res.json({ steps });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

signupRouter.post('/attempts', async (req: Request, res: Response) => {
  const parse = StartAttemptSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    const ip = (req.ip || req.socket.remoteAddress || null);
    const id = await startAttempt({
      flow_code: parse.data.flow_code,
      email: parse.data.email,
      device_fp: parse.data.device_fp ?? null,
      ip_addr: ip,
    });
    res.status(201).json({ ok: true, attempt_id: id });
  } catch (e) {
    res.status(500).json({ error: 'start_failed', detail: String((e as Error).message) });
  }
});

signupRouter.post('/attempts/complete', async (req: Request, res: Response) => {
  const parse = CompleteAttemptSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    const result = await completeAttempt(parse.data.attempt_id, parse.data.edition ?? 'standard');
    res.status(201).json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: 'complete_failed', detail: String((e as Error).message) });
  }
});
