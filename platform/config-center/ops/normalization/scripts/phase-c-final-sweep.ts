#!/usr/bin/env tsx
/**
 * Phase C final sweep — catches every remaining SQL file not moved by the
 * prior relocators. Targets:
 *
 *   1. SPLIT source files (marked proposed_module === 'SPLIT' in the main
 *      classification) → modules/platform-core/db/_frozen/<original-path>
 *      The runner still discovers them via discoverAllMigrations() so fresh
 *      DBs re-run them; shards skip via the supersedes-checksum header.
 *
 *   2. expected-schema.sql (EXCLUDE) → move out of ops/migrations/ to
 *      modules/platform-core/db/_frozen/ops/migrations/ — it's a regenerable
 *      snapshot but we preserve it for diff-based drift checks.
 *
 *   3. Any *.sql under services/ not yet relocated (subdir paths like
 *      src/domain/<area>/migrations/) — relocate using the main
 *      classification if present; otherwise content-classify.
 *
 *   4. Empty directories cleaned up at the end.
 *
 * Stryker-tmp sandbox paths are excluded — they are mutation-test copies,
 * not source of record.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, basename, relative } from 'path';
import { mkdirSync } from 'fs';

const REPO_ROOT = process.cwd();
const STATE_FILE = join(REPO_ROOT, '.reorg-state.json');
const CLASSIFICATION = join(REPO_ROOT, 'ops/normalization/reports/classification.json');
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');

function loadState(): any {
  if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  return { started_at: new Date().toISOString(), last_update_at: new Date().toISOString(), moved: {}, skipped: {}, errors: {} };
}
function saveState(s: any) { s.last_update_at = new Date().toISOString(); writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + '\n'); }
function sleepSync(ms: number) { const end = Date.now() + ms; while (Date.now() < end) { try { execSync('true', { stdio: 'ignore' }); } catch {} } }
function runWithLockRetry(cmd: string, max = 12) {
  let n = 0;
  while (true) {
    try { execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe' }); return; }
    catch (err: any) {
      const m = String(err?.stderr ?? err?.message ?? err);
      if (!/index\.lock|Another git process/i.test(m) || ++n >= max) throw err;
      sleepSync(1500);
    }
  }
}
function isTracked(p: string) { try { execSync(`git ls-files --error-unmatch ${JSON.stringify(p)}`, { cwd: REPO_ROOT, stdio: 'pipe' }); return true; } catch { return false; } }
function mv(from: string, to: string) {
  mkdirSync(join(REPO_ROOT, dirname(to)), { recursive: true });
  if (isTracked(from)) runWithLockRetry(`git mv ${JSON.stringify(from)} ${JSON.stringify(to)}`);
  else execSync(`mv ${JSON.stringify(from)} ${JSON.stringify(to)}`, { cwd: REPO_ROOT, stdio: 'pipe' });
}

function listSqlFiles(root: string, excludePattern?: RegExp): string[] {
  const out: string[] = [];
  const abs = join(REPO_ROOT, root);
  if (!existsSync(abs)) return out;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(REPO_ROOT, full);
      if (excludePattern && excludePattern.test(rel)) continue;
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (entry.name.endsWith('.sql')) {
        out.push(rel);
      }
    }
  };
  walk(abs);
  return out;
}

function cleanEmptyDirs(root: string): void {
  if (!existsSync(root)) return;
  try {
    for (const e of readdirSync(root)) {
      const full = join(root, e);
      try { if (statSync(full).isDirectory()) cleanEmptyDirs(full); } catch {}
    }
    const after = readdirSync(root);
    if (after.length === 0 && root !== REPO_ROOT) rmdirSync(root);
  } catch {}
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const state = loadState();
  const classification = JSON.parse(readFileSync(CLASSIFICATION, 'utf8'));
  const classifiedByFile = new Map<string, any>();
  for (const c of classification) classifiedByFile.set(c.file, c);

  let moved = 0, skipped = 0, errors = 0;

  // 1+2. Remaining files in ops/migrations/
  const opsFiles = listSqlFiles('ops/migrations');
  for (const f of opsFiles) {
    if (state.moved[f]) continue;
    const cls = classifiedByFile.get(f);
    let dest: string;
    if (cls && cls.proposed_module === 'SPLIT') {
      dest = join('modules/platform-core/db/_frozen', f);
    } else if (f.endsWith('/expected-schema.sql')) {
      dest = join('modules/platform-core/db/_frozen', f);
    } else {
      // Unexpected — skip with note
      state.skipped[f] = 'unexpected leftover in ops/migrations';
      skipped++;
      continue;
    }
    if (existsSync(join(REPO_ROOT, dest))) { state.skipped[f] = 'dest exists'; skipped++; continue; }
    if (dryRun) { console.log(`  mv  ${f}  ->  ${dest}`); moved++; continue; }
    try {
      mv(f, dest);
      state.moved[f] = { from: f, to: dest, when: new Date().toISOString() };
      moved++;
    } catch (err: any) {
      state.errors[f] = String(err?.stderr ?? err?.message ?? err);
      errors++;
    }
  }

  // 3. services/ nested migration dirs (src/domain/*/migrations/*) and any
  //    top-level service files that slipped past the main relocator.
  const excludeStryker = /\.stryker-tmp/;
  const svcFiles = listSqlFiles('services', excludeStryker).filter(f => !f.includes('/db/'));
  for (const f of svcFiles) {
    if (state.moved[f]) continue;
    const cls = classifiedByFile.get(f);
    let dest: string;
    const isDown = /_down\.sql$/.test(f);

    if (cls && cls.proposed_module === 'SPLIT') {
      dest = join('modules/platform-core/db/_frozen', f);
    } else if (cls && cls.proposed_module) {
      // Inherit scope from classifier schemas
      const scope = (cls.schemas && cls.schemas.includes('__TENANT_SCHEMA__')) ? 'tenant' : 'public';
      dest = join('modules', cls.proposed_module, 'db', scope, 'migrations', basename(f));
    } else if (isDown) {
      // _down without main classification: try forward sibling
      const forwardBase = basename(f).replace(/_down\.sql$/, '.sql');
      const forwardPath = join(dirname(f), forwardBase);
      const forwardCls = classifiedByFile.get(forwardPath);
      if (forwardCls && forwardCls.proposed_module && forwardCls.proposed_module !== 'SPLIT') {
        const scope = (forwardCls.schemas && forwardCls.schemas.includes('__TENANT_SCHEMA__')) ? 'tenant' : 'public';
        dest = join('modules', forwardCls.proposed_module, 'db', scope, 'migrations', basename(f));
      } else if (forwardCls && forwardCls.proposed_module === 'SPLIT') {
        dest = join('modules/platform-core/db/_frozen', f);
      } else {
        state.skipped[f] = 'down with no forward classification';
        skipped++;
        continue;
      }
    } else {
      // No classification — read file for content hints.
      const sql = readFileSync(join(REPO_ROOT, f), 'utf8');
      if (/SELECT\s+1\s*;?\s*$/i.test(sql.trim().split('\n').pop() || '')) {
        // Gateway-style no-op bootstrap — attribute to the service's "module" by path
        const svc = f.match(/^services\/([^/]+)\//)?.[1] ?? 'platform-core';
        // Map service names to modules: gateway/ai-gateway-service → platform-core
        const module = (svc === 'gateway' || svc === 'ai-gateway-service') ? 'platform-core' : svc.replace(/-service$/, '');
        dest = join('modules', module, 'db/public/migrations', basename(f));
      } else {
        state.skipped[f] = 'no classification and not a no-op';
        skipped++;
        continue;
      }
    }

    if (existsSync(join(REPO_ROOT, dest))) { state.skipped[f] = 'dest exists'; skipped++; continue; }
    if (dryRun) { console.log(`  mv  ${f}  ->  ${dest}`); moved++; continue; }
    try {
      mv(f, dest);
      state.moved[f] = { from: f, to: dest, when: new Date().toISOString() };
      moved++;
    } catch (err: any) {
      state.errors[f] = String(err?.stderr ?? err?.message ?? err);
      errors++;
    }
  }

  if (!dryRun) {
    saveState(state);
    cleanEmptyDirs(join(REPO_ROOT, 'ops/migrations'));
    const modulesDir = join(REPO_ROOT, 'modules');
    if (existsSync(modulesDir)) {
      for (const mod of readdirSync(modulesDir)) {
        cleanEmptyDirs(join(modulesDir, mod, 'source/backend'));
      }
    }
    // Note: services/*/migrations/ dirs with only service-local infra can remain.
  }

  console.log(`\nphase-c-final-sweep: moved=${moved} skipped=${skipped} errors=${errors}`);
  if (errors > 0) {
    for (const [f, e] of Object.entries(state.errors).slice(0, 10)) console.log(`  err: ${f}: ${e}`);
    process.exit(1);
  }
}

main();
