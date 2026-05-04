import type { AntiAbuseAdapter } from './types.js';

/** Stub device-fingerprint adapter — empty fp = high risk, otherwise neutral. */
export const deviceFpAdapter: AntiAbuseAdapter = {
  kind: 'device-fp',
  async evaluate(ctx) {
    const fp = (ctx.deviceFp ?? '').trim();
    if (!fp) return { kind: 'device-fp', score: 0.7, detail: { reason: 'no_fp' } };
    return { kind: 'device-fp', score: 0.05, detail: { provider: 'stub', fp_present: true } };
  },
};
