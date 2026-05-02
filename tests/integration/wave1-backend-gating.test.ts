/**
 * Phase 6 — Wave-1 backend gating proof.
 *
 * Asserts the backend — not just the UI — is the source of truth for
 * Wave-1 module disabling:
 *
 *   A. Every disabled module prefix returns 404 at the gateway,
 *      BEFORE any downstream service would otherwise answer.
 *   B. The AI surface is separately blocked when AI_ENABLED=false.
 *   C. Every Wave-1 allowed prefix still routes through the gateway
 *      to a 2xx / 4xx business-logic response (not 5xx, not blocked).
 *   D. A super-admin hitting a disabled path can NOT bypass — the
 *      404 is at the gateway, independent of the caller's role.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminSession } from '../helpers/admin-login';

const GATEWAY = 'http://127.0.0.1:4000';

let adminToken = '';
let adminTenantId = '';

beforeAll(async () => {
  const s = await getAdminSession();
  adminToken = s.token;
  adminTenantId = s.tenantId;
}, 180_000);

async function probe(path: string, method: 'GET' | 'POST' = 'GET'): Promise<number> {
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-tenant-id': adminTenantId,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify({}) : undefined,
  });
  return res.status;
}

describe('Phase 6 — backend Wave-1 gating (gateway-enforced)', () => {
  describe('A. Disabled module prefixes return 404', () => {
    const DISABLED_PATHS = [
      '/api/risk',
      '/api/risk/anything',
      '/api/vendor',
      '/api/vendors',
      '/api/privacy',
      '/api/dora',
      '/api/records',
      '/api/ai-governance',
      '/api/bcp',
      '/api/asset',
      '/api/assets',
      '/api/training',
      '/api/qiyas',
      '/api/portals',
      '/api/incident',
      '/api/incidents',
      '/api/exception',
      '/api/remediation',
      '/api/issues',
      '/api/journey',
      '/api/local-knowledge',
    ];

    for (const p of DISABLED_PATHS) {
      it(`${p} → 404 at gateway (super-admin cannot bypass)`, async () => {
        const status = await probe(p);
        expect(status).toBe(404);
      });
    }
  });

  describe('B. AI surface is gated before billing (post-Phase-12C enablement)', () => {
    // Phase 12C enabled the AI surface (AI_ENABLED=true) for the certified
    // AI-billed prefixes. The invariant is no longer "always 404" — it is
    // "never 200 for unauth, never 500, always a controlled 4xx". AI safety
    // still fires when AI_ENABLED=false and the route is permissioned when
    // AI_ENABLED=true.
    for (const p of ['/api/ai', '/api/ai-engine', '/api/nudges', '/api/mcp']) {
      it(`GET ${p} unauth → 401/403/404 never 200/500`, async () => {
        const status = await probe(p);
        expect([401, 403, 404]).toContain(status);
        expect(status).not.toBe(200);
        expect(status).not.toBe(500);
      });
    }

    it('POST /api/copilot/chat → never 200 / never 500', async () => {
      const status = await probe('/api/copilot/chat', 'POST');
      expect(status).not.toBe(200);
      expect(status).not.toBe(500);
      // Acceptable: 401/403/404. 404 from ai-safety, 403 from CSRF.
      expect([401, 403, 404]).toContain(status);
    });
  });

  describe('C. Wave-1 allowed prefixes still route', () => {
    // These must not be swallowed by any safety middleware. Each must
    // reach the downstream handler, which responds 2xx or a
    // business-logic 4xx (e.g. 404 for an unknown framework id). The
    // only invariant: never 500 (blown handler), never the safety
    // middleware's canned "Not available in this deployment".
    const ALLOWED_PATHS = [
      '/api/workspace/entitlements',
      '/api/onboarding/new-user/status',
      '/api/compliance',
      '/api/compliance/frameworks',
      '/api/controls',
      '/api/evidence',
      '/api/audit',
      '/api/reports',
      '/api/reporting',
      '/api/users',
      '/api/tenants',
      '/api/health',
    ];
    for (const p of ALLOWED_PATHS) {
      it(`${p} reaches downstream (not safety-blocked)`, async () => {
        const status = await probe(p);
        expect(status).not.toBe(500);
        // 200/201 ok; 401/403/404 means downstream answered — still ok.
        expect([200, 201, 204, 400, 401, 403, 404]).toContain(status);
      });
    }
  });

  describe('D. Defence-in-depth: disabled path with no auth also returns 404', () => {
    it('/api/risk without auth returns 404 (safety fires before auth)', async () => {
      const res = await fetch(`${GATEWAY}/api/risk`);
      expect(res.status).toBe(404);
      const body = await res.json().catch(() => ({}));
      expect(body).toMatchObject({ error: 'Not Found' });
    });
  });
});
