#!/usr/bin/env tsx
/**
 * Phase C — relocate classified migration files into modules/{mod}/db/{scope}/migrations/
 *
 * Reads:
 *   ops/normalization/reports/classification.json  (proposed_module per file)
 *
 * For each file with confidence in {high, medium}:
 *   - choose scope: 'tenant' if file_layer or schemas indicate tenant, else 'public'
 *   - target: modules/{module}/db/{scope}/migrations/<basename>
 *   - skip if source already at target
 *   - also move the paired _down.sql sibling if present
 *   - use `git mv` to preserve history
 *
 * State: `.reorg-state.json` records each committed move so the script is
 *   resumable if interrupted (auto-sync commits every 15s).
 *
 * Files with proposed_module = 'SPLIT' are *NOT* moved — their supersession
 * is handled by moving the source to modules/platform-core/db/_frozen/
 * via a separate script (phase-c-frost-sources.ts).
 *
 * CLI:
 *   npx tsx ops/normalization/scripts/phase-c-relocate.ts [--dry-run] [--limit N]
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, basename, dirname, relative } from 'path';
import { mkdirSync } from 'fs';

const REPO_ROOT = process.cwd();
const CLASSIFICATION = join(REPO_ROOT, 'ops/normalization/reports/classification.json');
const STATE_FILE = join(REPO_ROOT, '.reorg-state.json');

interface Classification {
  file: string;
  proposed_module: string | null;
  confidence: string;
  schemas: string[];
  tables_total: number;
}

interface ReorgState {
  started_at: string;
  last_update_at: string;
  moved: Record<string, { from: string; to: string; when: string }>;
  skipped: Record<string, string>;
  errors: Record<string, string>;
}

function loadState(): ReorgState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  }
  return {
    started_at: new Date().toISOString(),
    last_update_at: new Date().toISOString(),
    moved: {},
    skipped: {},
    errors: {},
  };
}

function saveState(state: ReorgState): void {
  state.last_update_at = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function deriveScope(c: Classification): 'tenant' | 'public' {
  const s = c.schemas ?? [];
  if (s.includes('__TENANT_SCHEMA__')) return 'tenant';
  if (s.includes('dos') || s.includes('public')) return 'public';
  // Fallback by path
  if (c.file.includes('/tenant/')) return 'tenant';
  if (c.file.includes('/source/backend/')) return 'tenant'; // legacy module path
  return 'public';
}

function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  // Busy-wait is fine here — this is a CLI tool, not a server hot path,
  // and we just need to yield to the ~15s auto-sync commit cycle.
  while (Date.now() < end) {
    try { execSync('true', { stdio: 'ignore' }); } catch {}
  }
}

function runWithLockRetry(cmd: string, maxAttempts = 10): void {
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

function gitMv(from: string, to: string): void {
  runWithLockRetry(`git mv ${JSON.stringify(from)} ${JSON.stringify(to)}`);
}

function plainMv(from: string, to: string): void {
  // Fallback when the file isn't tracked by git (e.g., freshly generated shards).
  execSync(`mv ${JSON.stringify(from)} ${JSON.stringify(to)}`, { cwd: REPO_ROOT, stdio: 'pipe' });
}

function isTracked(path: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch ${JSON.stringify(path)}`, { cwd: REPO_ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function relocate(c: Classification, state: ReorgState, dryRun: boolean): 'moved' | 'skipped' | 'already-there' | 'error' {
  if (!c.proposed_module || c.proposed_module === 'SPLIT') return 'skipped';
  if (state.moved[c.file]) return 'already-there';

  const scope = deriveScope(c);
  const targetDir = join('modules', c.proposed_module, 'db', scope, 'migrations');
  const targetFile = join(targetDir, basename(c.file));
  const absTarget = join(REPO_ROOT, targetFile);

  if (c.file === targetFile) {
    state.skipped[c.file] = 'already at target';
    return 'already-there';
  }

  const absFrom = join(REPO_ROOT, c.file);
  if (!existsSync(absFrom)) {
    state.skipped[c.file] = 'source missing (already moved?)';
    return 'skipped';
  }

  if (existsSync(absTarget)) {
    state.skipped[c.file] = `target exists: ${targetFile}`;
    return 'skipped';
  }

  if (dryRun) {
    console.log(`  mv  ${c.file}  ->  ${targetFile}`);
    return 'moved';
  }

  try {
    mkdirSync(join(REPO_ROOT, targetDir), { recursive: true });
    if (isTracked(c.file)) {
      gitMv(c.file, targetFile);
    } else {
      plainMv(c.file, targetFile);
    }
    state.moved[c.file] = { from: c.file, to: targetFile, when: new Date().toISOString() };

    // Paired _down.sql sibling
    const downFile = c.file.replace(/\.sql$/, '_down.sql');
    const absDownFrom = join(REPO_ROOT, downFile);
    if (existsSync(absDownFrom)) {
      const downTarget = join(targetDir, basename(downFile));
      if (isTracked(downFile)) gitMv(downFile, downTarget);
      else plainMv(downFile, downTarget);
      state.moved[downFile] = { from: downFile, to: downTarget, when: new Date().toISOString() };
    }

    return 'moved';
  } catch (err: any) {
    state.errors[c.file] = String(err?.message ?? err);
    return 'error';
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
  const moduleIdx = args.indexOf('--module');
  const onlyModule = moduleIdx >= 0 ? args[moduleIdx + 1] : null;

  const classifications: Classification[] = JSON.parse(readFileSync(CLASSIFICATION, 'utf8'));
  const state = loadState();

  // Only relocate high/medium confidence single-owner files. SPLIT files stay.
  const eligible = classifications.filter(c =>
    c.proposed_module &&
    c.proposed_module !== 'SPLIT' &&
    (c.confidence === 'high' || c.confidence === 'medium') &&
    (!onlyModule || c.proposed_module === onlyModule)
  );

  console.log(`phase-c-relocate: ${eligible.length} eligible files` + (dryRun ? ' [DRY-RUN]' : '') + (onlyModule ? ` [module=${onlyModule}]` : ''));

  let movedCount = 0, skippedCount = 0, alreadyCount = 0, errorCount = 0, processed = 0;
  for (const c of eligible) {
    if (processed >= limit) break;
    const outcome = relocate(c, state, dryRun);
    if (outcome === 'moved') movedCount++;
    else if (outcome === 'skipped') skippedCount++;
    else if (outcome === 'already-there') alreadyCount++;
    else errorCount++;
    processed++;
    if (!dryRun && movedCount > 0 && movedCount % 25 === 0) saveState(state);
  }

  if (!dryRun) saveState(state);

  console.log(`\n  moved:    ${movedCount}`);
  console.log(`  skipped:  ${skippedCount}`);
  console.log(`  already:  ${alreadyCount}`);
  console.log(`  errors:   ${errorCount}`);
  if (!dryRun) console.log(`  state:    ${STATE_FILE}`);
  if (errorCount > 0) {
    console.log(`\nFirst 5 errors:`);
    for (const [f, e] of Object.entries(state.errors).slice(0, 5)) {
      console.log(`  ${f}: ${e}`);
    }
    process.exit(1);
  }
}

main();
