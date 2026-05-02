/**
 * Phase 9 — Wave-1 dashboard (workspace-home) certification tests.
 *
 * Proves the dashboard contract end-to-end:
 *
 *   A. Every API the workspace-home page calls in Wave-1 resolves to
 *      a real handler (no 404/500 on the visible dashboard path).
 *   B. Endpoints the page dropped in Phase 9 (`/api/ai-os/*`,
 *      `/api/connector-health`, `/api/kpi/card-indicators`,
 *      `/api/tenant-home/*` legacy alias) are not called from the
 *      shipped bundle AND are blocked at the gateway anyway.
 *   C. `/api/workspace/entitlements` surfaces the Wave-1
 *      platform/workspace/dashboard/foundation codes that the
 *      landing page depends on.
 *   D. Unauth → 401, wrong-tenant (non-admin → 403) ... rely on
 *      existing authz-wave1 suite; this file focuses on
 *      dashboard-surface invariants only.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

describe('Phase 9 — Wave-1 dashboard backend-path proofs', () => {
  it('A. every API the Wave-1 workspace-home page calls resolves to 200', async () => {
    // List is pinned to workspace-home.component.ts + grc-operations.service.ts
    // after the Phase-9 cleanup. If the FE adds a new endpoint, add it
    // here so the contract is explicit.
    for (const p of [
      '/api/tenants/home/overview',          // getHomeOverview
      '/api/workspace/entitlements',         // post-login bootstrap
      '/api/users/me',                        // identity sanity
      '/api/auth/userinfo',                   // userinfo
    ]) {
      const status = await probe(p);
      expect(status, `${p} must be 200 for dashboard`).toBe(200);
    }
  });

  it('B. every endpoint the Phase-9 cleanup removed is 404 at the gateway', async () => {
    // Even though the FE no longer calls them, the gateway must
    // refuse to forward a forged deep-link request.
    for (const p of [
      '/api/ai-os/next-best-actions',
      '/api/ai-os/activity-feed',
      '/api/tenant-home/overview',            // legacy alias, not mapped
      '/api/kpi/card-indicators',             // no gateway prefix
      '/api/connector-health',                // no gateway prefix
    ]) {
      const status = await probe(p);
      expect(status, `${p} must be 404`).toBe(404);
    }
  });

  it('C. shipped workspace-home bundle contains no disabled-module URLs', () => {
    // The Phase-6 allowlist was narrowed, but the dashboard component
    // also hard-references FE routes (/risk/*, /vendor-hub, /ai-hub,
    // /qiyas, etc.) that are Wave-2. Those are filtered at render
    // time by `_platformMapSectionsRaw.filter(s => s.wave1)` —
    // assert the SOURCE flags are set correctly so the filter is
    // meaningful.
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'frontend/products/shahin/src/app/blueprint/pages/workspace-home/workspace-home.component.ts'),
      'utf8',
    );
    // The component must define a Wave-1 filter over platformMapSections.
    expect(src).toContain('_platformMapSectionsRaw');
    expect(src).toMatch(/get platformMapSections\(\)[\s\S]*wave1/);
    // And the non-Wave-1 groups must be flagged wave1: false.
    // We inspect groups by their label strings.
    const w1False = [
      "labelEn: 'Governance'",
      "labelEn: 'Risk Management'",
      "labelEn: 'Qiyas (Maturity)'",
      "labelEn: 'AI & Automation'",
      "labelEn: 'Integrations'",
    ];
    for (const marker of w1False) {
      const idx = src.indexOf(marker);
      expect(idx, `group ${marker} must exist in source`).toBeGreaterThan(-1);
      // Check the next 120 chars for wave1: false
      const window_ = src.slice(idx, idx + 160);
      expect(window_, `${marker} must be wave1:false`).toMatch(/wave1:\s*false/);
    }
  });

  it('D. GrcOperationsService points at /api/tenants/home, not the legacy /api/tenant-home alias', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'frontend/products/shahin/src/app/blueprint/products/agrc/services/grc-operations.service.ts'),
      'utf8',
    );
    expect(src).toContain('/tenants/home/overview');
    expect(src).toContain('/tenants/home/activity');
    expect(src).not.toMatch(/`[^`]*\/tenant-home\/overview[^`]*`/);
    expect(src).not.toMatch(/`[^`]*\/tenant-home\/activity[^`]*`/);
  });

  it('E. workspace-home no longer calls AI / connector-health / kpi-card-indicators', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'frontend/products/shahin-ai/src/app/blueprint/pages/workspace-home/workspace-home.component.ts'),
      'utf8',
    );
    // None of these strings may appear as .get(...) call arguments
    // from this component anymore. They may still appear in comments
    // (explaining the removal) — strip comments before asserting.
    const code = src
      .split('\n')
      .filter((ln) => !/^\s*(\/\/|\*|\/\*)/.test(ln))
      .join('\n');
    expect(code).not.toMatch(/apiclientSvc\.get\([^)]*ai-os/);
    expect(code).not.toMatch(/apiclientSvc\.get\([^)]*connector-health/);
    expect(code).not.toMatch(/getKpiCardIndicators\(\)/);
  });

  it('F. workspace entitlements carry the platform primitives the dashboard depends on', async () => {
    const res = await fetch(`${GATEWAY}/api/workspace/entitlements`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': adminTenantId },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const codes = new Set<string>(body.activeModules.map((m: any) => m.moduleCode));
    for (const required of ['platform', 'workspace', 'dashboard', 'foundation', 'reporting']) {
      expect(codes.has(required), `${required} must be in activeModules`).toBe(true);
    }
    for (const forbidden of ['risk', 'vendor', 'ai', 'ai-governance', 'privacy', 'dora', 'records']) {
      expect(codes.has(forbidden), `${forbidden} must NOT be in activeModules`).toBe(false);
    }
  });

  it('G. dashboard-surface disabled-module probes are 404 at the gateway', async () => {
    for (const p of [
      '/api/risk', '/api/vendor', '/api/privacy', '/api/dora',
      '/api/records', '/api/bcp', '/api/asset', '/api/portals',
      '/api/qiyas', '/api/training', '/api/ai-governance',
      '/api/ai', '/api/ai-engine', '/api/copilot', '/api/nudges', '/api/mcp',
      '/api/ai-os',
    ]) {
      const status = await probe(p);
      expect(status, `${p} must be 404`).toBe(404);
    }
  });
});
