#!/usr/bin/env tsx
/**
 * Phase C — relocate the 64 leftover files (seeds, policies, grants, rollback
 * _down siblings, and the 4 SPLIT source + their _down pairs) using the
 * leftover-classification.json produced by classify-leftovers.ts.
 *
 * Destination rules:
 *   - confidence === 'split-source' → modules/platform-core/db/_frozen/<original-path>
 *   - everything else → modules/<owner>/db/<scope>/migrations/<basename>
 *
 * Scope detection (tenant vs public):
 *   - File path contains "/tenant/"   → tenant
 *   - File path contains "/rollback/" → follow the forward sibling's scope (heuristic: treat as public unless content says __TENANT_SCHEMA__)
 *   - File content references __TENANT_SCHEMA__ or runs in per-tenant schema → tenant
 *   - else → public
 *
 * Preserves rollback/_down naming & pairs them with forward siblings.
 *
 * CLI: npx tsx ops/normalization/scripts/phase-c-relocate-leftovers.ts [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, basename, dirname } from 'path';

const REPO_ROOT = process.cwd();
const LEFTOVERS = join(REPO_ROOT, 'ops/normalization/reports/leftover-classification.json');
const STATE_FILE = join(REPO_ROOT, '.reorg-state.json');

interface Leftover {
  file: string;
  proposed_module: string;
  confidence: string;
  reason: string;
}

function loadState(): any {
  if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  return {
    started_at: new Date().toISOString(),
    last_update_at: new Date().toISOString(),
    moved: {}, skipped: {}, errors: {},
  };
}

function saveState(state: any): void {
  state.last_update_at = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { execSync('true', { stdio: 'ignore' }); } catch {} }
}

function runWithLockRetry(cmd: string, maxAttempts = 12): void {
  let attempt = 0;
  while (true) {
    try {
      execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe' });
      return;
    } catch (err: any) {
      const msg = String(err?.stderr ?? err?.message ?? err);
      const lockHeld = /index\.lock/i.test(msg) || /Another git process/i.test(msg);
      attempt++;
      if (!lockHeld || attempt >= maxAttempts) throw err;
      sleepSync(1500);
    }
  }
}

function isTracked(path: string): boolean {
  try { execSync(`git ls-files --error-unmatch ${JSON.stringify(path)}`, { cwd: REPO_ROOT, stdio: 'pipe' }); return true; }
  catch { return false; }
}

function mv(from: string, to: string): void {
  mkdirSync(join(REPO_ROOT, dirname(to)), { recursive: true });
  if (isTracked(from)) runWithLockRetry(`git mv ${JSON.stringify(from)} ${JSON.stringify(to)}`);
  else execSync(`mv ${JSON.stringify(from)} ${JSON.stringify(to)}`, { cwd: REPO_ROOT, stdio: 'pipe' });
}

function deriveScope(file: string, proposed: string): 'tenant' | 'public' {
  if (file.includes('/tenant/')) return 'tenant';
  if (file.includes('/rollback/')) return 'public';
  try {
    const sql = readFileSync(join(REPO_ROOT, file), 'utf8');
    if (sql.includes('__TENANT_SCHEMA__')) return 'tenant';
  } catch {}
  return 'public';
}

function deriveDest(leftover: Leftover): string {
  if (leftover.confidence === 'split-source') {
    // Preserve original path under _frozen so provenance + discoverability stay.
    return join('modules/platform-core/db/_frozen', leftover.file);
  }
  const scope = deriveScope(leftover.file, leftover.proposed_module);
  // Rollback/_down pairs: keep the _down naming convention, land in the same
  // migrations/ dir as the forward so the runner's resolveDownFilename() works.
  const isRollbackDir = leftover.file.includes('/rollback/');
  const base = basename(leftover.file);
  const outName = isRollbackDir ? base.replace(/\.sql$/, '_down.sql') : base;
  // If the base already ends in _down.sql, keep it; else we don't force a rename.
  const finalName = (isRollbackDir && !base.endsWith('_down.sql'))
    ? base.replace(/\.sql$/, '_down.sql')
    : base;
  return join('modules', leftover.proposed_module, 'db', scope, 'migrations', finalName);
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const leftovers: Leftover[] = JSON.parse(readFileSync(LEFTOVERS, 'utf8'));
  const state = loadState();

  let moved = 0, skipped = 0, already = 0, errors = 0;
  for (const lo of leftovers) {
    if (state.moved[lo.file]) { already++; continue; }
    const dest = deriveDest(lo);
    if (lo.file === dest) { state.skipped[lo.file] = 'already at target'; already++; continue; }
    if (!existsSync(join(REPO_ROOT, lo.file))) {
      state.skipped[lo.file] = 'source missing';
      skipped++;
      continue;
    }
    if (existsSync(join(REPO_ROOT, dest))) {
      state.skipped[lo.file] = `target exists: ${dest}`;
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`  mv  ${lo.file}  ->  ${dest}   [${lo.confidence}] ${lo.reason}`);
      moved++;
      continue;
    }
    try {
      mv(lo.file, dest);
      state.moved[lo.file] = { from: lo.file, to: dest, when: new Date().toISOString() };
      moved++;
      if (moved % 10 === 0) saveState(state);
    } catch (err: any) {
      state.errors[lo.file] = String(err?.stderr ?? err?.message ?? err);
      errors++;
    }
  }
  if (!dryRun) saveState(state);

  console.log(`\nphase-c-relocate-leftovers: ${leftovers.length} files`);
  console.log(`  moved:    ${moved}`);
  console.log(`  skipped:  ${skipped}`);
  console.log(`  already:  ${already}`);
  console.log(`  errors:   ${errors}`);
  if (errors > 0) {
    for (const [f, e] of Object.entries(state.errors).slice(0, 10)) console.log(`  err: ${f}: ${e}`);
    process.exit(1);
  }
}

main();
