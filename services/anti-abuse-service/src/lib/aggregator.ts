import { masterQuery } from '@dos/db/master';
import type { AntiAbuseAdapter, SignalContext, AntiAbuseSignal } from '../adapters/types.js';
import { captchaAdapter } from '../adapters/captcha.adapter.js';
import { ipRepAdapter } from '../adapters/ip-rep.adapter.js';
import { deviceFpAdapter } from '../adapters/device-fp.adapter.js';
import { emailVerifyAdapter } from '../adapters/email-verify.adapter.js';

const ADAPTERS: AntiAbuseAdapter[] = [
  captchaAdapter,
  ipRepAdapter,
  deviceFpAdapter,
  emailVerifyAdapter,
];

const BLOCK_THRESHOLD = Number(process.env.ANTI_ABUSE_BLOCK_THRESHOLD ?? 0.7);

export interface EvaluationResult {
  attempt_id: string;
  composite_score: number;
  decision: 'allow' | 'review' | 'block';
  signals: AntiAbuseSignal[];
}

export async function evaluate(ctx: SignalContext): Promise<EvaluationResult> {
  const signals = await Promise.all(ADAPTERS.map((a) => a.evaluate(ctx)));
  const composite = signals.reduce((m, s) => Math.max(m, s.score), 0);
  const decision: EvaluationResult['decision'] =
    composite >= BLOCK_THRESHOLD ? 'block' : composite >= 0.4 ? 'review' : 'allow';

  await masterQuery(`SET dos.actor = 'dos-master'`);
  for (const s of signals) {
    await masterQuery(
      `INSERT INTO dos_master.signup_anti_abuse_signal (attempt_id, signal_kind, score, detail)
       VALUES ($1::uuid, $2, $3, $4::jsonb)`,
      [ctx.attemptId, s.kind, s.score, JSON.stringify(s.detail)],
    );
  }

  if (decision === 'block') {
    await masterQuery(
      `UPDATE dos_master.signup_attempt SET status='blocked' WHERE id=$1::uuid AND status='pending'`,
      [ctx.attemptId],
    );
  }

  return { attempt_id: ctx.attemptId, composite_score: composite, decision, signals };
}
