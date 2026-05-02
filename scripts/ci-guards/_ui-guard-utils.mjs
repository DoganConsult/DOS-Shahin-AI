/**
 * Shared helpers for the Wave-1 Platform UI OS CI guards.
 *
 * Mode: BASELINE_RATCHET
 *   - Existing violations are recorded once in a baseline file.
 *   - New violations (new files, or existing files that exceed their
 *     baseline count) hard-fail the guard.
 *   - Decreasing violations is always allowed.
 *
 * Baseline files live under scripts/ci-guards/baselines/<guard>.json
 * and store: { "files": { "<relPath>": <int> } }
 *
 * Update the baseline only via:
 *   UI_GUARD_UPDATE_BASELINE=1 node scripts/ci-guards/<guard>.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BASELINE_DIR = path.join(REPO_ROOT, 'scripts', 'ci-guards', 'baselines');

export function loadBaseline(name) {
  const file = path.join(BASELINE_DIR, `${name}.json`);
  if (!existsSync(file)) return { files: {} };
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return { files: {} }; }
}

export function saveBaseline(name, data) {
  if (!existsSync(BASELINE_DIR)) mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(path.join(BASELINE_DIR, `${name}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function* walk(root, exts) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root)) {
    const full = path.join(root, entry);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.angular' || entry === 'coverage') continue;
      yield* walk(full, exts);
    } else if (s.isFile()) {
      if (!exts || exts.some((e) => full.endsWith(e))) yield full;
    }
  }
}

export function rel(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/');
}

export function compareToBaseline(guardName, currentCounts) {
  const baseline = loadBaseline(guardName);
  const baseFiles = baseline.files || {};
  const offenders = [];
  for (const [file, count] of Object.entries(currentCounts)) {
    const baseCount = baseFiles[file] ?? 0;
    if (count > baseCount) {
      offenders.push({ file, baseCount, currentCount: count });
    }
  }
  return { offenders, baseline };
}

export function maybeUpdateBaseline(guardName, currentCounts) {
  if (process.env.UI_GUARD_UPDATE_BASELINE !== '1') return false;
  const next = { files: currentCounts };
  saveBaseline(guardName, next);
  // eslint-disable-next-line no-console
  console.log(`[ui-guard:${guardName}] baseline updated (${Object.keys(currentCounts).length} files)`);
  return true;
}

export function reportAndExit(guardName, offenders, mode) {
  if (offenders.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[ui-guard:${guardName}] OK — no new violations (mode=${mode})`);
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.error(`[ui-guard:${guardName}] FAIL — ${offenders.length} file(s) exceed baseline (mode=${mode})`);
  for (const o of offenders) {
    // eslint-disable-next-line no-console
    console.error(`  ${o.file}: ${o.baseCount} → ${o.currentCount}`);
  }
  // eslint-disable-next-line no-console
  console.error('Re-run with UI_GUARD_UPDATE_BASELINE=1 only after explicit migration.');
  process.exit(1);
}
