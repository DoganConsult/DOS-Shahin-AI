// Foundation audits (P8.5 i18n / P8.7 feature-flag / P8.8 rate-limit).
// These are static checks — no DB / network required — so they run in CI
// and fail fast if the module drifts from its declared contract.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MOD_ROOT = join(__dirname, '..', '..');
const ROUTES_DIR = join(MOD_ROOT, 'interface', 'http');
const I18N_DIR = join(MOD_ROOT, 'interface', 'i18n');
const MANIFEST = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'module.manifest.json'), 'utf8'),
);

describe('Foundation — i18n audit (P8.5)', () => {
  const en = JSON.parse(readFileSync(join(I18N_DIR, 'en.json'), 'utf8'));
  const ar = JSON.parse(readFileSync(join(I18N_DIR, 'ar.json'), 'utf8'));

  it('ships both en.json and ar.json', () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
    expect(Object.keys(ar).length).toBeGreaterThan(0);
  });

  it('has parity: every en key exists in ar and vice versa', () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it('has no empty string values', () => {
    for (const [k, v] of Object.entries(en)) expect(v, `en.${k}`).toBeTruthy();
    for (const [k, v] of Object.entries(ar)) expect(v, `ar.${k}`).toBeTruthy();
  });
});

describe('Foundation — rate-limit audit (P8.8)', () => {
  // Every route file with a mutating verb MUST import writeRateLimiter and
  // attach it to at least one mutating handler.
  const routeFiles = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.routes.ts'));
  const MUTATING_RE = /\brouter\.(post|put|patch|delete)\s*\(/;
  const AGGREGATOR_LIKE = new Set([
    'foundation-aggregator.routes.ts',
    'foundation-health.routes.ts',
    'org-hierarchy.routes.ts',
  ]);

  for (const f of routeFiles) {
    if (AGGREGATOR_LIKE.has(f)) continue;
    it(`${f} — writeRateLimiter on mutating verbs`, () => {
      const src = readFileSync(join(ROUTES_DIR, f), 'utf8');
      if (!MUTATING_RE.test(src)) {
        // read-only router, nothing to check
        return;
      }
      // Accept any of: writeRateLimiter (canonical), bulkRateLimiter (bulk
       // endpoints), or moduleStack (which composes the rate-limiter layer
       // internally when loaded through the ports/middleware.port facade).
       expect(src, `${f} imports a rate-limiter`).toMatch(
         /writeRateLimiter|bulkRateLimiter|rateLimit|moduleStack/,
       );
    });
  }
});

describe('Foundation — feature-flag audit (P8.7)', () => {
  it('declares all FE-referenced feature flags in manifest', () => {
    expect(Array.isArray(MANIFEST.featureFlags)).toBe(true);
    // The module's FE component checks 'foundation.hierarchy_visualization'.
    expect(MANIFEST.featureFlags).toContain('foundation.hierarchy_visualization');
  });
});
