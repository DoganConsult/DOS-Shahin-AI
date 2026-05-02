/**
 * Registration Drift Validator (Frontend)
 *
 * Ensures cross-layer consistency between:
 * - component-registry.ts (routes)
 * - page.registry.ts (page metadata)
 * - module-ui.registry.ts (module metadata)
 *
 * Run: ng test --include='registration-drift-validator.spec.ts'
 */

import { MODULE_ROUTE_GROUPS, STANDALONE_ROUTES, MODULE_ROUTE_METADATA } from '../../../../../../platform/core/routing/component-registry';
import { PAGE_REGISTRY, PAGE_BY_ROUTE } from './page.registry';
import { MODULE_UI_REGISTRY, MODULE_UI_MAP } from './module-ui.registry';

const MODULES_WITH_UI = new Set([
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident',
  'exception', 'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action',
  'training', 'qiyas', 'ai-governance', 'privacy', 'knowledge',
  'foundation', 'reporting', 'ai', 'integrations', 'admin',
  'notification', 'team', 'workflow',
]);

const ALL_VALID_MODULE_REFS = new Set([
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident',
  'exception', 'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action',
  'training', 'qiyas', 'ai-governance', 'assessment', 'privacy',
  'foundation', 'reports', 'reporting', 'ai', 'integrations', 'admin',
  'maturity', 'knowledge', 'workspace', 'workflow', 'analytics', 'messaging',
  'notification', 'team', 'navigation',
]);

describe('Registration Drift Validator', () => {
  it('every canonical module has a MODULE_UI_REGISTRY entry', () => {
    const missing: string[] = [];
    for (const mod of MODULES_WITH_UI) {
      if (!MODULE_UI_MAP.has(mod)) {
        missing.push(mod);
      }
    }
    expect(missing).toEqual([]);
  });

  it('MODULE_UI_REGISTRY has no entries for non-canonical modules', () => {
    const invalid: string[] = [];
    for (const entry of MODULE_UI_REGISTRY) {
      if (!MODULES_WITH_UI.has(entry.moduleCode) && !ALL_VALID_MODULE_REFS.has(entry.moduleCode)) {
        invalid.push(entry.moduleCode);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('every module hub in MODULE_ROUTE_GROUPS has metadata', () => {
    const missing: string[] = [];
    for (const path of Object.keys(MODULE_ROUTE_GROUPS)) {
      if (!MODULE_ROUTE_METADATA[path]) {
        missing.push(path);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every page.registry moduleCode is canonical or UI-only', () => {
    const invalid: string[] = [];
    for (const page of PAGE_REGISTRY) {
      if (!MODULES_WITH_UI.has(page.moduleCode) && !ALL_VALID_MODULE_REFS.has(page.moduleCode)) {
        invalid.push(`${page.pageCode} → moduleCode '${page.moduleCode}'`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('no duplicate pageCode in PAGE_REGISTRY', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const page of PAGE_REGISTRY) {
      if (seen.has(page.pageCode)) {
        dupes.push(page.pageCode);
      }
      seen.add(page.pageCode);
    }
    expect(dupes).toEqual([]);
  });

  it('no duplicate route in PAGE_REGISTRY', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const page of PAGE_REGISTRY) {
      if (seen.has(page.route)) {
        dupes.push(`${page.route} (${page.pageCode})`);
      }
      seen.add(page.route);
    }
    expect(dupes).toEqual([]);
  });

  it('page registry has minimum 200 entries (was 142 pre-remediation)', () => {
    expect(PAGE_REGISTRY.length).toBeGreaterThanOrEqual(200);
  });

  it('MODULE_UI_REGISTRY has minimum 21 entries', () => {
    expect(MODULE_UI_REGISTRY.length).toBeGreaterThanOrEqual(21);
  });

  it('operating-cockpit is a shell child route (not top-level)', () => {
    expect(STANDALONE_ROUTES['operating-cockpit']).toBeDefined();
    expect(STANDALONE_ROUTES['operating-cockpit'].loadComponent).toBeDefined();
    expect(STANDALONE_ROUTES['operating-cockpit'].moduleCode).toBe('admin');
    expect(STANDALONE_ROUTES['operating-cockpit'].requiredPermission).toBe('admin.system.read');
  });

  it('standalone routes with moduleCode reference canonical or UI-only modules', () => {
    const invalid: string[] = [];
    for (const [path, entry] of Object.entries(STANDALONE_ROUTES)) {
      if (entry.moduleCode && !MODULES_WITH_UI.has(entry.moduleCode) && !ALL_VALID_MODULE_REFS.has(entry.moduleCode)) {
        invalid.push(`Route '${path}' → moduleCode '${entry.moduleCode}'`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('page.registry moduleCode matches component-registry moduleCode for matching routes', () => {
    const mismatches: string[] = [];
    for (const page of PAGE_REGISTRY) {
      const routePath = page.route.startsWith('/') ? page.route.slice(1) : page.route;
      const standaloneEntry = STANDALONE_ROUTES[routePath];
      if (standaloneEntry && standaloneEntry.moduleCode && standaloneEntry.moduleCode !== page.moduleCode) {
        mismatches.push(
          `Route '${routePath}': component-registry='${standaloneEntry.moduleCode}' vs page.registry='${page.moduleCode}'`
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('page.registry requiredPermissions matches component-registry requiredPermission for matching routes', () => {
    const mismatches: string[] = [];
    for (const page of PAGE_REGISTRY) {
      const routePath = page.route.startsWith('/') ? page.route.slice(1) : page.route;
      const standaloneEntry = STANDALONE_ROUTES[routePath];
      if (standaloneEntry?.requiredPermission && page.requiresPermissions.length > 0) {
        if (!page.requiresPermissions.includes(standaloneEntry.requiredPermission)) {
          mismatches.push(
            `Route '${routePath}': component-registry='${standaloneEntry.requiredPermission}' not in page.registry=${JSON.stringify(page.requiresPermissions)}`
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
