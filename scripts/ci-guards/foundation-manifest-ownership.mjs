#!/usr/bin/env node
/**
 * Foundation Manifest Ownership Guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/foundation-manifest-ownership.mjs [OPTIONS]

Enforces foundation manifest ownership contract.

Options:
  --help, -h           Show this help message

Contract:
  Both modules/foundation/module.manifest.json and platform/foundation/module.manifest.json must:
  - Declare non-empty ownedTables
  - Have unique ownedTables / ownedReferenceTables entries
  - No overlap between ownedTables and disownedTables
  - Every contestedTables entry has declared canonical/shared owner
  - foundation_training_assignments / foundation_training_courses in disownedTables

Exit codes:
  0 — All checks passed
  1 — At least one violation

Examples:
  # Run foundation manifest ownership check
  node scripts/ci-guards/foundation-manifest-ownership.mjs
`);
  process.exit(0);
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const MANIFEST_PATHS = [
  'modules/foundation/module.manifest.json',
  'platform/foundation/module.manifest.json',
];

const REQUIRED_DISOWNED = new Set([
  'foundation_training_assignments',
  'foundation_training_courses',
]);

const failures = [];

function fail(file, msg) {
  failures.push(`[FAIL] ${file}: ${msg}`);
}

function info(msg) {
  process.stdout.write(`[foundation-manifest-ownership] ${msg}\n`);
}

function loadManifest(relPath) {
  const abs = resolve(repoRoot, relPath);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    fail(relPath, `invalid JSON: ${e.message}`);
    return null;
  }
}

function checkUnique(file, field, arr) {
  if (!Array.isArray(arr)) {
    fail(file, `field "${field}" must be an array`);
    return;
  }
  const seen = new Set();
  for (const v of arr) {
    if (seen.has(v)) fail(file, `field "${field}" has duplicate entry: "${v}"`);
    seen.add(v);
  }
}

for (const relPath of MANIFEST_PATHS) {
  info(`checking ${relPath}`);
  const m = loadManifest(relPath);
  if (m == null) {
    fail(relPath, 'manifest file not found or unreadable');
    continue;
  }

  const owned = m.ownedTables;
  const ownedRef = m.ownedReferenceTables;
  const shared = m.sharedTables;
  const disowned = m.disownedTables;
  const contested = m.contestedTables;

  // 1. ownedTables non-empty
  if (!Array.isArray(owned) || owned.length === 0) {
    fail(relPath, 'ownedTables must be a non-empty array (Phase 1A regression guard)');
  }

  // 2 + 3. uniqueness
  checkUnique(relPath, 'ownedTables', owned);
  checkUnique(relPath, 'ownedReferenceTables', ownedRef);

  // 4. no overlap owned ↔ disowned
  if (Array.isArray(owned) && Array.isArray(disowned)) {
    const ownedSet = new Set(owned);
    for (const d of disowned) {
      if (ownedSet.has(d)) {
        fail(relPath, `table "${d}" appears in BOTH ownedTables and disownedTables`);
      }
    }
  }

  // 5. contested has declared canonical/shared owner
  if (Array.isArray(contested) && contested.length > 0) {
    const sharedAll = new Set();
    if (shared && typeof shared === 'object') {
      for (const v of Object.values(shared)) {
        if (Array.isArray(v)) for (const t of v) sharedAll.add(t);
      }
    }
    for (const c of contested) {
      // A contested entry is satisfied if it appears literally in sharedTables.*
      // OR if any sharedTables entry begins with the contested name (registry alias,
      // e.g. "tenants_registry" is the canonical owner for the contested name "tenants").
      const literal = sharedAll.has(c);
      const aliased = !literal && [...sharedAll].some((t) => t.startsWith(`${c}_`));
      if (!literal && !aliased) {
        fail(
          relPath,
          `contested table "${c}" has no declared canonical/shared owner under sharedTables.* (no literal match, no <name>_* alias)`,
        );
      }
    }
  }

  // 6. training tables must remain disowned
  if (!Array.isArray(disowned)) {
    fail(relPath, 'disownedTables must be an array');
  } else {
    for (const t of REQUIRED_DISOWNED) {
      if (!disowned.includes(t)) {
        fail(
          relPath,
          `"${t}" must remain in disownedTables until Training module ownership is decided`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(failures.join('\n') + '\n');
  process.stderr.write(`\n[foundation-manifest-ownership] ${failures.length} violation(s)\n`);
  process.exit(1);
}

info('PASS — Foundation manifest ownership contract satisfied.');
process.exit(0);
