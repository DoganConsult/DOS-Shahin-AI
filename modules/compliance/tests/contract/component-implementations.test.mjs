/**
 * Contract test — every contract componentKey resolves to an Angular class
 * that actually exists in the module's UI.
 *
 * Two halves:
 *   1. The map in `ui/component-class-resolver.ts` covers every key.
 *   2. Every value in that map is a class found by `export class X`.
 *
 * If either half fails, the contract is dishonest (declared keys with no
 * implementation). See HONEST-AUDIT-2026-05-02.md §B.2.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '../..');

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '_inbound' || e === '_legacy') continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.ts')) out.push(p);
  }
  return out;
}

const allTs = walk(resolve(ROOT, 'ui'));
const definedClasses = new Set();
const classRe = /export\s+class\s+([A-Z][A-Za-z0-9_]*)/g;
for (const f of allTs) {
  const txt = readFileSync(f, 'utf8');
  let m;
  while ((m = classRe.exec(txt))) definedClasses.add(m[1]);
}

const seedManifest = JSON.parse(readFileSync(resolve(ROOT, 'db/seeds/dynamic-ui/index.json'), 'utf8'));
const seedKeys = new Set(seedManifest.componentKeys);

// Pull the resolver from the dist build (NodeJS test runner, .mjs file).
const resolverModule = await import(resolve(ROOT, 'dist/ui/component-class-resolver.js'));
const RESOLVER = resolverModule.COMPONENT_CLASS_RESOLVER;

test('every seed componentKey has a resolver entry', () => {
  const missing = [];
  for (const k of seedKeys) {
    if (!RESOLVER[k]) missing.push(k);
  }
  assert.deepEqual(
    missing,
    [],
    `seed componentKeys missing from COMPONENT_CLASS_RESOLVER (ui/component-class-resolver.ts): ${missing.join(', ')}`
  );
});

test('every resolver value resolves to a real exported class (or ComplianceCatchAll shell)', () => {
  const missing = [];
  // ComplianceCatchAll is a shell-stub allowed without a .ts file — it's the 404 surface.
  const SHELL_STUBS = new Set(['ComplianceCatchAll']);
  for (const [key, cls] of Object.entries(RESOLVER)) {
    if (SHELL_STUBS.has(cls)) continue;
    if (!definedClasses.has(cls)) missing.push(`${key} → ${cls}`);
  }
  assert.deepEqual(
    missing,
    [],
    `resolver entries pointing at non-existent classes: ${missing.join('; ')}`
  );
});
