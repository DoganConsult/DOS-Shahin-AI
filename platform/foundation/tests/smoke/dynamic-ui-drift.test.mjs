// W10.D10.1 — drift gate: every page declared in foundation-contract.json must
// be resolvable through the SPA COMPONENT_MAP allowlist. Catches contract→DB→
// SPA drift in one CI run before deploy.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../');
const snapshot = resolve(repoRoot, 'contracts/generated/foundation-contract.json');
const componentMap = resolve(repoRoot, 'ui/registry/foundation-component-map.ts');

test('every contract page maps to a SPA COMPONENT_MAP entry', () => {
  const snap = JSON.parse(readFileSync(snapshot, 'utf8'));
  const mapSrc = readFileSync(componentMap, 'utf8');
  const declared = new Set();
  for (const m of mapSrc.matchAll(/'([A-Za-z0-9_]+)'\s*:\s*\(\)\s*=>/g)) declared.add(m[1]);
  const missing = [];
  for (const p of snap.contract.pages) {
    if (!declared.has(p.component)) missing.push(`${p.pageCode} -> ${p.component}`);
  }
  assert.equal(missing.length, 0, `Components missing from COMPONENT_MAP allowlist:\n  ${missing.join('\n  ')}`);
});
