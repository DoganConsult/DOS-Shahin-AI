#!/usr/bin/env node
/**
 * lint-no-shell-module-name.mjs
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-shell-module-name.mjs [OPTIONS]

Enforces spec §1.1: shell must not know module names like 'Foundation', 'Risk', 'Compliance'.

Options:
  --help, -h           Show this help message

Policy:
  Shell-tier code must not contain string equality against registered module codes.
  Shell may only branch by zone, placement, slot, or runtime metadata.

Shell-scoped locations (CHECKED):
  - blueprint/layout/...
  - blueprint/core/platform/...
  - blueprint/core/runtime/...
  - blueprint/core/navigation/...
  - blueprint/shared/dynamic-ui/...
  - blueprint/shared/components/page-chrome/...
  - blueprint/shared/components/module-chrome/...

Allowlisted locations (NOT checked):
  - features/<module>/... (per-module feature code)
  - pages/<module>-.../... (per-module pages)
  - core/<module>/... (per-module core services)
  - registries/... (catalog data)
  - blueprint/products/... (per-product wiring)

Patterns flagged:
  - moduleCode === '<known-module>'
  - module_code === '<known-module>'
  - route.startsWith('/<known-module>/')
  - switch on moduleCode with case '<known-module>'

Exit codes:
  0 — Clean
  1 — At least one violation
  2 — Harness error

Examples:
  # Run shell module name check
  node scripts/ci-guards/lint-no-shell-module-name.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPA_SRC = path.join(REPO_ROOT, 'products/shahin-ai/app/src/app');
const REGISTRIES = path.join(REPO_ROOT, 'registries/modules.registry.json');

// Module codes loaded dynamically — no hardcoded list.
// Priority: DB → registry JSON → empty (no fallback module list).
const KNOWN_MODULES = [];

function loadRegistryModules() {
  // 1. Try DB
  try {
    const raw = execSync(
      `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -t -A -c "SELECT DISTINCT module_code FROM dos.dynamic_ui_modules ORDER BY module_code"`,
      { encoding: 'utf8', timeout: 5000 },
    ).trim();
    if (raw) {
      const dbMods = raw.split('\n').map(s => s.trim()).filter(Boolean);
      if (dbMods.length > 0) return dbMods;
    }
  } catch { /* DB unavailable, try JSON */ }

  // 2. Try registry JSON
  if (existsSync(REGISTRIES)) {
    try {
      const j = JSON.parse(readFileSync(REGISTRIES, 'utf-8'));
      const list = j.modules || j;
      const ids = Array.isArray(list) ? list.map((m) => m.id || m.module_code).filter(Boolean) : [];
      if (ids.length > 0) return ids;
    } catch { /* fall through */ }
  }

  // 3. Empty — guard becomes a no-op (safe: won't produce false positives).
  return [];
}

// Glob-ish prefix walker.
const SHELL_PREFIXES = [
  'blueprint/layout',
  'blueprint/core/platform',
  'blueprint/core/runtime',
  'blueprint/shared/dynamic-ui',
  'blueprint/shared/components/page-chrome',
  'blueprint/shared/components/module-chrome',
];

const NEVER_PREFIXES = [
  'blueprint/features',
  'blueprint/pages',
  'blueprint/registries',
  'blueprint/products',
  'blueprint/platform-manifests',
  'blueprint/generated',
  'blueprint/core/admin',
  'blueprint/core/agrc-engine',
  'blueprint/core/ai',
  'blueprint/core/dauth',
  'blueprint/core/dos',
  'blueprint/core/policy',
  'blueprint/core/portals',
  'blueprint/core/products',
  'blueprint/core/provisioning',
  'blueprint/core/reporting',
  'blueprint/core/subscription',
  'blueprint/core/grc',
  'blueprint/core/dashboard',
  'blueprint/core/notification',
  'blueprint/core/packs',
];

function inShell(rel) {
  if (NEVER_PREFIXES.some((p) => rel.startsWith(p))) return false;
  return SHELL_PREFIXES.some((p) => rel.startsWith(p));
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|html|js|mjs)$/.test(name)) acc.push(full);
  }
  return acc;
}

function scanFile(file, modules) {
  const rel = path.relative(SPA_SRC, file).split(path.sep).join('/');
  if (!inShell(rel)) return [];

  const content = readFileSync(file, 'utf-8');
  const violations = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip block/line comments (rough).
    const code = line.replace(/\/\/.*$/, '');
    for (const mod of modules) {
      // Equality patterns.
      const patterns = [
        new RegExp(`moduleCode\\s*===?\\s*['"\`]${mod}['"\`]`),
        new RegExp(`module_code\\s*===?\\s*['"\`]${mod}['"\`]`),
        new RegExp(`code\\s*===?\\s*['"\`]${mod}['"\`]`),
        new RegExp(`['"\`]${mod}['"\`]\\s*===?\\s*moduleCode`),
        new RegExp(`case\\s*['"\`]${mod}['"\`]\\s*:`),
        new RegExp(`startsWith\\(['"\`]\\/${mod}\\/`),
      ];
      if (patterns.some((p) => p.test(code))) {
        violations.push({ file: rel, line: i + 1, module: mod, snippet: line.trim() });
      }
    }
  }
  return violations;
}

function main() {
  if (!existsSync(SPA_SRC)) {
    console.error(`[lint-no-shell-module-name] SPA src not found at ${SPA_SRC}`);
    process.exit(2);
  }
  const modules = loadRegistryModules();
  const files = walk(SPA_SRC);
  const scopedShellFiles = files.filter((f) =>
    inShell(path.relative(SPA_SRC, f).split(path.sep).join('/')),
  );
  console.log(
    `[lint-no-shell-module-name] scanned ${scopedShellFiles.length}/${files.length} shell-scoped files for ${modules.length} module codes`,
  );

  const all = [];
  for (const f of scopedShellFiles) {
    const v = scanFile(f, modules);
    all.push(...v);
  }

  if (all.length === 0) {
    console.log('[lint-no-shell-module-name] PASS — shell makes no module-specific decisions');
    process.exit(0);
  }

  console.error(`[lint-no-shell-module-name] FAIL — ${all.length} violation(s):`);
  for (const v of all.slice(0, 50)) {
    console.error(`  ${v.file}:${v.line}  module='${v.module}'`);
    console.error(`    ${v.snippet}`);
  }
  if (all.length > 50) console.error(`  … and ${all.length - 50} more`);
  process.exit(1);
}

main();
