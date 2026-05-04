import type { AntiAbuseAdapter } from './types.js';

/**
 * Stub CAPTCHA adapter. Real provider (hCaptcha/Cloudflare Turnstile)
 * lands in M8 D2; this adapter accepts non-empty tokens and rejects
 * empty/sentinel values.
 */
export const captchaAdapter: AntiAbuseAdapter = {
  kind: 'captcha',
  async evaluate(ctx) {
    const t = (ctx.captchaToken ?? '').trim();
    if (!t) return { kind: 'captcha', score: 1, detail: { reason: 'missing_token' } };
    if (t === 'fail') return { kind: 'captcha', score: 1, detail: { reason: 'forced_fail' } };
    return { kind: 'captcha', score: 0, detail: { provider: 'stub', verified: true } };
  },
};
