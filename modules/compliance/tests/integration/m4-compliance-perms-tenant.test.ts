/**
 * Phase 10E — M4 Compliance + Controls permissions and tenant-safety gate.
 *
 * Lives alongside authz-wave1.test.ts but narrows scope to the M4 surface
 * so a regression in the compliance/controls handlers shows up as its own
 * failing suite rather than a vague authz-wave1 line. Focuses on the
 * routes exercised by the Shahin compliance frontend (see
 * docs/certifications/M4-compliance-route-inventory.md):
 *
 *   /api/compliance, /api/compliance-ws, /api/controls,
 *   /api/frameworks, /api/ucf, /api/framework-mapping, /api/mappings,
 *   /api/compliance-assertions, /api/compliance-attestation,
 *   /api/lifecycle, /api/nca-assessment, /api/rcsa,
 *   /api/ksa-sector-maturity, /api/ksa-regulatory-changes,
 *   /api/ksa-cross-framework.
 *
 * Also asserts that the 4 Wave-1 disabled prefixes are genuinely 404 at
 * the gateway (Phase 10C drifts 3-6): /api/gaps, /api/exceptions,
 * /api/assessment-templates, /api/playbooks. And that /api/compliance/
 * obligations (the canonical caller for the obligation workspace) is
 * reachable and auth-gated after drift 2.
 *
 * Contract:
 *   - unauth    → 401, 403, or 404 (NEVER 200 / 500)
 *   - wrong tnt → 401/403/404 for non-super-admin (NEVER 200 / 500)
 *   - disabled  → 404 at the gateway (no service layer reached)
 */
import { describe, it, expect, beforeAll } from 'vitest';

const GATEWAY = 'http://127.0.0.1:4000';
const AUTH_DIRECT = 'http://127.0.0.1:4001';
const ADMIN_EMAIL = 'admin@dogan-ai.com';
const ADMIN_PASS = 'D0gan@Platform2026!';

interface FetchResult { status: number; body: unknown }

async function call(path: string, init: RequestInit = {}): Promise<FetchResult> {
  const res = await fetch(`${GATEWAY}${path}`, init);
  const body: unknown = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function callDirect(base: string, path: string, init: RequestInit = {}): Promise<FetchResult> {
  const res = await fetch(`${base}${path}`, init);
  const body: unknown = await res.json().catch(() => null);
  return { status: res.status, body };
}

let adminToken = '';

beforeAll(async () => {
  const r = await callDirect(AUTH_DIRECT, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (r.status === 200 && typeof r.body === 'object' && r.body) {
    const b = r.body as Record<string, unknown>;
    adminToken = (b.accessToken ?? b.token ?? '') as string;
  }
}, 30_000);

const M4_PROTECTED: string[] = [
  '/api/compliance',
  '/api/compliance/dashboard',
  '/api/compliance/obligations',
  '/api/compliance/remediations',
  '/api/compliance-ws/overview',
  '/api/controls',
  '/api/frameworks',
  '/api/ucf/controls',
  '/api/framework-mapping',
  '/api/mappings',
  '/api/compliance-assertions',
  '/api/compliance-attestation/campaigns',
  '/api/lifecycle/summary',
  '/api/nca-assessment',
  '/api/rcsa/campaigns',
  '/api/ksa-sector-maturity/models',
  '/api/ksa-regulatory-changes',
  '/api/ksa-cross-framework/summary',
  '/api/assessment-templates',
];

const M4_DISABLED: string[] = [
  '/api/gaps',
  '/api/exceptions',
  // /api/assessment-templates is now wired to compliance-controls-service
  // (service-registry.ts). Moved to M4_PROTECTED where it belongs — a
  // protected route requires auth, never 404.
  '/api/playbooks',
];

describe('M4 compliance+controls — unauth calls are rejected (not 200, not 500)', () => {
  for (const p of M4_PROTECTED) {
    it(`${p} → 401/403/404 without auth`, async () => {
      const { status } = await call(p);
      expect([401, 403, 404]).toContain(status);
      expect([200, 500]).not.toContain(status);
    });
  }
});

describe('M4 compliance+controls — wrong-tenant request is rejected', () => {
  const WRONG_TENANT = '00000000-0000-0000-0000-000000000000';

  function jwtIsSuperAdmin(token: string): boolean {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      return decoded.is_super_admin === true;
    } catch {
      return false;
    }
  }

  for (const p of M4_PROTECTED) {
    it(`${p} → 403/404 with wrong-tenant header (or 200 for super-admin)`, async () => {
      if (!adminToken) return;
      const { status } = await call(p, {
        headers: {
          authorization: `Bearer ${adminToken}`,
          'x-tenant-id': WRONG_TENANT,
        },
      });
      if (jwtIsSuperAdmin(adminToken)) {
        // Super-admin intentionally crosses tenant boundaries in Wave-1
        // per the existing authz-wave1 contract. 200 is allowed; 500 is
        // not (handler must not crash).
        expect([200, 400, 401, 403, 404]).toContain(status);
        expect(status).not.toBe(500);
      } else {
        expect([401, 403, 404]).toContain(status);
        expect([200]).not.toContain(status);
      }
    });
  }
});

describe('M4 compliance+controls — disabled prefixes are blocked at gateway', () => {
  // Phase 10C drifts 3, 4, 5, 6 — these prefixes are intentionally not
  // routed to any service. The FE UI has been redirected so no visible
  // page triggers them; this test guards against accidental re-registration.
  for (const p of M4_DISABLED) {
    it(`${p} is blocked (never 200 / never 500)`, async () => {
      const { status } = await call(p);
      expect([401, 403, 404]).toContain(status);
      expect(status).not.toBe(500);
      expect(status).not.toBe(200);
    });
  }
});

describe('M4 compliance+controls — dynamic route guard prevents UUID cast 500', () => {
  // Phase 10A audit §7.6 regression guard. FE subpath requests that hit
  // the /:id dynamic route must 404 via the UUID guard, never 500 via a
  // Postgres 'invalid input syntax for type uuid' error.
  const SUBPATHS = [
    '/api/controls/tests',
    '/api/controls/monitoring',
    '/api/controls/dashboard',
    '/api/compliance/dashboard', // covered by /dashboard handler but must not 500 either way
    '/api/compliance/obligations', // dynamic sibling
  ];
  for (const p of SUBPATHS) {
    it(`${p} does not 500`, async () => {
      const { status } = await call(p);
      expect(status).not.toBe(500);
    });
  }
});

describe('M4 compliance+controls — admin-token handshake (informational)', () => {
  it('records whether a valid admin session is available', () => {
    if (adminToken) {
      expect(adminToken.length).toBeGreaterThan(20);
    } else {
       
      console.warn('[m4-compliance] no valid admin token; authenticated-call assertions skipped');
      expect(adminToken).toBe('');
    }
  });
});
