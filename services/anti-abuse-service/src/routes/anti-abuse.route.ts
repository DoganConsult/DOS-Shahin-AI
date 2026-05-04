import { Router, type Request, type Response } from 'express';
import { evaluate } from '../lib/aggregator.js';
import { EvaluateSchema } from '../schemas/anti-abuse.schemas.js';

export const antiAbuseRouter = Router();

antiAbuseRouter.post('/evaluate', async (req: Request, res: Response) => {
  const parse = EvaluateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    const result = await evaluate({
      attemptId: parse.data.attempt_id,
      email: parse.data.email ?? null,
      ipAddr: parse.data.ip_addr ?? (req.ip || null),
      deviceFp: parse.data.device_fp ?? null,
      captchaToken: parse.data.captcha_token ?? null,
    });
    const status = result.decision === 'block' ? 403 : 200;
    res.status(status).json(result);
  } catch (e) {
    res.status(500).json({ error: 'evaluate_failed', detail: String((e as Error).message) });
  }
});
