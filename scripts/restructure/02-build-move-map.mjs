#!/usr/bin/env node
/**
 * 02-build-move-map.mjs
 *
 * Gate C of the FINAL ORDER restructure.
 *
 * Reads platform/docs/migration/_reports/01-final-inventory.json and produces
 * an exact, rollback-able move map at:
 *
 *   platform/docs/migration/02-final-move-map.json
 *   platform/docs/migration/02-final-move-map.md
 *
 * Each entry contains every column required by the FINAL ORDER:
 *   - oldPath
 *   - newPath
 *   - ownerLayer
 *   - importUpdatesRequired
 *   - workspaceUpdateRequired
 *   - tsconfigUpdateRequired
 *   - routeUpdateRequired
 *   - packageNameUpdateRequired
 *   - runtimeRisk
 *   - rollbackCommand
 *   - batch (1..9 per FINAL ORDER Gate D)
 *   - notes
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = '/root/DOS-AIO/DOS Platform';
const INV  = path.join(ROOT, 'platform', 'docs', 'migration', '_reports', '01-final-inventory.json');
const OUT_JSON = path.join(ROOT, 'platform', 'docs', 'migration', '02-final-move-map.json');
const OUT_MD   = path.join(ROOT, 'platform', 'docs', 'migration', '02-final-move-map.md');

// FINAL ORDER Gate D batch numbers.
const BATCH = {
  PRODUCT_APP:           1,
  PRODUCT_FRONTEND:      2,
  MODULES:               3,
  PLATFORM_TIER:         4,
  PACKAGES:              5,
  SERVICES:              6,
  REGISTRIES_MANIFESTS:  7,
  SCRIPTS_OPS:           8,
  TESTS:                 9,
};

// Modules that already have manifest ownership pointing into a real source dir
// at root level (handled by manifest sweep), but with edge cases that need to
// be flagged so Gate D batch 3 plans correctly.
const MODULE_RENAMES = {
  'issues': 'issues', // from "Isues Module" (typo) -> modules/issues
};

// Modules nested inside other modules — must be promoted to standalone canonical.
// Example: Foundation Module/team -> modules/foundation/sub-modules/team
//          Foundation Module/team manifest is its own moduleCode "team".
const NESTED_PROMOTION_NOTE = 'NESTED-MODULE: requires manual promotion plan in Gate D';

function gitMv(oldRel, newRel) {
  // Use a heredoc-safe single-quoted form. Caller is expected to run from ROOT.
  const o = `'${oldRel.replace(/'/g, "'\\''")}'`;
  const n = `'${newRel.replace(/'/g, "'\\''")}'`;
  return `git mv ${o} ${n}`;
}
function rollbackMv(oldRel, newRel) {
  return gitMv(newRel, oldRel);
}

function entry({ oldPath, newPath, ownerLayer, batch,
                 importUpdatesRequired = false,
                 workspaceUpdateRequired = false,
                 tsconfigUpdateRequired = false,
                 routeUpdateRequired = false,
                 packageNameUpdateRequired = false,
                 runtimeRisk = 'low',
                 notes = '' }) {
  return {
    oldPath, newPath, ownerLayer, batch,
    importUpdatesRequired, workspaceUpdateRequired,
    tsconfigUpdateRequired, routeUpdateRequired,
    packageNameUpdateRequired, runtimeRisk,
    rollbackCommand: rollbackMv(oldPath, newPath),
    gitCommand: gitMv(oldPath, newPath),
    notes,
  };
}

async function main() {
  const inv = JSON.parse(await fs.readFile(INV, 'utf8'));
  const moves = [];

  // -------- Batch 1+2: Shahin-AI product app & frontend --------
  // Source of truth: Shahin-AI Website/spa is the canonical Angular app.
  moves.push(entry({
    oldPath: 'Shahin-AI Website/spa',
    newPath: 'products/shahin-ai/app',
    ownerLayer: 'product-owned:shahin-ai',
    batch: BATCH.PRODUCT_APP,
    importUpdatesRequired: true,
    workspaceUpdateRequired: true,
    tsconfigUpdateRequired: true,
    routeUpdateRequired: true,
    packageNameUpdateRequired: true,
    runtimeRisk: 'high',
    notes: 'Canonical Angular SPA. After mv, update angular.json projects.app.root, ' +
           'tsconfig refs, package name to @shahin-ai/app, and pnpm-workspace path.',
  }));
  moves.push(entry({
    oldPath: 'Shahin-AI Website/frontend',
    newPath: 'products/shahin-ai/frontend-legacy',
    ownerLayer: 'product-owned:shahin-ai',
    batch: BATCH.PRODUCT_FRONTEND,
    runtimeRisk: 'medium',
    workspaceUpdateRequired: true,
    notes: 'Legacy frontend retained as compatibility shim under product root with ' +
           'documented removal date (Gate L). DO NOT delete in this pass.',
  }));
  // Other top-level Shahin-AI Website children (composition, navigation, theme,
  // services, dynamic-ui, agents, i18n, state) collapse into products/shahin-ai/{name}.
  for (const sub of ['composition', 'navigation', 'theme', 'services',
                     'dynamic-ui', 'agents', 'i18n', 'state', 'assets',
                     'tests', 'routes']) {
    moves.push(entry({
      oldPath: `Shahin-AI Website/${sub}`,
      newPath: `products/shahin-ai/${sub}`,
      ownerLayer: 'product-owned:shahin-ai',
      batch: BATCH.PRODUCT_FRONTEND,
      importUpdatesRequired: sub === 'services' || sub === 'state',
      runtimeRisk: 'low',
      notes: `Conditional move: only if Shahin-AI Website/${sub} exists (validated at Gate D).`,
    }));
  }

  // -------- Batch 3: Modules --------
  // Promote each manifest-bearing folder into modules/{moduleCode}/.
  // Skip duplicates (a module folder providing multiple manifests gets moved
  // once; nested manifests are flagged for Gate D promotion plan).
  const seenModules = new Set();
  for (const m of inv.modules) {
    if (m.currentRoot.startsWith('DOS/')) continue; // unsafe-to-move
    if (seenModules.has(m.moduleCode)) continue;
    seenModules.add(m.moduleCode);

    const isNested = m.currentRoot.includes('/');
    const renamed  = MODULE_RENAMES[m.moduleCode] || m.moduleCode;
    moves.push(entry({
      oldPath: m.currentRoot,
      newPath: `modules/${renamed}`,
      ownerLayer: 'module-owned',
      batch: BATCH.MODULES,
      importUpdatesRequired: true,
      workspaceUpdateRequired: true,
      tsconfigUpdateRequired: true,
      packageNameUpdateRequired: true,
      runtimeRisk: isNested ? 'high' : 'medium',
      notes: isNested ? NESTED_PROMOTION_NOTE
                      : (renamed !== m.moduleCode ? 'Renamed to fix legacy folder name.' : ''),
    }));
  }

  // Special: Dynamic UI Module wasn't matched by the spaced-module regex.
  if (!seenModules.has('dynamic-ui')) {
    moves.push(entry({
      oldPath: 'Dynamic UI Module',
      newPath: 'modules/dynamic-ui',
      ownerLayer: 'module-owned',
      batch: BATCH.MODULES,
      importUpdatesRequired: true,
      workspaceUpdateRequired: true,
      tsconfigUpdateRequired: true,
      packageNameUpdateRequired: true,
      runtimeRisk: 'medium',
      notes: 'Two-word legacy folder name; promoted to canonical modules/dynamic-ui.',
    }));
  }

  // -------- Batch 4: Platform-tier folders --------
  for (const sub of ['contracts', 'docs', 'errors', 'manifests', 'migration',
                     'platform-core', 'product-shell', 'routing', 'utils']) {
    if (sub === 'manifests') continue; // moves separately to top-level manifests/
    moves.push(entry({
      oldPath: sub,
      newPath: `platform/${sub === 'platform-core' ? 'shared/platform-core'
                          : sub === 'product-shell' ? 'shared/product-shell'
                          : sub === 'utils'         ? 'shared/utils'
                          : sub}`,
      ownerLayer: 'platform-owned',
      batch: BATCH.PLATFORM_TIER,
      importUpdatesRequired: true,
      workspaceUpdateRequired: sub === 'platform-core' || sub === 'product-shell',
      tsconfigUpdateRequired: true,
      runtimeRisk: 'medium',
      notes: '',
    }));
  }

  // -------- Batch 5: Packages (embedded) --------
  for (const p of inv.embeddedPackages) {
    moves.push(entry({
      oldPath: p.relPath,
      newPath: `packages/${p.name}`,
      ownerLayer: 'shared-package',
      batch: BATCH.PACKAGES,
      workspaceUpdateRequired: true,
      tsconfigUpdateRequired: true,
      packageNameUpdateRequired: true,
      runtimeRisk: 'medium',
      notes: `Promoted from ${p.inModule}.`,
    }));
  }

  // -------- Batch 6: Services (embedded) --------
  for (const s of inv.embeddedServices) {
    moves.push(entry({
      oldPath: s.relPath,
      newPath: `services/${s.name}`,
      ownerLayer: 'runtime-service',
      batch: BATCH.SERVICES,
      workspaceUpdateRequired: true,
      packageNameUpdateRequired: true,
      runtimeRisk: 'high',
      notes: `Promoted from ${s.inModule}. Build & smoke required immediately after.`,
    }));
  }

  // -------- Batch 7: Registries / manifests are already at root --------
  // No file moves needed; only consolidation script will run inside the dir.
  // Document intent for completeness.
  moves.push(entry({
    oldPath: 'registries',
    newPath: 'registries',
    ownerLayer: 'registry',
    batch: BATCH.REGISTRIES_MANIFESTS,
    runtimeRisk: 'low',
    notes: 'No-op: already at canonical location; will consolidate nested manifests/ ' +
           'directory contents during Gate D.',
  }));
  moves.push(entry({
    oldPath: 'manifests',
    newPath: 'manifests',
    ownerLayer: 'manifest',
    batch: BATCH.REGISTRIES_MANIFESTS,
    runtimeRisk: 'low',
    notes: 'No-op: already at canonical location.',
  }));

  // -------- Batch 8 & 9: scripts/ ops/ tests/ all already at root --------
  for (const sub of ['scripts', 'ops', 'tests']) {
    moves.push(entry({
      oldPath: sub, newPath: sub,
      ownerLayer: sub === 'tests' ? 'test' : (sub === 'ops' ? 'ops' : 'platform-owned'),
      batch: sub === 'tests' ? BATCH.TESTS : BATCH.SCRIPTS_OPS,
      runtimeRisk: 'low',
      notes: 'No-op: already at canonical location.',
    }));
  }

  // -------- Quarantined (unsafe-to-move) --------
  const quarantined = [
    { path: 'DOS',           reason: 'Legacy nested DOS root with its own packages/services/modules. Plan: file-by-file inventory in Gate D pre-flight. Do NOT mass-move.' },
    { path: 'DOS-AIO-Specs', reason: 'Specs/docs (non-source).' },
  ];

  const out = {
    generatedAt: new Date().toISOString(),
    canonicalRoot: ROOT,
    batches: BATCH,
    moves,
    quarantined,
    summary: {
      totalMoves: moves.length,
      perBatch: moves.reduce((acc, m) => { acc[m.batch] = (acc[m.batch] || 0) + 1; return acc; }, {}),
    },
  };

  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 2));
  await fs.writeFile(OUT_MD, renderMd(out));

  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} (${moves.length} moves)`);
  console.log(`Wrote ${path.relative(ROOT, OUT_MD)}`);
}

function renderMd(o) {
  const L = [];
  L.push('# 02 — Final Move Map');
  L.push('');
  L.push(`> Generated: \`${o.generatedAt}\``);
  L.push(`> Canonical root: \`${o.canonicalRoot}\``);
  L.push('');
  L.push('## Batch summary');
  L.push('');
  L.push('| Batch | Description | Move count |');
  L.push('| --- | --- | --- |');
  const labels = {
    1: 'Shahin-AI product app',
    2: 'Shahin-AI product frontend (composition/nav/theme/...)',
    3: 'Canonical modules → modules/{moduleCode}',
    4: 'Platform-tier folders → platform/',
    5: 'Embedded packages → packages/',
    6: 'Embedded services → services/',
    7: 'Registries / manifests consolidation',
    8: 'Scripts / ops (no-op)',
    9: 'Tests (no-op)',
  };
  for (const [k, v] of Object.entries(o.summary.perBatch).sort((a, b) => +a[0] - +b[0])) {
    L.push(`| ${k} | ${labels[k] || ''} | ${v} |`);
  }
  L.push(`| — | **TOTAL** | **${o.summary.totalMoves}** |`);
  L.push('');
  L.push('## Quarantined (unsafe-to-move on this pass)');
  L.push('');
  for (const q of o.quarantined) L.push(`- \`${q.path}\` — ${q.reason}`);
  L.push('');
  L.push('## All moves');
  L.push('');
  L.push('| Batch | Owner | Old → New | Imports | Workspace | tsconfig | Routes | PkgName | Risk | Rollback |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const sorted = [...o.moves].sort((a, b) => a.batch - b.batch || a.oldPath.localeCompare(b.oldPath));
  for (const m of sorted) {
    L.push(`| ${m.batch} | ${m.ownerLayer} | \`${m.oldPath}\` → \`${m.newPath}\` | ${b(m.importUpdatesRequired)} | ${b(m.workspaceUpdateRequired)} | ${b(m.tsconfigUpdateRequired)} | ${b(m.routeUpdateRequired)} | ${b(m.packageNameUpdateRequired)} | ${m.runtimeRisk} | \`${m.rollbackCommand}\` |`);
  }
  L.push('');
  L.push('## Notes (per move)');
  L.push('');
  for (const m of sorted) {
    if (!m.notes) continue;
    L.push(`- **${m.oldPath} → ${m.newPath}** — ${m.notes}`);
  }
  L.push('');
  L.push('## Execution commands (per batch)');
  L.push('');
  for (const k of Object.keys(o.summary.perBatch).sort((a, b) => +a - +b)) {
    L.push(`### Batch ${k} — ${labels[k]}`);
    L.push('');
    L.push('```bash');
    for (const m of sorted.filter(x => String(x.batch) === k)) {
      L.push(m.gitCommand);
    }
    L.push('```');
    L.push('');
  }
  return L.join('\n');
}
function b(v) { return v ? '✅' : '—'; }

main().catch(err => { console.error(err); process.exit(1); });
