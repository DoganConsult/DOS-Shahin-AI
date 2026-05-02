import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminSession } from '../helpers/admin-login';

/**
 * Integration tests for DOS-AIO generated service CRUD operations.
 *
 * These tests run against live service instances and verify the full
 * request-response cycle through Express routes, middleware, and domain services.
 *
 * Prerequisites:
 * - All services running (via ops/ecosystem.all.config.js)
 * - Database seeded with platform admin
 */

const AUTH_URL = 'http://127.0.0.1:4001';
const ADMIN_EMAIL = 'admin@dogan-ai.com';
const ADMIN_PASS = 'D0gan@Platform2026!';

interface ServiceDef {
  name: string;
  url: string;
  apiPath: string;
  createPayload: Record<string, unknown>;
  updatePayload: Record<string, unknown>;
  idField: string;
}

const SERVICES: ServiceDef[] = [
  {
    name: 'risk-incident-service',
    url: 'http://127.0.0.1:4013',
    apiPath: '/api/risk',
    createPayload: {
      title: 'Integration Test Risk',
      category: 'test',
      likelihood: 'low',
      impact: 'low',
      risk_score: 10,
      status: 'open',
    },
    updatePayload: { title: 'Updated Integration Risk', status: 'mitigated' },
    idField: 'risk_id',
  },
  {
    name: 'compliance-controls-service',
    url: 'http://127.0.0.1:4012',
    apiPath: '/api/compliance',
    createPayload: {
      framework_name: 'Test Framework',
      title: 'Integration Test Requirement',
      control_ref: 'TST-1',
      status: 'pending',
    },
    updatePayload: { status: 'compliant', evidence_status: 'collected' },
    idField: 'requirement_id',
  },
  {
    name: 'asset-service',
    url: 'http://127.0.0.1:4016',
    apiPath: '/api/asset',
    createPayload: {
      name: 'Integration Test Server',
      type: 'server',
      os_type: 'linux',
      category: 'infrastructure',
      status: 'active',
    },
    updatePayload: { name: 'Updated Test Server', status: 'maintenance' },
    idField: 'asset_id',
  },
  {
    name: 'vendor-service',
    url: 'http://127.0.0.1:4015',
    apiPath: '/api/vendor',
    createPayload: {
      name: 'Integration Test Vendor',
      category: 'technology',
      contact_name: 'Test Contact',
      status: 'active',
    },
    updatePayload: { name: 'Updated Test Vendor', risk_tier: 'tier-2' },
    idField: 'vendor_id',
  },
  {
    name: 'governance-policy-service',
    url: 'http://127.0.0.1:4011',
    apiPath: '/api/policy',
    createPayload: {
      title: 'Integration Test Policy',
      category: 'security',
      version: '1.0',
      status: 'draft',
    },
    updatePayload: { version: '1.1', status: 'published' },
    idField: 'policy_id',
  },
  {
    name: 'bcp-service',
    url: 'http://127.0.0.1:4017',
    apiPath: '/api/bcp',
    createPayload: {
      title: 'Integration Test BCP Plan',
      type: 'disaster-recovery',
      status: 'draft',
      priority: 'medium',
      rto_hours: 8,
      rpo_hours: 4,
    },
    updatePayload: { status: 'approved', rto_hours: 4 },
    idField: 'plan_id',
  },
];

let authToken = '';
let tenantId = '';

async function fetchJson(url: string, options: RequestInit = {}, retries = 3): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 2000));
    return fetchJson(url, options, retries - 1);
  }
  return { status: res.status, body: await res.json().catch(() => null) };
}

describe('Service CRUD Integration Tests', () => {
  beforeAll(async () => {
    // Use the shared memoised session so parallel integration suites
    // don't stampede the login:ip rate-limit bucket.
    const s = await getAdminSession();
    authToken = s.token;
    tenantId = s.tenantId;
  }, 180_000);

  for (const svc of SERVICES) {
    describe(`${svc.name} CRUD`, () => {
      let createdId = '';

      it(`${svc.name}: list returns paginated StandardListResponse`, async () => {
        const { status, body } = await fetchJson(`${svc.url}${svc.apiPath}`);

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.meta).toBeDefined();
        expect(body.meta.page).toBeGreaterThanOrEqual(1);
        expect(body.meta.pageSize).toBeGreaterThanOrEqual(1);
        expect(typeof body.meta.total).toBe('number');
        expect(typeof body.meta.totalPages).toBe('number');
        expect(body.meta.requestId).toBeDefined();
        expect(body.meta.timestamp).toBeDefined();
      });

      it(`${svc.name}: create returns 201 with created item`, async () => {
        const { status, body } = await fetchJson(`${svc.url}${svc.apiPath}`, {
          method: 'POST',
          body: JSON.stringify(svc.createPayload),
        });

        expect(status).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data[svc.idField]).toBeTruthy();
        createdId = body.data[svc.idField];
      });

      it(`${svc.name}: get by ID returns 200 with item`, async () => {
        if (!createdId) return;

        const { status, body } = await fetchJson(`${svc.url}${svc.apiPath}/${createdId}`);

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data[svc.idField]).toBe(createdId);
        expect(body.meta.requestId).toBeDefined();
        expect(body.meta.timestamp).toBeDefined();
      });

      it(`${svc.name}: get by ID returns 404 for missing item`, async () => {
        const { status } = await fetchJson(
          `${svc.url}${svc.apiPath}/00000000-0000-0000-0000-000000000000`,
        );

        expect(status).toBe(404);
      });

      it(`${svc.name}: update returns updated item`, async () => {
        if (!createdId) return;

        const { status, body } = await fetchJson(`${svc.url}${svc.apiPath}/${createdId}`, {
          method: 'PUT',
          body: JSON.stringify(svc.updatePayload),
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data[svc.idField]).toBe(createdId);
        // Verify at least one field was updated
        const firstUpdateKey = Object.keys(svc.updatePayload)[0];
        expect(body.data[firstUpdateKey]).toBe(svc.updatePayload[firstUpdateKey]);
      });

      it(`${svc.name}: delete returns success message`, async () => {
        if (!createdId) return;

        const { status, body } = await fetchJson(`${svc.url}${svc.apiPath}/${createdId}`, {
          method: 'DELETE',
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
      });

      it(`${svc.name}: get deleted item returns 404`, async () => {
        if (!createdId) return;

        const { status } = await fetchJson(`${svc.url}${svc.apiPath}/${createdId}`);

        expect(status).toBe(404);
      });
    });
  }
});
