import type { AntiAbuseAdapter } from './types.js';

const DISPOSABLE = new Set(['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com']);

/** Stub email-verify adapter — flags well-known disposable domains. */
export const emailVerifyAdapter: AntiAbuseAdapter = {
  kind: 'email-verify',
  async evaluate(ctx) {
    const email = (ctx.email ?? '').toLowerCase().trim();
    if (!email.includes('@')) return { kind: 'email-verify', score: 1, detail: { reason: 'invalid' } };
    const domain = email.split('@')[1];
    if (DISPOSABLE.has(domain)) {
      return { kind: 'email-verify', score: 0.95, detail: { reason: 'disposable', domain } };
    }
    return { kind: 'email-verify', score: 0.05, detail: { provider: 'stub', domain } };
  },
};
