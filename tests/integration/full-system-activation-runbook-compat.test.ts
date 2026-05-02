import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminSession } from '../helpers/admin-login';

const AUTH_URL = 'http://127.0.0.1:4001';
const TENANT_URL = 'http://127.0.0.1:4002';
const AUDIT_URL = 'http://127.0.0.1:4006';

async function fetchJson(url: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
  const headers = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  const res = await fetch(url, { ...options, headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}

describe('FULL-SYSTEM-ACTIVATION-RUNBOOK compatibility endpoints', () => {
  let token = '';
  let tenantId = '';

  beforeAll(async () => {
    const s = await getAdminSession();
    token = s.token;
    tenantId = s.tenantId;
  }, 120_000);

  it('auth-service exposes GET /api/auth/access-snapshot with permissions + roles', async () => {
    const { status, body } = await fetchJson(`${AUTH_URL}/api/auth/access-snapshot`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(status).toBe(200);
    expect(Array.isArray(body.permissions)).toBe(true);
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.data).toBeTruthy();
  }, 60_000);

  it('tenant-service exposes GET /api/tenants/workspaces', async () => {
    const { status, body } = await fetchJson(`${TENANT_URL}/api/tenants/workspaces`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
      } as Record<string, string>,
    });
    expect(status).toBe(200);
    expect(Array.isArray(body.workspaces)).toBe(true);
    expect(typeof body.count).toBe('number');
    expect(body.count).toBe(body.workspaces.length);
  }, 60_000);

  it('audit-service exposes GET /api/audit/logs and /api/audit/summary', async () => {
    const logs = await fetchJson(`${AUDIT_URL}/api/audit/logs?limit=20`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
      } as Record<string, string>,
    });
    expect(logs.status).toBe(200);
    expect(logs.body.success).toBe(true);
    expect(Array.isArray(logs.body.data)).toBe(true);

    const summary = await fetchJson(`${AUDIT_URL}/api/audit/summary`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
      } as Record<string, string>,
    });
    expect(summary.status).toBe(200);
    expect(summary.body.success).toBe(true);
    expect(typeof summary.body.data?.total).toBe('number');
    expect(Array.isArray(summary.body.data?.byAction)).toBe(true);
  }, 60_000);
});

