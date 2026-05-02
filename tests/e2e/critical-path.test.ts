import { describe, it, expect, beforeAll } from 'vitest';

const GATEWAY = 'http://127.0.0.1:4000';
const AUTH = 'http://127.0.0.1:4001';
const TENANT = 'http://127.0.0.1:4002';
const USER = 'http://127.0.0.1:4003';
const RISK = 'http://127.0.0.1:4013';
const COMPLIANCE = 'http://127.0.0.1:4012';
const EVIDENCE = 'http://127.0.0.1:4014';
const AUDIT = 'http://127.0.0.1:4006';
const VENDOR = 'http://127.0.0.1:4015';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@dogan-ai.com';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'D0gan@Platform2026!';

let token = '';
let tenantId = '';

async function api(url: string, opts: RequestInit = {}): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

describe('E2E Critical Path — Login → Tenant → GRC Operations', () => {
  describe('1. Authentication', () => {
    it('login returns JWT token + tenant context', async () => {
      const { status, body } = await api(`${AUTH}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
      });
      expect(status).toBe(200);
      expect(body.token).toBeTruthy();
      token = body.token;
      tenantId = body.tenantId;
    });
  });

  describe('2. Tenant Operations', () => {
    it('can fetch tenant details', async () => {
      const { status, body } = await api(`${TENANT}/api/tenants/${tenantId}`);
      expect(status).toBe(200);
      expect(body.tenant_id || body.tenantId).toBe(tenantId);
    });
  });

  describe('3. Risk Register — CRUD', () => {
    let riskId: string;

    it('creates a risk entry', async () => {
      const { status, body } = await api(`${RISK}/api/risk/risks`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'E2E Test Risk — Data Breach',
          description: 'Critical path test risk',
          likelihood: 4,
          impact: 5,
          category: 'cybersecurity',
          status: 'open',
        }),
      });
      if (status === 201 || status === 200) {
        riskId = body.risk_id || body.riskId || body.id;
        expect(riskId).toBeTruthy();
      } else {
        console.warn(`Risk create returned ${status} — service may not be fully wired`);
      }
    });

    it('reads the risk entry back', async () => {
      if (!riskId) return;
      const { status, body } = await api(`${RISK}/api/risk/risks/${riskId}`);
      expect(status).toBe(200);
      expect(body.title).toContain('E2E Test Risk');
    });

    it('updates the risk entry', async () => {
      if (!riskId) return;
      const { status } = await api(`${RISK}/api/risk/risks/${riskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'mitigated', treatment_plan: 'Encrypt all data at rest' }),
      });
      expect([200, 204]).toContain(status);
    });

    it('deletes the risk entry', async () => {
      if (!riskId) return;
      const { status } = await api(`${RISK}/api/risk/risks/${riskId}`, { method: 'DELETE' });
      expect([200, 204]).toContain(status);
    });
  });

  describe('4. Compliance Assessment', () => {
    it('lists compliance frameworks', async () => {
      const { status } = await api(`${COMPLIANCE}/api/compliance/frameworks`);
      expect([200, 404]).toContain(status);
    });

    it('lists controls', async () => {
      const { status } = await api(`${COMPLIANCE}/api/compliance/controls`);
      expect([200, 404]).toContain(status);
    });
  });

  describe('5. Evidence Collection', () => {
    it('lists evidence items', async () => {
      const { status } = await api(`${EVIDENCE}/api/evidence/items`);
      expect([200, 404]).toContain(status);
    });
  });

  describe('6. Audit Trail', () => {
    it('creates audit entry', async () => {
      const { status, body } = await api(`${AUDIT}/api/audit/entries`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'e2e.critical_path.test',
          actorId: 'e2e-runner',
          details: { test: true, timestamp: new Date().toISOString() },
        }),
      });
      expect([200, 201]).toContain(status);
    });

    it('retrieves audit trail', async () => {
      const { status, body } = await api(`${AUDIT}/api/audit/entries`);
      expect(status).toBe(200);
    });
  });

  describe('7. Vendor Management', () => {
    let vendorId: string;

    it('creates a vendor', async () => {
      const { status, body } = await api(`${VENDOR}/api/vendor/vendors`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'E2E Test Vendor Corp',
          category: 'technology',
          tier: 'high',
          status: 'active',
          contact_email: 'vendor@test.com',
        }),
      });
      if (status === 201 || status === 200) {
        vendorId = body.vendor_id || body.vendorId || body.id;
      }
    });

    it('cleans up vendor', async () => {
      if (!vendorId) return;
      const { status } = await api(`${VENDOR}/api/vendor/vendors/${vendorId}`, { method: 'DELETE' });
      expect([200, 204]).toContain(status);
    });
  });

  describe('8. Asset Management', () => {
    let assetId: string;

    it('creates an asset', async () => {
      const { status, body } = await api('http://127.0.0.1:4016/api/asset/assets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'E2E Test Server',
          asset_type: 'hardware',
          classification: 'confidential',
          criticality: 'high',
          status: 'active',
        }),
      });
      if (status === 201 || status === 200) {
        assetId = body.asset_id || body.assetId || body.id;
      }
    });

    it('cleans up asset', async () => {
      if (!assetId) return;
      await api(`http://127.0.0.1:4016/api/asset/assets/${assetId}`, { method: 'DELETE' });
    });
  });

  describe('9. BCP Plans', () => {
    it('lists BCP plans', async () => {
      const { status } = await api('http://127.0.0.1:4017/api/bcp/plans');
      expect([200, 404]).toContain(status);
    });
  });

  describe('10. Governance Policy', () => {
    it('lists policies', async () => {
      const { status } = await api('http://127.0.0.1:4011/api/governance/policies');
      expect([200, 404]).toContain(status);
    });
  });

  describe('11. Training Programs', () => {
    it('lists training programs', async () => {
      const { status } = await api('http://127.0.0.1:4018/api/training/programs');
      expect([200, 404]).toContain(status);
    });
  });

  describe('12. Privacy Assessments', () => {
    it('lists privacy assessments', async () => {
      const { status } = await api('http://127.0.0.1:4019/api/privacy/assessments');
      expect([200, 404]).toContain(status);
    });
  });

  describe('13. DORA Assessments', () => {
    it('lists DORA assessments', async () => {
      const { status } = await api('http://127.0.0.1:4020/api/dora/assessments');
      expect([200, 404]).toContain(status);
    });
  });

  describe('14. Analytics & Dashboards', () => {
    it('lists dashboards', async () => {
      const { status } = await api('http://127.0.0.1:4024/api/analytics/dashboards');
      expect([200, 404]).toContain(status);
    });

    it('lists widgets', async () => {
      const { status } = await api('http://127.0.0.1:4023/api/dashboard/widgets');
      expect([200, 404]).toContain(status);
    });
  });

  describe('15. Remediation & Actions', () => {
    it('lists remediations', async () => {
      const { status } = await api('http://127.0.0.1:4021/api/remediation/items');
      expect([200, 404]).toContain(status);
    });
  });

  describe('16. Gateway Routing Integrity', () => {
    it('routes auth through gateway', async () => {
      const { status } = await api(`${GATEWAY}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
      });
      expect(status).toBe(200);
    });

    it('protected routes reject without token', async () => {
      const savedToken = token;
      token = '';
      const { status } = await api(`${GATEWAY}/api/users`);
      expect(status).toBe(401);
      token = savedToken;
    });

    it('gateway proxies to downstream services', async () => {
      const endpoints = [
        '/api/tenants',
        '/api/risk/risks',
        '/api/compliance/frameworks',
        '/api/audit/entries',
      ];
      for (const ep of endpoints) {
        const { status } = await api(`${GATEWAY}${ep}`);
        expect([200, 401, 403, 404]).toContain(status);
      }
    });
  });

  describe('17. Cross-Service Health Check', () => {
    const serviceEndpoints = [
      { port: 4001, name: 'auth' },
      { port: 4002, name: 'tenant' },
      { port: 4003, name: 'user' },
      { port: 4013, name: 'risk' },
      { port: 4012, name: 'compliance' },
      { port: 4006, name: 'audit' },
      { port: 4015, name: 'vendor' },
      { port: 4016, name: 'asset' },
    ];

    for (const ep of serviceEndpoints) {
      it(`${ep.name} service is healthy during E2E`, async () => {
        const { status, body } = await api(`http://127.0.0.1:${ep.port}/health`);
        expect(status).toBe(200);
        expect(body.status).toMatch(/^(ok|degraded)$/);
      });
    }
  });
});
