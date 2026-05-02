/**
 * Per-Module UI/UX Wiring Checklist
 *
 * Validates that EVERY canonical module has all required frontend artifacts:
 * - Navigation entry (sidebar ordering & children)
 * - Route manifest (pages & page count)
 * - Shell registry (KPIs, tabs, filters, lifecycle, table views, form fields, reports, agents)
 * - Module UI registry entry (icon, color, landing route, permission prefix)
 * - Generated route fragment
 * - Standard page pattern (home, work-queue, reports, admin)
 *
 * Run: cd frontend && pnpm exec vitest run src/app/shared/contracts/per-module-ui-checklist.test.ts
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { MODULE_SHELL_REGISTRY, getAllModuleShellDefinitions } from './module-shell-registry';
import { MODULE_TABLE_VIEWS } from './module-table-views';
import { MODULE_CREATE_FORM_FIELDS, MODULE_REPORT_DEFINITIONS } from './module-form-fields';
import { MODULE_ROUTE_GROUPS, MODULE_ROUTE_METADATA } from '../../../core/routing/component-registry';
import { MODULE_UI_REGISTRY, MODULE_UI_MAP } from '../../../registries/module-ui.registry';
import {
  PLATFORM_NAV,
  SHAHIN_NAV,
  PLATFORM_NAV_BOTTOM,
} from '../../../core/platform/navigation/navigation.config';

const CANONICAL_CODES = [
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident', 'exception',
  'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action', 'training',
  'qiyas', 'ai-governance', 'foundation', 'reporting', 'ai', 'integrations',
  'admin', 'workflow', 'notification', 'analytics', 'team', 'issues', 'inbox',
  'portals', 'records', 'controls', 'dora', 'journey', 'privacy',
] as const;

const MANIFESTS_DIR = resolve(__dirname, '../../platform-manifests');
const GENERATED_FILE = resolve(__dirname, '../../generated/module-route-fragments.generated.ts');

const FULL_TIER_MODULES = [
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident', 'exception',
  'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action', 'issues', 'privacy', 'controls', 'dora',
];
const DOMAIN_TIER_MODULES = ['training', 'qiyas', 'ai-governance', 'portals', 'records', 'journey'];
const PLATFORM_TIER_MODULES = [
  'foundation', 'reporting', 'ai', 'integrations', 'admin', 'workflow',
  'notification', 'analytics', 'team', 'inbox',
];

const MANIFEST_SLUG_MAP: Record<string, string> = {
  incident: 'incidents',
  vendor: 'vendor-risk',
  reporting: 'reports',
};

function manifestSlug(code: string): string {
  return MANIFEST_SLUG_MAP[code] ?? code;
}

function allNavItems() {
  return [...PLATFORM_NAV, ...SHAHIN_NAV, ...PLATFORM_NAV_BOTTOM];
}

function findNavGroup(code: string) {
  return allNavItems().find(
    (item) => item.id === code || item.module === code,
  );
}

function findNavModuleRef(code: string): boolean {
  const items = allNavItems();
  for (const item of items) {
    if (item.module === code) return true;
    if (item.children?.some((c) => c.module === code)) return true;
  }
  return false;
}

function countManifestPages(slug: string): { pages: number; redirects: number } {
  const path = resolve(MANIFESTS_DIR, `${slug}.module.routes.ts`);
  if (!existsSync(path)) return { pages: 0, redirects: 0 };
  const src = readFileSync(path, 'utf-8');
  return {
    pages: (src.match(/loadComponent:/g) ?? []).length,
    redirects: (src.match(/redirectTo:/g) ?? []).length,
  };
}

interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function runUiChecklist(code: string): CheckResult[] {
  const results: CheckResult[] = [];
  const slug = manifestSlug(code);
  const isFull = FULL_TIER_MODULES.includes(code);
  const isDomain = DOMAIN_TIER_MODULES.includes(code);

  // ── 1. Shell Registry ──────────────────────────────────────────────
  const shell = MODULE_SHELL_REGISTRY[code];
  results.push({ name: 'shell_registry/exists', pass: !!shell });

  if (shell) {
    results.push({ name: 'shell_registry/moduleCode_match', pass: shell.moduleCode === code });
    results.push({ name: 'shell_registry/moduleName_en', pass: !!shell.moduleName?.en });
    results.push({ name: 'shell_registry/moduleName_ar', pass: !!shell.moduleName?.ar });
    results.push({ name: 'shell_registry/icon', pass: /^pi-/.test(shell.moduleIcon ?? '') });
    results.push({ name: 'shell_registry/accentToken', pass: !!shell.moduleAccentToken });
    results.push({ name: 'shell_registry/purposeLine_en', pass: !!shell.purposeLine?.en });
    results.push({ name: 'shell_registry/purposeLine_ar', pass: !!shell.purposeLine?.ar });
    results.push({ name: 'shell_registry/primaryAiAction', pass: !!shell.primaryAiAction?.id });
    results.push({ name: 'shell_registry/kpis_min5', pass: (shell.kpiDefinitions?.length ?? 0) >= 5, detail: `${shell.kpiDefinitions?.length ?? 0} KPIs` });
    results.push({ name: 'shell_registry/tabs_min3', pass: (shell.defaultRecordTabs?.length ?? 0) >= 3, detail: `${shell.defaultRecordTabs?.length ?? 0} tabs` });
    results.push({ name: 'shell_registry/tabs_one_default', pass: shell.defaultRecordTabs?.filter((t) => t.default).length === 1 });
    results.push({ name: 'shell_registry/filters_min3', pass: (shell.filters?.length ?? 0) >= 3, detail: `${shell.filters?.length ?? 0} filters` });
    results.push({ name: 'shell_registry/lifecycle_defined', pass: !isFull && !isDomain || (shell.lifecycleDefinition?.length ?? 0) > 0, detail: `${shell.lifecycleDefinition?.length ?? 0} steps` });
    results.push({ name: 'shell_registry/tableViews', pass: (shell.tableViews?.length ?? 0) > 0 });
    results.push({ name: 'shell_registry/agents_min1', pass: (shell.agents?.length ?? 0) >= 1 });
    results.push({ name: 'shell_registry/workspacePattern', pass: !!shell.defaultWorkspacePattern });
    results.push({ name: 'shell_registry/tier', pass: ['full', 'domain', 'platform'].includes(shell.tier) });
    results.push({ name: 'shell_registry/createFormFields', pass: (shell.createFormFields?.length ?? 0) > 0, detail: `${shell.createFormFields?.length ?? 0} fields` });
    results.push({ name: 'shell_registry/reportDefinitions', pass: (shell.reportDefinitions?.length ?? 0) > 0, detail: `${shell.reportDefinitions?.length ?? 0} reports` });
    results.push({ name: 'shell_registry/aiCapabilities_min4', pass: (shell.aiCapabilities?.length ?? 0) >= 4 });
    results.push({ name: 'shell_registry/relatedObjectTypes', pass: (shell.relatedObjectTypes?.length ?? 0) > 0 });
    results.push({ name: 'shell_registry/emptyStatePreset', pass: !!shell.emptyStatePreset });
  }

  // ── 2. Table Views ─────────────────────────────────────────────────
  results.push({ name: 'table_views/exists', pass: !!MODULE_TABLE_VIEWS[code] });
  results.push({ name: 'table_views/has_columns', pass: (MODULE_TABLE_VIEWS[code]?.[0]?.columns?.length ?? 0) > 0 });

  // ── 3. Form Fields ─────────────────────────────────────────────────
  results.push({ name: 'form_fields/exists', pass: !!MODULE_CREATE_FORM_FIELDS[code] });
  results.push({ name: 'form_fields/has_required', pass: MODULE_CREATE_FORM_FIELDS[code]?.some((f) => f.required) ?? false });

  // ── 4. Report Definitions ──────────────────────────────────────────
  results.push({ name: 'report_defs/exists', pass: !!MODULE_REPORT_DEFINITIONS[code] });
  results.push({ name: 'report_defs/min1', pass: (MODULE_REPORT_DEFINITIONS[code]?.length ?? 0) > 0 });

  // ── 5. Module UI Registry ──────────────────────────────────────────
  const uiEntry = MODULE_UI_MAP.get(code);
  results.push({ name: 'ui_registry/exists', pass: !!uiEntry });
  if (uiEntry) {
    results.push({ name: 'ui_registry/icon', pass: !!uiEntry.icon });
    results.push({ name: 'ui_registry/labelEn', pass: !!uiEntry.labelEn });
    results.push({ name: 'ui_registry/labelAr', pass: !!uiEntry.labelAr });
    results.push({ name: 'ui_registry/landingRoute', pass: !!uiEntry.defaultLandingRoute });
    results.push({ name: 'ui_registry/permissionPrefix', pass: !!uiEntry.permissionPrefix });
    results.push({ name: 'ui_registry/color', pass: !!uiEntry.color });
    results.push({ name: 'ui_registry/dashboardPresets', pass: (uiEntry.dashboardPresets?.length ?? 0) > 0 });
  }

  // ── 6. Route Manifest ──────────────────────────────────────────────
  const manifestPath = resolve(MANIFESTS_DIR, `${slug}.module.routes.ts`);
  results.push({ name: 'route_manifest/file_exists', pass: existsSync(manifestPath), detail: `${slug}.module.routes.ts` });
  const { pages, redirects } = countManifestPages(slug);
  results.push({ name: 'route_manifest/has_pages', pass: pages > 0, detail: `${pages} pages + ${redirects} redirects` });

  // ── 7. Route Groups (generated barrel) ─────────────────────────────
  const routeGroupKey = Object.keys(MODULE_ROUTE_GROUPS).find(
    (k) => k === code || k === slug,
  );
  results.push({ name: 'route_groups/in_generated_barrel', pass: !!routeGroupKey, detail: routeGroupKey ?? 'not found' });

  // ── 8. Route Metadata ──────────────────────────────────────────────
  if (routeGroupKey) {
    const meta = MODULE_ROUTE_METADATA[routeGroupKey];
    results.push({ name: 'route_metadata/exists', pass: !!meta });
    results.push({ name: 'route_metadata/moduleCode', pass: !!meta?.moduleCode });
  }

  // ── 9. Navigation ─────────────────────────────────────────────────
  const navGroup = findNavGroup(code);
  const navRef = findNavModuleRef(code);
  results.push({ name: 'navigation/in_sidebar', pass: !!navGroup || navRef, detail: navGroup ? `top-level group "${navGroup.id}"` : navRef ? 'referenced as module' : 'MISSING' });

  if (navGroup?.children) {
    results.push({ name: 'navigation/has_children', pass: navGroup.children.length > 0, detail: `${navGroup.children.length} children` });
    results.push({ name: 'navigation/bilingual_labels', pass: !!navGroup.labelEn && !!navGroup.labelAr });
    results.push({ name: 'navigation/has_icon', pass: !!navGroup.icon });
  }

  // ── 10. Standard Page Pattern (for full/domain tier) ───────────────
  if ((isFull || isDomain) && navGroup?.children) {
    const childRoutes = navGroup.children.map((c) => c.route ?? '');
    const hasHome = childRoutes.some((r) => r.includes('/home') || r.includes('/overview'));
    const hasReports = childRoutes.some((r) => r.includes('/reports'));
    const hasAdmin = childRoutes.some((r) => r.includes('/admin'));
    results.push({ name: 'page_pattern/has_home_or_overview', pass: hasHome });
    results.push({ name: 'page_pattern/has_reports', pass: hasReports });
    results.push({ name: 'page_pattern/has_admin', pass: hasAdmin });
  }

  return results;
}

// ── Generate per-module test suites ───────────────────────────────────

for (const code of CANONICAL_CODES) {
  const tier = FULL_TIER_MODULES.includes(code) ? 'full' : DOMAIN_TIER_MODULES.includes(code) ? 'domain' : 'platform';

  describe(`UI Module "${code}" [${tier}]`, () => {
    const checks = runUiChecklist(code);

    for (const check of checks) {
      it(`${check.name}${check.detail ? ` (${check.detail})` : ''}`, () => {
        expect(check.pass, `FAIL: ${code} → ${check.name}`).toBe(true);
      });
    }

    it('summary: all checks pass', () => {
      const failures = checks.filter((c) => !c.pass);
      if (failures.length > 0) {
        const summary = failures.map((f) => `  ❌ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`).join('\n');
        expect.fail(
          `UI Module "${code}" has ${failures.length}/${checks.length} failing checks:\n${summary}`,
        );
      }
    });
  });
}

// ── Navigation Ordering ───────────────────────────────────────────────

describe('Navigation ordering — sidebar structure', () => {
  const allTop = allNavItems();

  it('prints sidebar order', () => {
    const lines: string[] = [];
    for (let i = 0; i < allTop.length; i++) {
      const item = allTop[i];
      const children = item.children?.length ?? 0;
      lines.push(`${String(i + 1).padStart(2)}. ${item.id.padEnd(20)} [${item.module ?? '-'}] ${children > 0 ? `(${children} children)` : '(leaf)'}`);
    }
    console.log('\n' + '═'.repeat(70));
    console.log('  SIDEBAR NAVIGATION ORDER');
    console.log('═'.repeat(70));
    console.log(lines.join('\n'));
    console.log('═'.repeat(70) + '\n');
    expect(true).toBe(true);
  });

  it('Home is first item', () => {
    expect(allTop[0]?.id).toBe('home');
  });

  it('Foundation comes before GRC modules', () => {
    const foundationIdx = allTop.findIndex((i) => i.id === 'foundation');
    const riskIdx = allTop.findIndex((i) => i.id === 'risk');
    const complianceIdx = allTop.findIndex((i) => i.id === 'compliance');
    expect(foundationIdx).toBeLessThan(riskIdx);
    expect(foundationIdx).toBeLessThan(complianceIdx);
  });

  it('Governance comes before Risk', () => {
    const govIdx = allTop.findIndex((i) => i.id === 'governance');
    const riskIdx = allTop.findIndex((i) => i.id === 'risk');
    expect(govIdx).toBeLessThan(riskIdx);
  });

  it('Risk comes before Compliance', () => {
    const riskIdx = allTop.findIndex((i) => i.id === 'risk');
    const compIdx = allTop.findIndex((i) => i.id === 'compliance');
    expect(riskIdx).toBeLessThan(compIdx);
  });

  it('Admin is last', () => {
    const adminIdx = allTop.findIndex((i) => i.id === 'admin');
    expect(adminIdx).toBe(allTop.length - 1);
  });

  it('every top-level nav item has an icon', () => {
    for (const item of allTop) {
      expect(item.icon, `nav "${item.id}" missing icon`).toBeTruthy();
    }
  });

  it('every top-level nav item has bilingual labels', () => {
    for (const item of allTop) {
      expect(item.labelEn, `nav "${item.id}" missing labelEn`).toBeTruthy();
      expect(item.labelAr, `nav "${item.id}" missing labelAr`).toBeTruthy();
    }
  });

  it('no duplicate top-level nav ids', () => {
    const ids = allTop.map((i) => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ── Aggregate scorecard ───────────────────────────────────────────────

describe('Aggregate UI module scorecard', () => {
  it('prints per-module UI scorecard', () => {
    const scorecard: string[] = [];
    for (const code of CANONICAL_CODES) {
      const checks = runUiChecklist(code);
      const passed = checks.filter((c) => c.pass).length;
      const total = checks.length;
      const tier = FULL_TIER_MODULES.includes(code) ? 'full' : DOMAIN_TIER_MODULES.includes(code) ? 'domain' : 'platform';
      const status = passed === total ? '✅' : '⚠️';
      scorecard.push(`${status} ${code.padEnd(16)} [${tier.padEnd(8)}] ${passed}/${total}`);
    }
    console.log('\n' + '═'.repeat(60));
    console.log('  UI MODULE WIRING SCORECARD');
    console.log('═'.repeat(60));
    console.log(scorecard.join('\n'));
    console.log('═'.repeat(60) + '\n');
    expect(true).toBe(true);
  });

  it('all modules pass UI checklist', () => {
    const incomplete: string[] = [];
    for (const code of CANONICAL_CODES) {
      const checks = runUiChecklist(code);
      const failures = checks.filter((c) => !c.pass);
      if (failures.length > 0) {
        incomplete.push(
          `${code}: ${failures.map((f) => f.name).join(', ')}`,
        );
      }
    }
    if (incomplete.length > 0) {
      expect.fail(
        `${incomplete.length} module(s) have incomplete UI wiring:\n${incomplete.join('\n')}`,
      );
    }
  });
});
