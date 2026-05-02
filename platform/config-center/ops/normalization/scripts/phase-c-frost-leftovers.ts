#!/usr/bin/env tsx
/**
 * Phase C sweep — relocate every remaining file under ops/migrations/ and
 * every straggler under modules/ * /source/backend/ * /migrations/ into the
 * frozen archive at modules/platform-core/db/_frozen/<original-path>.
 *
 * Contents covered:
 *   - The 11 SPLIT source files (shards already written elsewhere)
 *   - Seed migrations not in the catalog (INSERT-only, no CREATE/ALTER TABLE)
 *   - Policy / grant / role / view migrations
 *   - ops/migrations/rollback/*  (_down sibling set)
 *   - modules/ * /source/backend/ * /migrations/ stragglers
 *
 * After this runs, ops/migrations/ and the legacy modules/ * /source/backend
 * dirs are empty — the migration runner continues to discover them at their
 * new paths via discoverAllMigrations() in migration/migration-runner.ts.
 *
 * State: `.reorg-state.json` appended to (shared with phase-c-relocate.ts).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, rmdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, relative } from 'path';

const REPO_ROOT = process.cwd();
const STATE_FILE = join(REPO_ROOT, '.reorg-state.json');
const FROZEN_ROOT = join(REPO_ROOT, 'modules/platform-core/db/_frozen');

function loadState(): any {
  if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  return {
    started_at: new Date().toISOString(),
    last_update_at: new Date().toISOString(),
    moved: {},
    skipped: {},
    errors: {},
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

function isTracked(path: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch ${JSON.stringify(path)}`, { cwd: REPO_ROOT, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function listSqlFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.sql')) out.push(relative(REPO_ROOT, full));
    }
  };
  walk(root);
  return out;
}

function mvPreserveHistory(from: string, to: string): void {
  const absTo = join(REPO_ROOT, to);
  mkdirSync(dirname(absTo), { recursive: true });
  if (isTracked(from)) {
    runWithLockRetry(`git mv ${JSON.stringify(from)} ${JSON.stringify(to)}`);
  } else {
    execSync(`mv ${JSON.stringify(from)} ${JSON.stringify(to)}`, { cwd: REPO_ROOT, stdio: 'pipe' });
  }
}

function cleanEmptyDirs(root: string): void {
  if (!existsSync(root)) return;
  try {
    const entries = readdirSync(root);
    for (const e of entries) {
      const full = join(root, e);
      if (statSync(full).isDirectory()) cleanEmptyDirs(full);
    }
    const after = readdirSync(root);
    if (after.length === 0 && root !== REPO_ROOT) rmdirSync(root);
  } catch {}
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const state = loadState();

  const targets: string[] = [];
  // 1. All remaining SQL in ops/migrations/
  targets.push(...listSqlFiles(join(REPO_ROOT, 'ops/migrations')));
  // 2. All remaining SQL under legacy modules/<X>/source/backend/<X>/migrations/
  const modulesDir = join(REPO_ROOT, 'modules');
  if (existsSync(modulesDir)) {
    for (const mod of readdirSync(modulesDir)) {
      const legacy = join(modulesDir, mod, 'source/backend', mod, 'migrations');
      if (existsSync(legacy)) targets.push(...listSqlFiles(legacy));
    }
  }

  console.log(`phase-c-frost-leftovers: ${targets.length} files${dryRun ? ' [DRY-RUN]' : ''}`);
  let moved = 0, already = 0, errors = 0;

  for (const src of targets) {
    // Already moved?
    if (state.moved[src]) { already++; continue; }
    // Preserve the original relative path under _frozen/
    const dst = join('modules/platform-core/db/_frozen', src);
    if (existsSync(join(REPO_ROOT, dst))) { state.skipped[src] = 'target already exists'; already++; continue; }
    if (dryRun) {
      console.log(`  frost  ${src}  ->  ${dst}`);
      moved++;
      continue;
    }
    try {
      mvPreserveHistory(src, dst);
      state.moved[src] = { from: src, to: dst, when: new Date().toISOString() };
      moved++;
      if (moved % 25 === 0) saveState(state);
    } catch (err: any) {
      state.errors[src] = String(err?.stderr ?? err?.message ?? err);
      errors++;
    }
  }
  if (!dryRun) {
    saveState(state);
    // Clean up now-empty legacy directories.
    cleanEmptyDirs(join(REPO_ROOT, 'ops/migrations'));
    if (existsSync(modulesDir)) {
      for (const mod of readdirSync(modulesDir)) {
        cleanEmptyDirs(join(modulesDir, mod, 'source/backend'));
      }
    }
  }

  console.log(`  moved:    ${moved}`);
  console.log(`  already:  ${already}`);
  console.log(`  errors:   ${errors}`);
  if (errors > 0) process.exit(1);
}

main();
