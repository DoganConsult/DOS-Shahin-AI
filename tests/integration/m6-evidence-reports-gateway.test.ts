/**
 * M6 — Evidence + reports gateway surfaces (evidence-audit-reporting-service).
 *
 * Shahin FE uses /api/evidence, /api/reports, /api/reporting via gateway
 * (see service-registry EVIDENCE_AUDIT_REPORTING_SERVICE_URL). Contract:
 *   - unauth → 401, 403, or 404 (NEVER 200 / 500)
 */
import { describe, it, expect } from 'vitest';

const GATEWAY = 'http://127.0.0.1:4000';

async function call(path: string, init: RequestInit = {}): Promise<number> {
  const res = await fetch(`${GATEWAY}${path}`, init);
  return res.status;
}

const EAR_PROTECTED = [
  '/api/evidence/',
  '/api/reports/',
  '/api/reporting/',
  '/api/finding/',
  '/api/export/',
];

describe('M6 evidence/reports — unauth calls are rejected (not 200, not 500)', () => {
  for (const p of EAR_PROTECTED) {
    it(`${p} → 401/403/404 without auth`, async () => {
      const status = await call(p);
      expect([401, 403, 404]).toContain(status);
      expect([200, 500]).not.toContain(status);
    });
  }
});
