/**
 * Phase 6 — Wave-1 module allowlist proof.
 *
 * GET /api/workspace/entitlements must return ONLY codes from the
 * Wave-1 allowlist defined in
 * services/onboarding-service/src/routes/workspace.routes.ts.
 *
 * The test uses a throwaway tenant keyed by a nonce, seeds a
 * deliberately mixed entitlement set (Wave-1 codes + explicit
 * non-Wave-1 codes), and asserts that the handler filters out every
 * non-Wave-1 row.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import * as crypto from 'node:crypto';
import { wave1AllowlistForTests } from '../../services/onboarding-service/src/routes/workspace.routes';
import { getAdminSession } from '../helpers/admin-login';

const ONBOARDING_URL = 'http://127.0.0.1:4010';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const NONCE = crypto.randomBytes(4).toString('hex');
const DRIFT_TENANT = `w1_${NONCE}`;

let adminToken = '';

beforeAll(async () => {
  adminToken = (await getAdminSession()).token;
  await pool.query(
    `INSERT INTO public.tenants
       (tenant_id, org_name, industry, org_size, status,
        tenant_code, tenant_name_en, schema_name)
     VALUES ($1, 'Wave1 Drift Fixture', 'technology', '1-50', 'active',
             $2, 'Wave1 Drift Fixture', $3)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [DRIFT_TENANT, DRIFT_TENANT, `t_${DRIFT_TENANT.toLowerCase()}`],
  );
  // Mixed entitlement set: 3 Wave-1 + 3 non-Wave-1 codes.
  const seedCodes: Array<[string, boolean]> = [
    ['compliance', true],
    ['controls',   true],
    ['evidence',   true],
    // Explicitly-forbidden codes below — must be filtered out.
    ['risk',            false],
    ['ai-governance',   false],
    ['vendor',          false],
  ];
  for (const [code] of seedCodes) {
    await pool.query(
      `INSERT INTO public.tenant_module_entitlements
         (tenant_id, module_code, entitled, status, entitlement_source, activated_at, updated_at)
       VALUES ($1, $2, TRUE, 'active', 'wave1-test-drift', NOW(), NOW())
       ON CONFLICT (tenant_id, module_code) DO UPDATE
         SET entitled = EXCLUDED.entitled, status = EXCLUDED.status, updated_at = NOW()`,
      [DRIFT_TENANT, code],
    );
  }
}, 180_000);

afterAll(async () => {
  await pool.query(`DELETE FROM public.tenant_module_entitlements WHERE tenant_id = $1`, [DRIFT_TENANT]).catch(() => { /* */ });
  await pool.query(`DELETE FROM public.tenants WHERE tenant_id = $1`, [DRIFT_TENANT]).catch(() => { /* */ });
  await pool.end();
});

const FORBIDDEN_CODES = [
  'risk', 'vendor', 'bcp', 'asset', 'training', 'qiyas',
  'ai', 'ai-governance', 'privacy', 'dora', 'records', 'portals',
  'incident', 'exception', 'remediation', 'action', 'issues',
  'journey', 'local-knowledge', 'governance',
];

describe('Phase 6 — Wave-1 module allowlist is the source of truth', () => {
  it('allowlist constant pins the agreed Wave-1 codes (no drift in code)', () => {
    const allowlist = [...wave1AllowlistForTests()].sort();
    // Phase 9 added `platform`, `workspace`, `dashboard` so the
    // workspace-home landing page entitlement-gate passes for non-
    // admin Wave-1 users. Every code added here must correspond to a
    // real section in frontend navigation.config.ts.
    expect(allowlist).toEqual(
      [
        'audit', 'compliance', 'controls', 'dashboard', 'evidence',
        'foundation', 'platform', 'policy', 'reporting', 'workflow', 'workspace',
      ].sort(),
    );
  });

  it('allowlist contains no forbidden non-Wave-1 code', () => {
    const allowlist = new Set(wave1AllowlistForTests());
    for (const c of FORBIDDEN_CODES) {
      expect(allowlist.has(c), `allowlist must not include ${c}`).toBe(false);
    }
  });

  it('platform-admin tenant entitlements expose only Wave-1 codes via gateway', async () => {
    const res = await fetch('http://127.0.0.1:4000/api/workspace/entitlements', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const codes: string[] = body.activeModules.map((m: any) => m.moduleCode);
    expect(codes.length).toBeGreaterThan(0);
    for (const c of codes) {
      expect(wave1AllowlistForTests(), `code ${c} must be in Wave-1 allowlist`).toContain(c);
    }
    for (const forb of FORBIDDEN_CODES) {
      expect(codes, `forbidden code ${forb} leaked into entitlements`).not.toContain(forb);
    }
  });

  it('drift tenant: forbidden DB rows are filtered out by the handler', async () => {
    // Use the explicit tenant lookup (/entitlements/:tenantId) so this
    // test doesn't need a session for the drift fixture tenant.
    const res = await fetch(
      `${ONBOARDING_URL}/api/workspace/entitlements/${DRIFT_TENANT}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const codes: string[] = body.activeModules.map((m: any) => m.moduleCode);

    // The three Wave-1 seeded codes must appear.
    expect(codes).toEqual(expect.arrayContaining(['compliance', 'controls', 'evidence']));
    // The three forbidden seeded codes must NOT appear.
    expect(codes).not.toContain('risk');
    expect(codes).not.toContain('ai-governance');
    expect(codes).not.toContain('vendor');
    // licensedModules is also filtered.
    expect(body.licensedModules).not.toContain('risk');
    expect(body.licensedModules).not.toContain('ai-governance');
    expect(body.licensedModules).not.toContain('vendor');
  });
});
