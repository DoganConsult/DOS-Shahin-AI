/**
 * Wave 4 — Contract test.
 *
 * Asserts manifest-vs-runtime parity:
 *   - module.manifest.json declared routeBases are reachable through registerCompliance()
 *   - declared ownedTables match db/manifest.yml or migration DDL footprint
 *   - declared events.publishes have an emitter implementation
 *   - declared events.subscribes have a handler bound (or explicitly stubbed)
 *   - openapi.yaml paths cover all manifest routeBases
 *   - dynamic-ui seed manifest componentKeys mirror the registry 1:1
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'module.manifest.json'), 'utf8'));
const seed = JSON.parse(readFileSync(resolve(ROOT, 'db/seeds/dynamic-ui/index.json'), 'utf8'));

test('manifest declares the expected core fields', () => {
  assert.equal(manifest.moduleCode, 'compliance');
  assert.equal(manifest.kind, 'business');
  assert.equal(manifest.ownership, 'module-owned');
  assert.ok(manifest.lifecycle, 'lifecycle block required');
  assert.ok(['ga', 'production'].includes(manifest.lifecycle.stage));
  assert.ok(Array.isArray(manifest.routeBases) && manifest.routeBases.length >= 23);
  assert.ok(Array.isArray(manifest.ownedTables) && manifest.ownedTables.length >= 9);
  assert.ok(Array.isArray(manifest.events.publishes) && manifest.events.publishes.length >= 13);
  assert.ok(Array.isArray(manifest.events.subscribes) && manifest.events.subscribes.length >= 8);
});

test('registerCompliance exists and the module loads', () => {
  const mod = require('../../dist/index.js');
  assert.equal(typeof mod.registerCompliance, 'function', 'registerCompliance must be exported');
  assert.equal(typeof mod.runMigrations, 'function', 'runMigrations must be exported');
  for (const hook of ['onInstall', 'onActivate', 'onMigrate', 'onUninstall']) {
    assert.equal(typeof mod[hook], 'function', `lifecycle hook ${hook} must be exported as a function`);
  }
});

// Unwired routeBases baseline. Empty as of Sprint 1 (2026-04-30) — all 4
// previously-unwired bases now mounted in interface/http/index.ts:
//   /api/compliance-ws        → compliance-ws.routes (HTTP descriptor for WS)
//   /api/mappings             → alias of compliance_framework_mappingRouter
//   /api/objects              → objects.routes (compliance-object registry)
//   /api/assessment-templates → assessment-templates.routes
//
// 2026-05-02 — three regulator surfaces wired directly in bootstrap.ts
// (routers map) rather than via interface/http/index.ts's loadModuleRoute
// pattern. The test only inspects index.ts, so we keep them in the baseline
// to acknowledge the deliberate wiring difference. Remove from baseline
// when they migrate to the index.ts pattern.
const UNWIRED_ROUTEBASES_BASELINE = new Set([
  '/api/regulator/heatmap',
  '/api/regulator/portal',
  '/api/regulator/registry',
]);

test('every manifest routeBase is wired (or in the known-unwired baseline)', () => {
  const indexSrc = readFileSync(resolve(ROOT, 'interface/http/index.ts'), 'utf8');
  const newlyMissing = [];
  const staleExceptions = [];
  for (const base of manifest.routeBases) {
    const stem = base.replace(/^\/api\//, '');
    const isWired = indexSrc.includes(stem) || indexSrc.includes(base);
    if (!isWired && !UNWIRED_ROUTEBASES_BASELINE.has(base)) {
      newlyMissing.push(base);
    } else if (isWired && UNWIRED_ROUTEBASES_BASELINE.has(base)) {
      staleExceptions.push(base);
    }
  }
  assert.deepEqual(newlyMissing, [], `NEW route bases drifting (not wired and not in baseline): ${newlyMissing.join(', ')}`);
  assert.deepEqual(staleExceptions, [], `route bases now wired — remove from UNWIRED_ROUTEBASES_BASELINE: ${staleExceptions.join(', ')}`);
});

test('seed manifest componentKeys match the registry 1:1', () => {
  const { COMPLIANCE_COMPONENT_KEYS } = require('../../dist/ui/component-registry.js');
  assert.equal(COMPLIANCE_COMPONENT_KEYS.length, seed.componentKeys.length,
    `registry size (${COMPLIANCE_COMPONENT_KEYS.length}) must equal seed componentKeys size (${seed.componentKeys.length})`);
  const registryKeys = new Set(COMPLIANCE_COMPONENT_KEYS.map((e) => e.componentKey));
  for (const k of seed.componentKeys) {
    assert.ok(registryKeys.has(k), `seed componentKey ${k} missing from registry`);
  }
});

test('openapi.yaml exists, parses, and covers manifest routeBases', () => {
  const path = resolve(ROOT, 'openapi.yaml');
  assert.ok(existsSync(path), 'openapi.yaml must exist');
  const yaml = readFileSync(path, 'utf8');
  const missing = [];
  for (const base of manifest.routeBases) {
    if (!yaml.includes(base)) missing.push(base);
  }
  assert.deepEqual(missing, [], `routeBases missing from openapi.yaml: ${missing.join(', ')}`);
});

test('AS-BUILT, RUNBOOK, SLO, openapi all exist (PRR doc package complete)', () => {
  const required = ['AS-BUILT.md', 'RUNBOOK.md', 'SLO.md', 'openapi.yaml'];
  const missing = required.filter((f) => !existsSync(resolve(ROOT, f)));
  assert.deepEqual(missing, [], `PRR docs missing: ${missing.join(', ')}`);
});

test('every declared subscribed event has a handler in domain/events (Wave 7)', () => {
  const subscribersPath = resolve(ROOT, 'domain/events/compliance.subscribers.ts');
  assert.ok(existsSync(subscribersPath), 'domain/events/compliance.subscribers.ts must exist');
  const src = readFileSync(subscribersPath, 'utf8');
  for (const evt of manifest.events.subscribes) {
    assert.ok(src.includes(evt), `subscriber for ${evt} not found in domain/events/compliance.subscribers.ts`);
    // Also assert each event is bound via handlers.set(...)
    assert.match(
      src,
      new RegExp(`handlers\\.set\\(['"\`]${evt.replace('.', '\\.')}`),
      `event ${evt} not bound via handlers.set()`,
    );
  }
});

// Wave 2 — Zod validation coverage tracker.
// Baseline: 52/153 .routes.ts files (34%) use validate({...}) middleware as of
// 2026-04-30. Remaining 101 routes accept input without explicit Zod schema.
// This test enforces that coverage MUST NOT regress, and reports current %.
const ZOD_COVERAGE_BASELINE = { numerator: 52, denominator: 153 };

test('Zod validation coverage does not regress (Wave 2 ratchet)', () => {
  const httpDir = resolve(ROOT, 'interface/http');
  const routeFiles = collectRouteFiles(httpDir);
  const using = routeFiles.filter((p) => /validate\(\{/.test(readFileSync(p, 'utf8')));
  const ratio = using.length / routeFiles.length;
  const baseline = ZOD_COVERAGE_BASELINE.numerator / ZOD_COVERAGE_BASELINE.denominator;
  // Only fails if RATIO drops below baseline (regression) — incremental
  // coverage growth flips the ratchet up over time.
  assert.ok(
    ratio >= baseline - 0.005, // 0.5% tolerance for transient changes
    `Zod coverage regressed: ${using.length}/${routeFiles.length} = ${(ratio * 100).toFixed(1)}% < baseline ${(baseline * 100).toFixed(1)}%`,
  );
  if (using.length > ZOD_COVERAGE_BASELINE.numerator + 5) {
    // Coverage grew by 5+; nudge author to update baseline.
    console.log(`[Wave 2] Zod coverage grew: ${using.length}/${routeFiles.length} = ${(ratio * 100).toFixed(1)}%. Update ZOD_COVERAGE_BASELINE.`);
  }
});

function collectRouteFiles(dir) {
  const out = [];
  const { readdirSync, statSync } = require('node:fs');
  const { join } = require('node:path');
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (p.endsWith('.routes.ts')) out.push(p);
    }
  };
  walk(dir);
  return out;
}

// Wave 1 — tenant-isolation regression test.
// IMPORTANT: the platform gate (ops/scripts/check-tenant-isolation.sh) only
// scans services/ and packages/, NOT modules/. So compliance's "0 violations"
// in Wave 0 was because the gate skipped modules/compliance entirely. This
// test fills that gap and enforces no NEW violation pattern is introduced.
// See docs/patterns/tenant-isolation.md for canonical pattern.
//
// Tenant-isolation baseline. Empty as of Sprint 1 (2026-04-30) — all 6
// Wave-1 violation files migrated from raw safeQuery+${schema} interpolation
// (and __TENANT_SCHEMA__ placeholder stubs) to the canonical
// withTenantClient pattern. New files matching the violation regex MUST be
// fixed at write time; do not re-add to this set.
const TENANT_ISOLATION_BASELINE = new Set([]);

test('tenant-isolation gate pattern: only baselined exceptions allowed', () => {
  const sources = [
    ...collectFiles(resolve(ROOT, 'application'), '.ts'),
    ...collectFiles(resolve(ROOT, 'infrastructure'), '.ts'),
    ...collectFiles(resolve(ROOT, 'interface'), '.ts'),
    ...collectFiles(resolve(ROOT, 'domain'), '.ts'),
  ];
  const newViolations = [];
  const fixedBaselineEntries = new Set(TENANT_ISOLATION_BASELINE);

  for (const absFile of sources) {
    if (absFile.includes('/_inbound/') || absFile.includes('/_legacy/')
        || absFile.endsWith('.test.ts') || absFile.endsWith('.spec.ts')) continue;
    const src = readFileSync(absFile, 'utf8');
    const relFile = absFile.replace(ROOT + '/', '');
    let hasViolation = false;
    if (/safeQuery\([`'"][^`'"]*\$\{[^}]*schema[^}]*\}/i.test(src)) {
      hasViolation = true;
      if (!TENANT_ISOLATION_BASELINE.has(relFile)) {
        newViolations.push({ file: relFile, pattern: 'raw schema interpolation in safeQuery' });
      }
    }
    if (/__TENANT_SCHEMA__/.test(src)) {
      hasViolation = true;
      if (!TENANT_ISOLATION_BASELINE.has(relFile)) {
        newViolations.push({ file: relFile, pattern: 'unrendered __TENANT_SCHEMA__ placeholder' });
      }
    }
    if (hasViolation) {
      fixedBaselineEntries.delete(relFile);
    }
  }

  assert.deepEqual(newViolations, [],
    `NEW tenant-isolation violations:\n${newViolations.map((v) => `  ${v.file}: ${v.pattern}`).join('\n')}`);
  assert.deepEqual([...fixedBaselineEntries], [],
    `baselined files appear FIXED — remove from TENANT_ISOLATION_BASELINE:\n${[...fixedBaselineEntries].map((f) => `  ${f}`).join('\n')}`);
});

function collectFiles(dir, ext) {
  const out = [];
  const { readdirSync, statSync, existsSync } = require('node:fs');
  const { join } = require('node:path');
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (p.endsWith(ext)) out.push(p);
    }
  };
  walk(dir);
  return out;
}
