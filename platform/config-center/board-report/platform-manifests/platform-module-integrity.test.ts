/**
 * Platform-wide module integrity: every hub in MODULE_ROUTE_GROUPS must have
 * metadata, a manifest file, and generated-barrel alignment. AGRC-owned API paths
 * declared in agrc-route-ownership.ts must appear in agrc-route-manifest.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { MODULE_ROUTE_GROUPS, MODULE_ROUTE_METADATA } from '../core/routing/component-registry';

const PLATFORM_MANIFESTS_DIR = resolve(__dirname);
const GENERATED_FRAGMENTS = resolve(__dirname, '../generated/module-route-fragments.generated.ts');
/** Repo root (from frontend/src/app/platform-manifests → 4 levels up). */
const PROJECT_ROOT = resolve(__dirname, '../../../../');
const AGRC_ROUTE_OWNERSHIP = resolve(PROJECT_ROOT, 'backend/src/products/shahin-ai/agrc-route-ownership.ts');
const AGRC_ROUTE_MANIFEST = resolve(PROJECT_ROOT, 'backend/src/products/shahin-ai/agrc-route-manifest.ts');

function sortedKeys<T extends Record<string, unknown>>(o: T): string[] {
  return Object.keys(o).sort();
}

/** Paths owned by AGRC product (declarative catalog). */
function extractAgrcOwnershipPaths(ownershipSrc: string): string[] {
  const paths: string[] = [];
  const re = /\{\s*path:\s*'([^']+)'\s*,\s*owner:\s*'agrc'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ownershipSrc)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

/** Exact mount paths registered in the runtime manifest (string literals after path:). */
function extractManifestMountPaths(manifestSrc: string): Set<string> {
  const set = new Set<string>();
  const re = /path:\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(manifestSrc)) !== null) {
    set.add(m[1]);
  }
  return set;
}

function parseGeneratedHubKeys(generatedSrc: string): string[] {
  const block = generatedSrc.match(
    /export const GENERATED_MODULE_ROUTE_GROUPS[^=]+=\s*\{([\s\S]*?)\n\};/,
  );
  expect(block).toBeTruthy();
  const inner = block![1];
  const keys: string[] = [];
  const lineRe = /^\s+'([^']+)':\s*/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(inner)) !== null) {
    keys.push(m[1]);
  }
  return keys.sort();
}

describe('Platform module hubs — registry parity', () => {
  const hubs = sortedKeys(MODULE_ROUTE_GROUPS);

  it('has at least 1 UI module hub and matches generated barrel count', () => {
    const genSrc = readFileSync(GENERATED_FRAGMENTS, 'utf-8');
    const generatedKeys = parseGeneratedHubKeys(genSrc);
    expect(hubs.length).toBeGreaterThan(0);
    expect(hubs.length).toBe(generatedKeys.length);
  });

  it('matches GENERATED_MODULE_ROUTE_GROUPS keys (run pnpm run generate:route-fragments if drift)', () => {
    const genSrc = readFileSync(GENERATED_FRAGMENTS, 'utf-8');
    const generatedKeys = parseGeneratedHubKeys(genSrc);
    expect(generatedKeys).toEqual(hubs);
  });

  it('every hub has MODULE_ROUTE_METADATA (guards / nav moduleCode)', () => {
    for (const hub of hubs) {
      expect(MODULE_ROUTE_METADATA[hub], `missing metadata for hub "${hub}"`).toBeDefined();
      expect(MODULE_ROUTE_METADATA[hub].moduleCode.length).toBeGreaterThan(0);
    }
  });
});

describe('Platform module hubs — manifest files & shape', () => {
  const hubs = sortedKeys(MODULE_ROUTE_GROUPS);

  for (const hub of hubs) {
    const fileName = `${hub}.module.routes.ts`;
    const filePath = resolve(PLATFORM_MANIFESTS_DIR, fileName);

    it(`${hub}: manifest file ${fileName} exists`, () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it(`${hub}: manifest has route group shape (shell or layout-only) + children + lazy/redirect`, () => {
      const src = readFileSync(filePath, 'utf-8');
      const hasShell = /shell\s*:\s*\(/.test(src);
      const hasChildren = /children\s*:\s*\{/.test(src);
      expect(hasChildren).toBe(true);
      // Most hubs use a shell; agrc-dashboard loads layout via :code child only.
      expect(hasShell || hub === 'agrc-dashboard').toBe(true);
      const hasLazy = src.includes('loadComponent:');
      const hasRedirect = src.includes('redirectTo:');
      expect(hasLazy || hasRedirect).toBe(true);
    });
  }
});

describe('AGRC route ownership ↔ agrc-route-manifest (runtime mounts)', () => {
  const ownershipSrc = readFileSync(AGRC_ROUTE_OWNERSHIP, 'utf-8');
  const manifestSrc = readFileSync(AGRC_ROUTE_MANIFEST, 'utf-8');
  const agrcPaths = extractAgrcOwnershipPaths(ownershipSrc);
  const manifestPaths = extractManifestMountPaths(manifestSrc);

  it('extracts AGRC-owned paths from ownership file', () => {
    expect(agrcPaths.length).toBeGreaterThan(50);
  });

  it('every AGRC-owned path is mounted in agrc-route-manifest', () => {
    const missing = agrcPaths.filter(p => !manifestPaths.has(p));
    expect(
      missing,
      `Ownership declares AGRC paths not present in manifest (add mount or fix ownership): ${missing.slice(0, 15).join(', ')}${missing.length > 15 ? '…' : ''}`,
    ).toEqual([]);
  });
});
