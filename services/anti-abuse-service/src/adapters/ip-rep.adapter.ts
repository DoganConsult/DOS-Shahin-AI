import type { AntiAbuseAdapter } from './types.js';

/** Stub IP reputation adapter — flags private/loopback as 0 risk; deny-list configurable later. */
export const ipRepAdapter: AntiAbuseAdapter = {
  kind: 'ip-rep',
  async evaluate(ctx) {
    const ip = (ctx.ipAddr ?? '').trim();
    if (!ip) return { kind: 'ip-rep', score: 0.5, detail: { reason: 'no_ip' } };
    if (ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      return { kind: 'ip-rep', score: 0, detail: { class: 'private' } };
    }
    return { kind: 'ip-rep', score: 0.1, detail: { class: 'public', provider: 'stub' } };
  },
};
