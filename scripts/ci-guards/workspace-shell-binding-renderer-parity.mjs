#!/usr/bin/env node
// scripts/ci-guards/workspace-shell-binding-renderer-parity.mjs
//
// Parity gate: every component_key that the workspace-shell publisher seeds
// into `dos.workspace_shell_binding` MUST have a runtime consumer in either
//   - platform/core/platform/shell/workspace-shell-binding.service.ts
//     (typed accessor / computed signal / surfaceProp lookup), or
//   - platform/core/platform/shell/shell-host.component.ts
//     (isSurfaceAllowed gate / *TileProps pipe / template reference).
//
// Without this guard the publisher can apply N rows to the DB while the FE
// silently consumes M < N — exactly the failure mode that left Group 7
// (workspace.{selectable,clickable,expandable,ai}-tile) inert before the
// 2026-05-05 close-loop wave.
//
// Exits 0 on parity, 1 on drift (with a per-key diff report).
// Run: `node scripts/ci-guards/workspace-shell-binding-renderer-parity.mjs`
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const CONTRACT = resolve(REPO,
  'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');

// Consumer search roots: any FE shell-rendering source where a binding row
// can be claimed. Scanning is recursive through .ts files (skipping dist /
// node_modules). The guard only requires that the literal `'<component_key>'`
// appear *somewhere* in this set — claim-by-existence, not claim-by-shape.
const CONSUMER_ROOTS = [
  'platform/core/platform/shell',
  'platform/ui-system/dos-ui-system/src/shell',
  'platform/ui-system/dos-ui-system/src/page',
  'services/ui-os-service/src/routes',
];

function listTsFiles(dir) {
  const out = [];
  function walk(p) {
    let entries;
    try { entries = readdirSync(p); } catch { return; }
    for (const e of entries) {
      const full = join(p, e);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (e === 'node_modules' || e === 'dist') continue;
        walk(full);
      } else if (st.isFile() && (e.endsWith('.ts') || e.endsWith('.html'))) {
        out.push(full);
      }
    }
  }
  walk(dir);
  return out;
}

const consumerFiles = CONSUMER_ROOTS.flatMap((rel) => listTsFiles(resolve(REPO, rel)));
const corpus = consumerFiles.map((f) => readFileSync(f, 'utf8')).join('\n\u0000\n');

const json = JSON.parse(readFileSync(CONTRACT, 'utf8'));
const keys = (json.components ?? []).map((c) => c.component_key).filter(Boolean);

const missing = [];
for (const key of keys) {
  // Accept either single- or double-quoted literal of the component_key.
  if (corpus.includes(`'${key}'`) || corpus.includes(`"${key}"`)) continue;
  missing.push(key);
}

if (missing.length > 0) {
  console.error(`[binding-renderer-parity] ${missing.length} component_key(s) seeded by`);
  console.error('the publisher but with NO runtime consumer in the binding service or');
  console.error('shell host. Add a typed accessor, isSurfaceAllowed gate, or prop pipe:');
  for (const k of missing) console.error(`  ✗ ${k}`);
  console.error('');
  console.error('Roots scanned:');
  for (const r of CONSUMER_ROOTS) console.error(`  • ${r}`);
  console.error(`Files scanned: ${consumerFiles.length}`);
  process.exit(1);
}

console.log(`[binding-renderer-parity] OK — ${keys.length} component_keys all consumed across ${consumerFiles.length} files.`);
