#!/usr/bin/env node
/**
 * batch-seed-module-configs.mjs
 *
 * Generates a module_config seed migration for every module that does not
 * already have one.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/batch-seed-module-configs.mjs [OPTIONS]

Generates module_config seed migrations for modules without them.

Options:
  --help, -h           Show this help message

Behavior:
  - Scans modules/ directory
  - Generates module_config seed migration for modules without one
  - Uses manifest.ownedTables[0] as primary list table
  - Idempotent: skips modules that already have seed

Examples:
  # Generate seed migrations for all modules
  node scripts/batch-seed-module-configs.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES_DIR = path.join(REPO_ROOT, 'modules');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'modules/platform-core/db/tenant/migrations');
const GEN = path.join(REPO_ROOT, 'scripts/gen-module-config-seed.mjs');

function existingSeedForModule(moduleCode) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return false;
  for (const f of fs.readdirSync(MIGRATIONS_DIR)) {
    if (!/_module_config_seed\.sql$/.test(f)) continue;
    const text = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8');
    if (text.includes(`'${moduleCode}'`)) return f;
  }
  return false;
}

function nextMigrationNumber(start) {
  const nums = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).map(f => (f.match(/^(\d{3})_/) || [])[1]).filter(Boolean).map(n => parseInt(n, 10))
    : [];
  const max = Math.max(start - 1, ...nums);
  return max + 1;
}

function inferColumns(manifest) {
  // Conservative default column set that exists on most tables
  return ['id', 'code', 'name', 'status', 'priority', 'owner', 'due_date', 'created_at', 'updated_at'];
}

function inferTable(manifest) {
  const owned = manifest?.ownedTables ?? [];
  if (owned.length === 0) return null;
  return owned[0];
}

const modules = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(n => fs.existsSync(path.join(MODULES_DIR, n, 'module.manifest.json')));

let nextNum = nextMigrationNumber(37);
const generated = [];
const skipped = [];

for (const moduleCode of modules) {
  const existing = existingSeedForModule(moduleCode);
  if (existing) { skipped.push({ moduleCode, existing }); continue; }
  const manifestPath = path.join(MODULES_DIR, moduleCode, 'module.manifest.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch { continue; }
  const table = inferTable(manifest);
  if (!table) { skipped.push({ moduleCode, reason: 'no ownedTables' }); continue; }
  const columns = inferColumns(manifest).join(',');
  const displayName = manifest.displayName || moduleCode;
  const num = String(nextNum++).padStart(3, '0');

  try {
    execSync(
      `node ${JSON.stringify(GEN)} --module ${moduleCode} --table ${table} --title ${JSON.stringify(displayName)} --columns ${columns} --migration-number ${num}`,
      { stdio: 'pipe' }
    );
    generated.push({ moduleCode, num, table });
  } catch (err) {
    skipped.push({ moduleCode, reason: `gen failed: ${err.message}` });
  }
}

console.log(`\nGenerated: ${generated.length}`);
for (const g of generated) console.log(`  ${g.num}  ${g.moduleCode} -> ${g.table}`);
console.log(`\nSkipped: ${skipped.length}`);
for (const s of skipped.slice(0, 20)) console.log(`  ${s.moduleCode}: ${s.existing ?? s.reason}`);
