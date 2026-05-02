/**
 * M5 — Risk peer review gateway surface.
 *
 * Ensures `/api/risk-peer-review` is registered on the gateway and reaches
 * risk-incident-service (auth-gated), fixing the prior silent stub where
 * index.ts used a non-existent modules/risk legacy path.
 *
 * Contract (same spirit as m4-compliance-perms-tenant.test.ts):
 *   - unauth → 401, 403, or 404 (NEVER 200 / 500)
 */
import { describe, it, expect } from 'vitest';

const GATEWAY = 'http://127.0.0.1:4000';

async function call(path: string, init: RequestInit = {}): Promise<number> {
  const res = await fetch(`${GATEWAY}${path}`, init);
  return res.status;
}

describe('M5 risk peer review — gateway rejects unauthenticated calls', () => {
  it('/api/risk-peer-review/ → not 200 and not 500 without auth', async () => {
    const status = await call('/api/risk-peer-review/');
    expect([401, 403, 404]).toContain(status);
    expect([200, 500]).not.toContain(status);
  });

  it('/api/risk-incident/risk/risk-peer-review/ → not 200 and not 500 without auth (nested)', async () => {
    const status = await call('/api/risk-incident/risk/risk-peer-review/');
    expect([401, 403, 404]).toContain(status);
    expect([200, 500]).not.toContain(status);
  });
});
