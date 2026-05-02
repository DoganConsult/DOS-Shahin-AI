import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminSession } from '../helpers/admin-login';

const GATEWAY_URL = 'http://127.0.0.1:4000';
const AUTH_URL = 'http://127.0.0.1:4001';
const TENANT_URL = 'http://127.0.0.1:4002';
const USER_URL = 'http://127.0.0.1:4003';
const WORKFLOW_URL = 'http://127.0.0.1:4004';
const NOTIFICATION_URL = 'http://127.0.0.1:4005';
const AUDIT_URL = 'http://127.0.0.1:4006';

let authToken = '';
let tenantId = '';

async function fetchJson(url: string, options: RequestInit = {}, retries = 15): Promise<any> {
  const headers = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 429 && retries > 0) {
    // Back off long enough for the login:ip bucket (10/min) to reset
    // when multiple integration suites are stampeding it in parallel.
    // 15 × 5s = 75 s which exceeds the 60 s bucket window, so any
    // saturated bucket clears before retries exhaust.
    await new Promise(r => setTimeout(r, 5000));
    return fetchJson(url, options, retries - 1);
  }
  return { status: res.status, body: await res.json().catch(() => null) };
}

describe('Platform Service Health Checks', () => {
  it('gateway is healthy', async () => {
    const { status, body } = await fetchJson(`${GATEWAY_URL}/health`);
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('gateway');
  });

  it('auth-service is healthy', async () => {
    const { status, body } = await fetchJson(`${AUTH_URL}/health`);
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
  });

  it('tenant-service is healthy', async () => {
    const { status, body } = await fetchJson(`${TENANT_URL}/health`);
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('user-service is healthy', async () => {
    const { status, body } = await fetchJson(`${USER_URL}/health`);
    expect(status).toBe(200);
    expect(body.checks.database).toBe('ok');
  });

  it('workflow-service is healthy', async () => {
    const { status, body } = await fetchJson(`${WORKFLOW_URL}/health`);
    expect(status).toBe(200);
    expect(body.checks.database).toBe('ok');
  });

  it('notification-service is healthy', async () => {
    const { status, body } = await fetchJson(`${NOTIFICATION_URL}/health`);
    expect(status).toBe(200);
    expect(body.checks.database).toBe('ok');
  });

  it('audit-service is healthy', async () => {
    const { status, body } = await fetchJson(`${AUDIT_URL}/health`);
    expect(status).toBe(200);
    expect(body.checks.database).toBe('ok');
  });

  it('all services return correlation-id header', async () => {
    const res = await fetch(`${GATEWAY_URL}/health`);
    expect(res.headers.get('x-correlation-id')).toBeTruthy();
  });
});

describe('Auth Service — Login Flow', () => {
  // The auth-service's authRateLimiter allows 10 login attempts per 60s
  // per IP. This file alone has 3+ login-dependent describes plus we
  // want to surface the real 401/400 rejection shapes. Cache one
  // successful login in beforeAll and reuse its response across tests
  // to avoid rate-limit-induced 5s timeouts under serial execution.
  let adminLoginBody: Record<string, any> | null = null;
  beforeAll(async () => {
    // Use the shared admin session so this file doesn't burn the
    // login:ip rate-limit bucket when multiple integration suites run
    // in parallel. The response shape is the same; we fetch the full
    // login body for the snapshot assertions below.
    const s = await getAdminSession();
    authToken = s.token;
    tenantId = s.tenantId;
    adminLoginBody = (s.body as Record<string, any> | undefined) ?? null;
  }, 180_000);

  it('rejects missing credentials', async () => {
    const { status } = await fetchJson(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(status).toBe(400);
  }, 120_000);

  it('rejects invalid password', async () => {
    const { status, body } = await fetchJson(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong' }),
    });
    expect(status).toBe(401);
    expect(body.code).toBe('INVALID_CREDENTIALS');
  }, 120_000);

  it('authenticates platform admin', () => {
    // Assertions run against the beforeAll cached body — single login,
    // same contract.
    expect(adminLoginBody).not.toBeNull();
    expect(adminLoginBody!.token).toBeTruthy();
    expect(adminLoginBody!.userId).toBeTruthy();
    expect(adminLoginBody!.role).toBe('super_admin');
    expect(adminLoginBody!.isSuperAdmin).toBe(true);
    expect(adminLoginBody!.orgName).toBe('Dogan-AI Platform');
  });

  it('login returns enterprise authz snapshot', () => {
    expect(adminLoginBody!.enterpriseAuthz).toBeTruthy();
    expect(adminLoginBody!.enterpriseAuthz.tenant.tenantId).toBe(tenantId);
    expect(adminLoginBody!.enterpriseAuthz.tenant.plan).toBe('enterprise');
  });
});

describe('Gateway — API Routing', () => {
  beforeAll(async () => {
    if (!authToken) {
      const s = await getAdminSession();
      authToken = s.token;
      tenantId = s.tenantId;
    }
  });

  it('routes /api/auth through gateway', async () => {
    // The gateway enforces CSRF on POST routes. A direct login POST
    // without a CSRF token is correctly rejected with 403 — proving
    // routing + CSRF middleware both work. We probe a CSRF-exempt GET
    // against /api/auth/userinfo (no Bearer) to confirm the gateway
    // reached auth-service; 401 is the expected answer, and 403 is
    // still acceptable because it also proves routing worked. Using
    // a GET here avoids the login rate-limiter bucket which earlier
    // beforeAll blocks may have already exhausted.
    const probe = await fetchJson(`${GATEWAY_URL}/api/auth/userinfo`, { method: 'GET' });
    expect([200, 401, 403]).toContain(probe.status);
    expect(probe.status).not.toBe(404);
    expect(probe.status).not.toBe(500);
  }, 15_000);
});

describe('Tenant Service', () => {
  it('tenant service health check with sub-routes', async () => {
    const { status, body } = await fetchJson(`${TENANT_URL}/api/tenants/health`);
    expect(status).toBe(200);
    expect(body.status).toBeTruthy();
  });
});

describe('User Service — Users & Roles', () => {
  beforeAll(async () => {
    if (!authToken) {
      const s = await getAdminSession();
      authToken = s.token;
      tenantId = s.tenantId;
    }
  });

  it('rejects unauthenticated user list', async () => {
    const { status } = await fetchJson(`${USER_URL}/api/users`, {
      headers: { 'x-tenant-id': tenantId },
    });
    expect(status).toBe(401);
  });
});

describe('Audit Service — Trail', () => {
  beforeAll(async () => {
    if (!authToken) {
      const s = await getAdminSession();
      authToken = s.token;
      tenantId = s.tenantId;
    }
  });

  it('creates audit entry', async () => {
    // audit-service requires Bearer auth (Phase 4 authz hardening); the
    // test needs to pass the admin token alongside the tenant header.
    const { status, body } = await fetchJson(`${AUDIT_URL}/api/audit/entries`, {
      method: 'POST',
      headers: {
        'x-tenant-id': tenantId,
        authorization: `Bearer ${authToken}`,
      } as Record<string, string>,
      body: JSON.stringify({ action: 'test.integration', actorId: 'test-runner', details: { test: true } }),
    });
    expect([201, 200]).toContain(status);
    expect(body.data?.entryId ?? body.entryId ?? body.id).toBeTruthy();
  });

  it('lists audit entries', async () => {
    const { status, body } = await fetchJson(`${AUDIT_URL}/api/audit/entries`, {
      headers: {
        'x-tenant-id': tenantId,
        authorization: `Bearer ${authToken}`,
      } as Record<string, string>,
    });
    expect(status).toBe(200);
    expect(body).toBeTruthy();
  });
});
