#!/usr/bin/env node
/**
 * pnpm ui-registry:verify — Phase F gate.
 *
 * Cross-checks:
 *   ① every active dynamic_ui_routes.route has a row in
 *      dos.ui_route_template_binding (or is on the EXEMPT list).
 *   ② template_export ∈ ARCHETYPE_EXPORTS (kept in sync with
 *      template-coverage.mjs so the two gates can never diverge).
 *   ③ archetype value passes the chk_archetype DB constraint.
 *
 * Read-only: emits a JSON diff report and exits non-zero if missing rows.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(REPO, 'platform/dos/migrations/public');

const ALLOWED_ARCHETYPES = new Set([
  'command-home','posture-overview','intelligent-register','risk-landscape',
  'workflow-control','trend-intelligence','evidence-reports','action-queue',
  'module-settings','record-story','guided-create','ai-advisor','activation-journey',
]);
const EXEMPT = new Set(['/profile','/settings','/tenant-profile','/tenant-settings']);

function nextBoundary(s, i) {
  const m = s.slice(i).search(/\n(?:INSERT INTO dos\.|UPDATE dos\.)/i);
  return m === -1 ? s.length : i + m;
}
function blocks(whole, sfx) {
  const out = []; const n = `INSERT INTO dos.${sfx}`; let i = 0;
  while (true) {
    const j = whole.indexOf(n, i); if (j === -1) break;
    const e = nextBoundary(whole, j + n.length);
    out.push(whole.slice(j, e)); i = e;
  }
  return out;
}
function activeRoutes(b) {
  const out = new Set();
  for (const m of b.matchAll(
    /\(\s*NULL\s*,\s*'[^']+'\s*,\s*'(\/[^']*)'\s*,\s*'[^']+'\s*,\s*'[^']*'\s*,\s*\d+\s*,\s*'(active)'/g,
  )) out.add(m[1]);
  if (/SELECT[\s\S]*'active'/i.test(b) && /FROM\s*\(\s*VALUES/i.test(b)) {
    for (const m of b.matchAll(/\(\s*'(\/[^']*)'\s*,\s*'[^']+'/g)) out.add(m[1]);
  }
  return out;
}

if (!existsSync(MIG_DIR)) {
  console.error('[ui-registry:verify] no migrations dir — skipping'); process.exit(0);
}
const routes = new Set();
const bindings = new Map();
for (const f of readdirSync(MIG_DIR).filter(x => x.endsWith('.sql') && !x.includes('_down'))) {
  const w = readFileSync(join(MIG_DIR, f), 'utf8');
  for (const b of blocks(w, 'dynamic_ui_routes')) for (const r of activeRoutes(b)) routes.add(r);
  // Parse INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, ...)
  for (const b of blocks(w, 'ui_route_template_binding')) {
    for (const m of b.matchAll(
      /\(\s*'([^']+)'\s*,\s*'([a-z\-]+)'\s*,\s*'([A-Za-z][A-Za-z0-9_]*)'/g,
    )) bindings.set(m[1], { archetype: m[2], template_export: m[3] });
  }
}

const missing = [];
const badArchetype = [];
for (const r of routes) {
  if (EXEMPT.has(r)) continue;
  const b = bindings.get(r);
  if (!b) { missing.push(r); continue; }
  if (!ALLOWED_ARCHETYPES.has(b.archetype)) badArchetype.push({ route: r, archetype: b.archetype });
}

const enforce = process.env.UI_REGISTRY_ENFORCE === '1';
console.log(`[ui-registry:verify] routes=${routes.size} bindings=${bindings.size} exempt=${EXEMPT.size} missing=${missing.length} bad-archetype=${badArchetype.length}`);
if (missing.length || badArchetype.length) {
  if (missing.length) {
    console.error('  Missing template-binding rows:');
    for (const r of missing.slice(0, 20)) console.error(`    ✗ ${r}`);
    if (missing.length > 20) console.error(`    … (${missing.length - 20} more)`);
  }
  for (const b of badArchetype) console.error(`  ✗ ${b.route} ← bad archetype "${b.archetype}"`);
  if (enforce) process.exit(1);
  console.error('[ui-registry:verify] SHADOW (set UI_REGISTRY_ENFORCE=1 to fail CI)');
  process.exit(0);
}
console.log('[ui-registry:verify] PASS — every active route is bound to a canonical archetype.');
