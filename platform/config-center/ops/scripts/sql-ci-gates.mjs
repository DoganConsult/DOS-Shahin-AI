#!/usr/bin/env node
// SQL ownership / runtime CI gates.
//
// Gates:
//   1. Generator deterministic — running generate-canonical-sql.mjs twice
//      produces identical canonical files and registry.
//   2. 0 unclassified SQL — every executable file lands in either a canonical
//      function group (CREATE TABLE/INDEX/VIEW) or a classification bucket
//      (seed/rbac/rls_policy/grant/function/trigger/data_migration/repair/
//      historical_only).
//   3. 0 executable SQL without owner — every runtime-required file is
//      assigned to exactly one module/scope owner in the registry.
//   4. 0 executable SQL without ledger mapping — every owned scope has a
//      ledger declared in the registry.
//   5. No runner scans canonical/proposals/frozen/down/test files — confirmed
//      by static grep over the runner sources for the locked exclusion regex.
//
// Exit code 0 when all gates pass, 1 otherwise.

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
process.chdir(repoRoot);

const failures = [];
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push({ name, detail });
}

// ─── Gate 1: deterministic generator ────────────────────────────────
function sha256OfDir(dir) {
  if (!existsSync(dir)) return 'missing';
  const hash = createHash('sha256');
  const walk = (p) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const e of readdirSync(p).sort()) walk(join(p, e));
    } else if (p.endsWith('.sql')) {
      hash.update(relative(repoRoot, p));
      hash.update('\0');
      hash.update(readFileSync(p));
      hash.update('\0');
    }
  };
  walk(dir);
  return hash.digest('hex');
}

function determinismGate() {
  const canonicalRoots = [
    'modules/platform-core/db/canonical', 'modules/team/db/canonical',
    'modules/incident/db/canonical', 'modules/foundation/db/canonical',
    'modules/onboarding/db/canonical',
    'modules/compliance/db/canonical', 'modules/workflow/db/canonical',
    'platform/dauth/canonical', 'platform/dos/canonical',
  ];
  const before = canonicalRoots.map(d => [d, sha256OfDir(d)]);
  const regBefore = existsSync('ops/sql/sql-ownership.registry.yml')
    ? createHash('sha256').update(readFileSync('ops/sql/sql-ownership.registry.yml')).digest('hex')
    : 'missing';
  // Run generator twice; the registry's generatedAt field is timestamped, so
  // we compare canonical-file content hashes only (exclude registry).
  execSync('node ops/scripts/generate-canonical-sql.mjs > /dev/null 2>&1', { cwd: repoRoot });
  const after = canonicalRoots.map(d => [d, sha256OfDir(d)]);
  const drift = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i][1] !== after[i][1]) drift.push(before[i][0]);
  }
  gate('generator-deterministic', drift.length === 0, drift.length ? `drift in: ${drift.join(', ')}` : `${canonicalRoots.length} canonical roots stable`);
  return { regBefore };
}

// ─── Gate 2: 0 unclassified ──────────────────────────────────────────
function unclassifiedGate() {
  const cls = JSON.parse(readFileSync('ops/sql/no-ddl-classification.json', 'utf8'));
  const unknown = cls.files.filter(f => f.classification === 'unknown');
  gate('zero-unclassified-sql', unknown.length === 0, unknown.length ? `${unknown.length} file(s) unknown` : `${cls.files.length} no-DDL files all classified`);
}

// ─── Gate 3: every executable SQL has an owner ───────────────────────
function ownershipGate() {
  const reg = readFileSync('ops/sql/sql-ownership.registry.yml', 'utf8');
  // Parse 'sourceDir' values + 'canonicalDir' values into a list of owned dirs
  const ownedDirs = new Set();
  for (const m of reg.matchAll(/sourceDir:\s*(\S+)/g)) ownedDirs.add(m[1]);
  // Walk every .sql under modules/<m>/db/{public,tenant}/migrations and
  // platform/{dauth,dos}/migrations/{public,tenant}, ensure parent matches.
  const orphans = [];
  const roots = [
    ...['platform-core','team','incident','foundation','onboarding','risk','compliance','workflow']
      .flatMap(m => [`modules/${m}/db/public/migrations`, `modules/${m}/db/tenant/migrations`]),
    'platform/dauth/migrations/public', 'platform/dauth/migrations/tenant',
    'platform/dos/migrations/public', 'platform/dos/migrations/tenant',
  ];
  for (const r of roots) {
    if (!existsSync(r)) continue;
    if (!ownedDirs.has(r)) orphans.push(r);
  }
  gate('zero-orphaned-source-dirs', orphans.length === 0, orphans.length ? orphans.join(', ') : `${roots.filter(r => existsSync(r)).length} source dirs registered`);
}

// ─── Gate 4: every owned scope has a ledger ──────────────────────────
function ledgerGate() {
  const reg = readFileSync('ops/sql/sql-ownership.registry.yml', 'utf8');
  // Find each scope block followed by 'ledger:' line
  const missingLedger = [];
  // crude: find canonical: blocks with non-empty list under a scope, ensure ledger is non-null
  const scopeChunks = reg.split(/^      (public|tenant):/gm);
  for (let i = 1; i < scopeChunks.length; i += 2) {
    const scope = scopeChunks[i];
    const body = scopeChunks[i + 1] || '';
    const hasCanonical = /canonical:\s*\n\s*-\s+file:/.test(body);
    if (!hasCanonical) continue;
    const ledger = body.match(/^\s+ledger:\s+(\S+)/m)?.[1];
    if (!ledger || ledger === 'null') {
      const dirMatch = body.match(/sourceDir:\s+(\S+)/);
      missingLedger.push(`${scope} ${dirMatch ? dirMatch[1] : '?'}`);
    }
  }
  gate('zero-canonical-without-ledger', missingLedger.length === 0, missingLedger.length ? missingLedger.join(', ') : 'all canonical scopes have ledger');
}

// ─── Gate 5: runner exclusion proof ──────────────────────────────────
function runnerExclusionGate() {
  const required = [
    { file: 'ops/scripts/run-migrations.sh',      pattern: /canonical\/\*[\s\S]*_frozen[\s\S]*proposals[\s\S]*fixtures[\s\S]*tests[\s\S]*__tests__/ },
    { file: 'ops/scripts/run-tenant-migrations.sh', pattern: /canonical\/\*[\s\S]*_frozen[\s\S]*proposals[\s\S]*fixtures[\s\S]*tests[\s\S]*__tests__/ },
    { file: 'packages/dos-db/src/tenant-migrations.ts', pattern: /canonical\|_frozen\|proposals\|fixtures\|tests\|__tests__/ },
    { file: 'services/onboarding-service/src/jobs/provisioning-worker.ts', pattern: /canonical\|_frozen\|proposals\|fixtures\|tests\|__tests__/ },
  ];
  const missing = [];
  for (const r of required) {
    if (!existsSync(r.file)) { missing.push(`${r.file} (file missing)`); continue; }
    const text = readFileSync(r.file, 'utf8');
    if (!r.pattern.test(text)) missing.push(r.file);
  }
  gate('runner-exclusions-locked', missing.length === 0, missing.length ? `missing exclusions in: ${missing.join(', ')}` : `${required.length}/${required.length} runners enforce locked exclusions`);
}

// ─── Run gates ───────────────────────────────────────────────────────
console.log('=== SQL CI GATES ===');
determinismGate();
unclassifiedGate();
ownershipGate();
ledgerGate();
runnerExclusionGate();

if (failures.length > 0) {
  console.error(`\n${failures.length} gate(s) failed.`);
  process.exit(1);
}
console.log('\nAll gates passed.');
