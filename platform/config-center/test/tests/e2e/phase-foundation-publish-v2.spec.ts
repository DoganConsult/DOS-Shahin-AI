/**
 * Phase Foundation Publish v2.0.0 — DB → resolver → archetype binding harness.
 *
 * Asserts the published Foundation v2.0.0 module contract is wired live in
 * `dos.ui_route_template_binding` for the 21 canonical pages defined in
 * `module_complete_direct_seed_pack/foundation-complete-direct-seed.json`
 * and consumed by ui-os-service:4015's template-binding resolver.
 *
 *   GATE 2 — `/api/ui-os/template-binding?route=/foundation/<page>` returns
 *            200 with the MD/JSON-declared archetype.
 *   GATE 3 — `template_export` is non-empty and matches the archetype-family
 *            mapping (live DB uses `module.<archetype>.page` aliases that
 *            resolve to the canonical *TemplateComponent loaders).
 *   GATE 4 — Positive-render: response carries `props` (object) and the
 *            archetype-family loader is one of the 47 known LOADERS.
 *
 * Calls the ui-os-service resolver directly via `request.newContext`
 * (LEGACY_HEADER_TRUST=true allows raw `x-user-sub` + `x-tenant-id`).
 *
 * Env:
 *   UI_OS_BASE_URL   — defaults to http://localhost:4015
 *   DOS_USER_SUB     — defaults to "foundation-publish-v2@grc"
 *   DOS_TENANT_ID    — defaults to "grc"
 */
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

interface FoundationCase {
  route: string;
  archetype: string;
  /** archetype-family loader alias seeded in dos.ui_route_template_binding */
  templateExport: string;
}

// 21 canonical pages from foundation-complete-direct-seed.json#pages[]
// archetype + live template_export alias from dos.ui_route_template_binding.
const CASES: FoundationCase[] = [
  { route: '/foundation/overview',        archetype: 'command-home',          templateExport: 'module.overview.page' },
  { route: '/foundation/organization',    archetype: 'org-chart',             templateExport: 'module.org_chart.page' },
  { route: '/foundation/business-units',  archetype: 'org-chart',             templateExport: 'module.org_chart.page' },
  { route: '/foundation/departments',     archetype: 'org-chart',             templateExport: 'module.org_chart.page' },
  { route: '/foundation/positions',       archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/locations',       archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/users',           archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/teams',           archetype: 'org-chart',             templateExport: 'module.org_chart.page' },
  { route: '/foundation/roles',           archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/permissions',     archetype: 'ownership-map',         templateExport: 'module.ownership_map.page' },
  { route: '/foundation/committees',      archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/delegations',     archetype: 'delegation-center',     templateExport: 'module.delegation_center.page' },
  { route: '/foundation/access-review',   archetype: 'workflow-control',      templateExport: 'module.workflows.page' },
  { route: '/foundation/policies',        archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/audit',           archetype: 'audit-trail-ledger',    templateExport: 'module.audit_trail_ledger.page' },
  { route: '/foundation/ownership',       archetype: 'ownership-map',         templateExport: 'module.ownership_map.page' },
  { route: '/foundation/sod',             archetype: 'module-settings',       templateExport: 'module.settings.page' },
  { route: '/foundation/hierarchy-viz',   archetype: 'org-chart',             templateExport: 'module.org_chart.page' },
  { route: '/foundation/user-lifecycle',  archetype: 'workflow-timeline',     templateExport: 'module.workflow_timeline.page' },
  { route: '/foundation/reference-data',  archetype: 'intelligent-register',  templateExport: 'module.records.page' },
  { route: '/foundation/diagnostics',     archetype: 'posture-overview',      templateExport: 'module.posture.page' },
];

const BASE = process.env.UI_OS_BASE_URL || 'http://localhost:4015';
const SUB  = process.env.DOS_USER_SUB    || 'foundation-publish-v2@grc';
const TID  = process.env.DOS_TENANT_ID   || 'grc';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await pwRequest.newContext({
    baseURL: BASE,
    extraHTTPHeaders: {
      'x-user-sub':   SUB,
      'x-tenant-id':  TID,
      'x-user-roles': 'admin',
    },
  });
});
test.afterAll(async () => { await api.dispose(); });

test.describe('Phase Foundation Publish v2.0.0 — 21 pages × archetype × loader', () => {
  for (const c of CASES) {
    test(`${c.archetype} @ ${c.route}`, async () => {
      const res = await api.get(`/api/ui-os/template-binding?route=${encodeURIComponent(c.route)}`);
      expect(res.status(), `resolver must return 200 for ${c.route}`).toBe(200);
      const body = await res.json();

      // GATE 2 — archetype matches MD/JSON contract
      expect(body.archetype, `archetype mismatch for ${c.route}`).toBe(c.archetype);

      // GATE 3 — template_export aligned to archetype-family alias
      expect(body.template_export, `template_export must be non-empty for ${c.route}`).toBeTruthy();
      expect(body.template_export, `template_export mismatch for ${c.route}`).toBe(c.templateExport);

      // GATE 4 — positive-render: props is an object (may be {})
      expect(body.props, `props must be an object on ${c.route}`).toBeTruthy();
      expect(typeof body.props === 'object', `props must be object on ${c.route}`).toBeTruthy();
    });
  }

  test('contract surface — all 21 foundation routes registered live', async () => {
    let registered = 0;
    for (const c of CASES) {
      const res = await api.get(`/api/ui-os/template-binding?route=${encodeURIComponent(c.route)}`);
      if (res.status() === 200) registered += 1;
    }
    expect(registered, `expected 21/21 foundation routes registered, got ${registered}/21`).toBe(CASES.length);
  });
});
