import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const RISK_PAGES_DIR = resolve(__dirname, 'pages');
const NAV_CONFIG = resolve(__dirname, '../../core/platform/navigation/navigation.config.ts');
const EXECUTIVE_REPORT = resolve(__dirname, '../reports/pages/executive-report.component.ts');
const RISK_CONSTANTS = resolve(__dirname, 'risk.constants.ts');
const RISK_ROUTES = resolve(__dirname, '../../platform-manifests/risk.module.routes.ts');

/**
 * Spec primary pages — the minimum per Risk Module spec.
 * Each must exist, import GrcLiveService, and subscribe to live.risk$.
 */
const RISK_SPEC_PRIMARY_PAGES = [
  'risk-overview.component.ts',           // spec: Home
  'risk-work-queue/risk-work-queue.component.ts',  // spec: My Work
  'risk-register.component.ts',           // spec: Risk Register
  'risk-detail/risk-detail.component.ts', // spec: Risk Detail
  'risk-assessments.component.ts',        // spec: Assessments / RCSA
  'risk-kris.component.ts',              // spec: Indicators / KRIs
  'risk-treatments.component.ts',         // spec: Treatment Plans
  'risk-issues/risk-issues.component.ts', // spec: Issues & Escalations
  'risk-scenarios.component.ts',          // spec: Scenarios
  'risk-reports/risk-reports.component.ts', // spec: Reports
  'risk-admin/risk-admin.component.ts',   // spec: Admin
];

/** Extra (advanced) pages beyond spec minimum */
const RISK_EXTRA_PAGES = [
  'risk-scoring-page.component.ts',
  'risk-acceptance.component.ts',
  'risk-heatmap.component.ts',
  'risk-metrics-page.component.ts',
  'risk-appetite.component.ts',
  'risk-bowtie.component.ts',
];

function readPage(file: string): string {
  return readFileSync(resolve(RISK_PAGES_DIR, file), 'utf-8');
}

describe('Risk module — spec structure compliance', () => {
  it('all spec primary pages exist', () => {
    for (const file of RISK_SPEC_PRIMARY_PAGES) {
      const path = resolve(RISK_PAGES_DIR, file);
      expect(existsSync(path), `Missing spec page: ${file}`).toBe(true);
    }
  });

  it('all extra pages exist', () => {
    for (const file of RISK_EXTRA_PAGES) {
      const path = resolve(RISK_PAGES_DIR, file);
      expect(existsSync(path), `Missing extra page: ${file}`).toBe(true);
    }
  });
});

describe('Risk module — RISK_TABS integrity', () => {
  const src = readFileSync(RISK_CONSTANTS, 'utf-8');

  it('has 10 primary tabs (spec minimum)', () => {
    expect(src).toContain('RISK_PRIMARY_TABS');
    // Primary tabs don't have 'parent' property
    const primaryBlock = src.slice(
      src.indexOf('// ── Spec Primary'),
      src.indexOf('// ── Extras'),
    );
    const matches = primaryBlock.match(/\{ id: '/g);
    expect(matches?.length).toBe(10);
  });

  it('has 6 extra tabs with parent references', () => {
    const extraBlock = src.slice(src.indexOf('// ── Extras'));
    const matches = extraBlock.match(/parent: '/g);
    expect(matches?.length).toBe(6);
  });

  it('has no duplicate tab icons across all tabs', () => {
    const icons = [...src.matchAll(/icon: '([^']+)'/g)].map(m => m[1]);
    expect(icons.length).toBe(new Set(icons).size);
  });

  it('exports RISK_PRIMARY_TABS and getRiskSubTabs', () => {
    expect(src).toContain('export const RISK_PRIMARY_TABS');
    expect(src).toContain('export function getRiskSubTabs');
  });
});

describe('Risk module — route structure matches spec', () => {
  const routeSrc = readFileSync(RISK_ROUTES, 'utf-8');

  it('default redirect is home (not overview)', () => {
    expect(routeSrc).toContain("defaultRedirect: 'home'");
  });

  const specRoutes = [
    'home', 'work-queue', 'register', 'register/:id', 'assessments',
    'indicators', 'treatment', 'issues', 'scenarios', 'reports', 'admin',
  ];

  for (const route of specRoutes) {
    it(`has spec route: ${route}`, () => {
      // Route key in children object (single-quoted or as key)
      expect(routeSrc).toContain(`'${route}'`);
    });
  }

  it('has backward-compat redirects for old routes', () => {
    expect(routeSrc).toContain("overview:");
    expect(routeSrc).toContain("kris:");
    expect(routeSrc).toContain("treatments:");
  });
});

describe('Risk module — GrcLiveService wiring on spec primary pages', () => {
  const testablePages = RISK_SPEC_PRIMARY_PAGES.filter(f =>
    // Detail page uses ActivatedRoute pattern instead of direct live subscribe
    !f.includes('risk-detail'),
  );

  for (const file of testablePages) {
    it(`${file} injects GrcLiveService`, () => {
      const content = readPage(file);
      expect(content).toContain('GrcLiveService');
    });

    it(`${file} subscribes to live.risk$`, () => {
      const content = readPage(file);
      expect(content).toMatch(/this\.live\.risk\$|live\.risk\$/);
    });
  }
});

describe('Risk module — navigation config alignment', () => {
  const navSrc = readFileSync(NAV_CONFIG, 'utf-8');

  it('has 16 risk sidebar children (10 primary + 6 extras)', () => {
    const riskBlock = navSrc.slice(
      navSrc.indexOf("id: 'risk',"),
      navSrc.indexOf('],', navSrc.indexOf("id: 'risk',")) + 2,
    );
    const children = riskBlock.match(/\{ id: 'risk-/g);
    expect(children?.length).toBe(16);
  });

  it('first risk child is risk-home', () => {
    const riskBlock = navSrc.slice(navSrc.indexOf("id: 'risk',"));
    const firstChild = riskBlock.match(/\{ id: 'risk-(\w+)'/);
    expect(firstChild?.[1]).toBe('home');
  });

  it('has risk-work-queue, risk-issues, risk-admin entries', () => {
    expect(navSrc).toContain("id: 'risk-work-queue'");
    expect(navSrc).toContain("id: 'risk-issues'");
    expect(navSrc).toContain("id: 'risk-admin'");
  });
});

describe('Risk module — no stale drill routes', () => {
  it('executive-report drills to /risk/register for open risks', () => {
    const src = readFileSync(EXECUTIVE_REPORT, 'utf-8');
    expect(src).toContain("drill('/risk/register', {status: 'open'})");
    expect(src).not.toMatch(/drill\('\/risks'/);
  });
});

describe('Risk module — stale /risks references eliminated', () => {
  const WIDGET = resolve(__dirname, '../../shared/widgets/components/risk-distribution.widget.ts');
  const GLOBAL_SEARCH = resolve(__dirname, '../../shared/global-search/global-search.component.ts');
  const DASHBOARD_MODULES = resolve(__dirname, '../../shared/config/dashboard-modules.config.ts');
  const RELATIONSHIP_VIEW = resolve(__dirname, '../../shared/components/relationship-view.component.ts');
  const AGENT_REGISTRY = resolve(__dirname, '../../shared/agrc-os-agent-registry.ts');

  it('risk-distribution widget drills to /risk/register', () => {
    const src = readFileSync(WIDGET, 'utf-8');
    expect(src).toContain('/risk/register');
    expect(src).not.toContain("'/risks'");
  });

  it('global-search maps risk to /risk/register', () => {
    const src = readFileSync(GLOBAL_SEARCH, 'utf-8');
    expect(src).toContain("'/risk/register'");
  });

  it('dashboard-modules config routes to /risk', () => {
    const src = readFileSync(DASHBOARD_MODULES, 'utf-8');
    expect(src).toContain("route: '/risk/");
    expect(src).not.toContain("route: '/risks'");
  });

  it('relationship-view maps risk to /risk/register', () => {
    const src = readFileSync(RELATIONSHIP_VIEW, 'utf-8');
    expect(src).toContain("risk: '/risk/register'");
  });

  it('agent registry A07 has /risk routes', () => {
    const src = readFileSync(AGENT_REGISTRY, 'utf-8');
    expect(src).toContain("'/risk/");
    expect(src).not.toContain("'/risks'");
  });
});

describe('Risk module — mutation interceptor coverage', () => {
  const INTERCEPTOR = resolve(__dirname, '../../core/interceptors/grc-mutation.interceptor.ts');
  const src = readFileSync(INTERCEPTOR, 'utf-8');

  for (const endpoint of ['risk-smart', 'risk-ws', 'risk-scoring', 'risk-metrics', 'risk-appetite']) {
    it(`intercepts /${endpoint} endpoint`, () => {
      expect(src).toContain(endpoint);
    });
  }
});

describe('Risk module — backend risk-smart routes exist', () => {
  const BACKEND_SMART = resolve(
    __dirname,
    '../../../../../backend/src/modules/risk/routes/risk-smart.routes.ts',
  );

  it('risk-smart.routes.ts exists and has lookups endpoint', () => {
    const src = readFileSync(BACKEND_SMART, 'utf-8');
    expect(src).toContain('/lookups');
  });

  it('risk-smart.routes.ts has suggest-owner endpoint', () => {
    const src = readFileSync(BACKEND_SMART, 'utf-8');
    expect(src).toContain('/suggest-owner');
  });

  it('risk-smart.routes.ts has calculate-score endpoint', () => {
    const src = readFileSync(BACKEND_SMART, 'utf-8');
    expect(src).toContain('/calculate-score');
  });
});

describe('Risk module — backend spec endpoints exist', () => {
  const BACKEND_WS = resolve(
    __dirname,
    '../../../../../backend/src/modules/risk/routes/risk-workspace.routes.ts',
  );
  const src = readFileSync(BACKEND_WS, 'utf-8');

  for (const endpoint of ['/work-queue', '/issues', '/reports/catalog', '/reports/run', '/admin/settings']) {
    it(`risk-workspace has ${endpoint} endpoint`, () => {
      expect(src).toContain(endpoint);
    });
  }
});

describe('Risk module — backend spec services exist', () => {
  const SERVICES_DIR = resolve(
    __dirname,
    '../../../../../backend/src/modules/risk/services',
  );

  const specServices = [
    'risk-taxonomy.service.ts',
    'risk-register.service.ts',
    'risk-assessment.service.ts',
    'risk-scoring.service.ts',
    'kri-tracking.service.ts',
    'risk-treatments.service.ts',
    'risk-issue-link.service.ts',
    'risk-reporting.service.ts',
    'risk-notification.service.ts',
    'risk-overview.service.ts',
    'risk-heatmap.service.ts',
    'risk-trend-analyzer.service.ts',
  ];

  for (const svc of specServices) {
    it(`${svc} exists`, () => {
      expect(existsSync(resolve(SERVICES_DIR, svc)), `Missing service: ${svc}`).toBe(true);
    });
  }
});

describe('Risk module — DB migration for spec alignment exists', () => {
  const MIGRATION = resolve(
    __dirname,
    '../../../../../backend/src/migrations/tenant/716_risk_spec_alignment.sql',
  );

  it('migration 716 exists', () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });

  it('adds next_review_date column', () => {
    const src = readFileSync(MIGRATION, 'utf-8');
    expect(src).toContain('next_review_date');
  });

  it('adds indicator_type column', () => {
    const src = readFileSync(MIGRATION, 'utf-8');
    expect(src).toContain('indicator_type');
  });

  it('creates risk_campaigns table', () => {
    const src = readFileSync(MIGRATION, 'utf-8');
    expect(src).toContain('risk_campaigns');
  });

  it('creates dedicated link tables', () => {
    const src = readFileSync(MIGRATION, 'utf-8');
    expect(src).toContain('risk_policy_links');
    expect(src).toContain('risk_evidence_links');
    expect(src).toContain('risk_compliance_links');
    expect(src).toContain('risk_vendor_links');
    expect(src).toContain('risk_asset_links');
  });
});
